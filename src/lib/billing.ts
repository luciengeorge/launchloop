import "server-only";
import Stripe from "stripe";
import { deployEnv } from "./deploy-env";
import { normaliseEmail } from "./kits";
import { stripe } from "./payments";
import type { ProductId } from "./products";
import { store } from "./store";

export interface ShipLoopMembership {
  product: ProductId;
  ref: string;
  customerId?: string;
  since: string;
}

/** Stripe customer linked to an email (kit purchase or Ship Loop). */
export interface BillingCustomer {
  customerId: string;
  updatedAt: string;
  source?: "kit" | "shiploop" | "lookup" | "account";
}

const shipLoopKey = (email: string) => `user:${normaliseEmail(email)}:shiploop`;
const customerKey = (email: string) => `user:${normaliseEmail(email)}:customer`;

export async function recordShipLoop(email: string, m: ShipLoopMembership): Promise<void> {
  const existing = await store().get<ShipLoopMembership>(shipLoopKey(email));
  await store().set(shipLoopKey(email), { ...existing, ...m, customerId: m.customerId ?? existing?.customerId });
  if (m.customerId) await recordBillingCustomer(email, m.customerId, "shiploop");
}

export const getShipLoop = (email: string) => store().get<ShipLoopMembership>(shipLoopKey(email));

export async function recordBillingCustomer(email: string, customerId: string, source: BillingCustomer["source"] = "kit"): Promise<void> {
  await store().set<BillingCustomer>(customerKey(email), { customerId, updatedAt: new Date().toISOString(), source });
}

export const getStoredBillingCustomer = (email: string) => store().get<BillingCustomer>(customerKey(email));

/** Stripe customer for billing: saved at checkout, Ship Loop membership, else looked up by email. */
export async function getBillingCustomer(email: string): Promise<string | null> {
  const stored = await getStoredBillingCustomer(email);
  if (stored?.customerId) return stored.customerId;
  const membership = await getShipLoop(email);
  if (membership?.customerId) return membership.customerId;
  const s = stripe();
  if (!s) return null;
  const { data } = await s.customers.list({ email: normaliseEmail(email), limit: 1 });
  return data[0]?.id ?? null;
}

/**
 * Stripe customer for a signed-in account, creating one when needed so every account has one.
 * A stored id is only reused if it still exists in the current Stripe account (ids saved before
 * switching accounts don't). Otherwise reuses a Stripe customer with this email, else creates one,
 * and saves the mapping on the user.
 */
export async function ensureStripeCustomer(email: string): Promise<string> {
  const s = stripe();
  if (!s) throw new Error("Stripe is not configured");
  const address = normaliseEmail(email);
  const stored = await getStoredBillingCustomer(address);
  if (stored?.customerId && (await customerExists(s, stored.customerId))) return stored.customerId;
  const membership = await getShipLoop(address);
  if (membership?.customerId && membership.customerId !== stored?.customerId && (await customerExists(s, membership.customerId))) {
    await recordBillingCustomer(address, membership.customerId, "shiploop");
    return membership.customerId;
  }
  const { data } = await s.customers.list({ email: address, limit: 1 });
  if (data[0]) {
    await recordBillingCustomer(address, data[0].id, "lookup");
    return data[0].id;
  }
  // Idempotency key stops a double-submitted Manage billing from creating two customers.
  const created = await s.customers.create({ email: address, metadata: { env: deployEnv() } }, { idempotencyKey: `customer:${deployEnv()}:${address}` });
  await recordBillingCustomer(address, created.id, "account");
  return created.id;
}

async function customerExists(s: Stripe, id: string): Promise<boolean> {
  try {
    return !(await s.customers.retrieve(id)).deleted;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") return false;
    throw error;
  }
}

/**
 * Whether /account should show Manage billing.
 * True for Ship Loop subscribers, anyone with a stored Stripe customer, or anyone with a paid kit
 * (mock mode has no Stripe customer, but paid kit buyers still see the button → mock portal note).
 */
export async function hasBillingAccess(email: string, hasPaidKit: boolean): Promise<boolean> {
  if (hasPaidKit) return true;
  if (await getShipLoop(email)) return true;
  if (await getStoredBillingCustomer(email)) return true;
  return !!(await getBillingCustomer(email));
}
