import "server-only";
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

const key = (email: string) => `user:${normaliseEmail(email)}:shiploop`;

export async function recordShipLoop(email: string, m: ShipLoopMembership): Promise<void> {
  const existing = await store().get<ShipLoopMembership>(key(email));
  await store().set(key(email), { ...existing, ...m, customerId: m.customerId ?? existing?.customerId });
}

export const getShipLoop = (email: string) => store().get<ShipLoopMembership>(key(email));

/** Stripe customer for billing: the one saved at checkout, else looked up by email. */
export async function getBillingCustomer(email: string): Promise<string | null> {
  const membership = await getShipLoop(email);
  if (membership?.customerId) return membership.customerId;
  const s = stripe();
  if (!s) return null;
  const { data } = await s.customers.list({ email: normaliseEmail(email), limit: 1 });
  return data[0]?.id ?? null;
}
