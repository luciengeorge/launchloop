import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { generateListingCopy, listingLimits, type ListingCopy } from "./copy";
import { allDirectories } from "./directories";
import { directoryPackReadyEmail, sendEmail } from "./email";
import type { PaidOrder } from "./fulfil";
import { isValidKitId } from "./kit-exists";
import { captureException } from "./observability";
import type { Brief, PaidAmount } from "./schema";
import { store } from "./store";

/**
 * A paid Directory Launch Pack. Stored only once Checkout says it's paid, so a stored pack is an unlock: its unguessable
 * id (made at checkout, like a kit id) is the buyer's private link. Kept until the buyer asks us to delete it, like a paid kit.
 */
export interface DirectoryPack {
  id: string;
  email?: string;
  paymentRef: string;
  paidAmount?: PaidAmount;
  paidAt: string;
  emailedAt?: string;
  product?: ListingProduct;
  /** Listing copy per pair of limits (see listingFor). */
  listings?: Record<string, ListingCopy>;
}

export const listingProductSchema = z.object({
  name: z.string().trim().min(1, "Add your product's name.").max(60, "Keep the name under 60 characters."),
  url: z.url({ protocol: /^https?$/, error: "Enter your product's full URL, starting with https://." }).max(300),
  oneLiner: z.string().trim().min(10, "Say what it does in a sentence.").max(300, "Keep it to one sentence, under 300 characters."),
  audience: z.string().trim().max(200).default(""),
  features: z
    .string()
    .max(1000)
    .default("")
    .transform((text) => text.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 6)),
});
export type ListingProduct = z.output<typeof listingProductSchema>;

const packKey = (id: string) => `dirpack:${id}`;
export const newPackId = () => randomBytes(16).toString("base64url");
export const packPath = (id: string) => `/directory-pack/access/${id}`;

/** The pack APIs' 403 for any id that isn't a paid pack. */
export const PACK_LOCKED = { error: "This link isn't a paid Directory Launch Pack." };

/** The pack, only if it's been paid for. */
export async function getPack(id: string): Promise<DirectoryPack | null> {
  return isValidKitId(id) ? store().get<DirectoryPack>(packKey(id)) : null;
}

/** Idempotent: a redelivered webhook or the Checkout return keep the first payment and only fill in a missing email. */
export async function recordPackPayment(order: PaidOrder): Promise<void> {
  if (!order.packId || !isValidKitId(order.packId)) throw new Error(`Directory pack payment ${order.ref} has no valid packId`);
  const existing = await getPack(order.packId);
  const pack: DirectoryPack = existing
    ? { ...existing, email: existing.email ?? order.email }
    : { id: order.packId, email: order.email, paymentRef: order.ref, paidAmount: order.paidAmount, paidAt: new Date().toISOString() };
  await store().set(packKey(pack.id), pack);
}

/** Emails the buyer their private link, once. */
export async function fulfilPack(id: string): Promise<void> {
  const pack = await getPack(id);
  if (!pack?.email || pack.emailedAt) return;
  try {
    await sendEmail(await directoryPackReadyEmail({ to: pack.email, pack }));
    await store().set(packKey(id), { ...pack, emailedAt: new Date().toISOString() });
  } catch (error) {
    captureException(error, { stage: "directoryPack.email", packId: id });
  }
}

const briefFor = (p: ListingProduct): Brief => ({ name: p.name, oneLiner: p.oneLiner, audience: p.audience, problem: "", features: p.features, proofPoints: [], stack: [], tone: "plain", url: p.url });

/** The kit's copy generator, run once over every directory's limits. */
export async function writeListings(pack: DirectoryPack, product: ListingProduct): Promise<DirectoryPack> {
  const { listings } = await generateListingCopy(briefFor(product), (await allDirectories()).map(listingLimits));
  const next = { ...pack, product, listings };
  await store().set(packKey(pack.id), next);
  return next;
}
