import "server-only";
import Stripe from "stripe";
import { deployEnv } from "./deploy-env";
import { normaliseEmail } from "./kits";
import { stripe } from "./payments";
import { store } from "./store";

/** Ship Loop is waitlist-only and nothing writes these any more; /account still honours a stored one. */
export interface ShipLoopMembership {
  product: string;
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

export const getShipLoop = (email: string) => store().get<ShipLoopMembership>(shipLoopKey(email));

export async function recordBillingCustomer(email: string, customerId: string, source: BillingCustomer["source"] = "kit"): Promise<void> {
  await store().set<BillingCustomer>(customerKey(email), { customerId, updatedAt: new Date().toISOString(), source });
}

export const getStoredBillingCustomer = (email: string) => store().get<BillingCustomer>(customerKey(email));

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
  // Idempotency key stops a login racing a Manage billing click (or a double submit) from creating two customers.
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
 * Whether /account should show Manage billing: paid kit buyers, Ship Loop subscribers, or anyone
 * whose stored customer came from a Checkout purchase. Every account has a Stripe customer
 * (see ensureStripeCustomer), so having one is not enough on its own. Mock mode has no Stripe
 * customer, but paid kit buyers still see the button and get the mock portal note.
 * Takes the membership the caller already read, so /account doesn't fetch it twice.
 */
export async function hasBillingAccess(email: string, hasPaidKit: boolean, shipLoop: ShipLoopMembership | null): Promise<boolean> {
  if (hasPaidKit || shipLoop) return true;
  const source = (await getStoredBillingCustomer(email))?.source;
  return source === "kit" || source === "shiploop";
}
