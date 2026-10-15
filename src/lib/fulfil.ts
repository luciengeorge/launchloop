import "server-only";
import { addContact } from "./audience";
import { launchChecklist } from "./copy";
import { assemble, generateDraft, getDraft } from "./generation";
import { kitReadyEmail, preorderEmail, sendEmail } from "./email";
import { recordBillingCustomer, recordShipLoop } from "./billing";
import { getKit, linkKitToUser, normaliseEmail, updateKit } from "./kits";
import { captureException } from "./observability";
import { PRODUCTS, type ProductId } from "./products";
import type { Kit } from "./schema";
import { store } from "./store";
import { buildKitZip, zipFileName } from "./zip";

const STALE_GENERATION_MS = 3 * 60_000;
export const MAX_ATTEMPTS = 3;

export interface PaidOrder {
  product: ProductId;
  ref: string;
  kitId?: string;
  email?: string;
  /** Stripe customer id, when Checkout created one. */
  customerId?: string;
}

export interface Preorder {
  ref: string;
  email: string;
  product: ProductId;
  createdAt: string;
}

/** Records a successful payment. Fast and idempotent; heavy work happens in `fulfilKit`. */
export async function recordPayment(order: PaidOrder): Promise<void> {
  if (order.product === "kit") {
    if (!order.kitId) throw new Error(`Kit payment ${order.ref} has no kitId`);
    // If the speculative draft is done, unlock in the same write so the kit is visible on the redirect.
    const ready = assemble((await getDraft(order.kitId)).sections);
    await updateKit(order.kitId, (kit) =>
      kit.paid
        ? { email: kit.email ?? order.email, ownerEmail: kit.ownerEmail ?? (order.email ? normaliseEmail(order.email) : undefined) }
        : {
            paid: true,
            status: "paid",
            email: order.email,
            ownerEmail: kit.ownerEmail ?? (order.email ? normaliseEmail(order.email) : undefined),
            paymentRef: order.ref,
            paidAt: new Date().toISOString(),
            ...(ready
              ? { status: "ready" as const, content: ready, checklist: launchChecklist(kit.brief), generatedAt: new Date().toISOString(), readyAt: new Date().toISOString() }
              : {}),
          },
    );
    if (order.email) {
      await linkKitToUser(order.email, order.kitId);
      await addContact(order.email, "kit");
      if (order.customerId) await recordBillingCustomer(order.email, order.customerId, "kit");
    }
    return;
  }

  const key = `preorder:${order.ref}`;
  if (!order.email) throw new Error(`Pre-order ${order.ref} has no email`);
  await recordShipLoop(order.email, { product: order.product, ref: order.ref, customerId: order.customerId, since: new Date().toISOString() });
  if (await store().get<Preorder>(key)) return;
  await store().set<Preorder>(key, { ref: order.ref, email: order.email, product: order.product, createdAt: new Date().toISOString() });
  await addContact(order.email, "preorder", { plan: order.product });
  try {
    await sendEmail(await preorderEmail({ to: order.email, planLabel: PRODUCTS[order.product].priceLabel }));
  } catch (error) {
    captureException(error, { stage: "fulfil.preorderEmail", ref: order.ref });
  }
}

export function needsFulfilment(kit: Kit): boolean {
  if (!kit.paid) return false;
  switch (kit.status) {
    case "paid":
      return true;
    case "generating":
      return !kit.generationStartedAt || Date.now() - Date.parse(kit.generationStartedAt) > STALE_GENERATION_MS;
    case "failed":
      return kit.attempts < MAX_ATTEMPTS;
    case "ready":
      return !!kit.email && !kit.emailedAt;
    case "preview":
      return false;
    default: {
      const exhaustive: never = kit.status;
      return exhaustive;
    }
  }
}

const inFlight = new Map<string, Promise<void>>();

/** Generates the full kit and emails it. Safe to call repeatedly from the webhook, return URL and status poll. */
export function fulfilKit(id: string): Promise<void> {
  const running = inFlight.get(id);
  if (running) return running;
  const job = runFulfilment(id).finally(() => inFlight.delete(id));
  inFlight.set(id, job);
  return job;
}

async function runFulfilment(id: string): Promise<void> {
  let kit = await getKit(id);
  if (!kit || !needsFulfilment(kit)) return;

  if (kit.status !== "ready") {
    kit = await updateKit(id, (k) => ({ status: "generating", generationStartedAt: new Date().toISOString(), attempts: k.attempts + 1, error: undefined }));
    try {
      const draft = await generateDraft(kit);
      const content = assemble(draft.sections);
      if (!content) throw new Error("Draft finished without every section");
      const now = new Date().toISOString();
      kit = await updateKit(id, { status: "ready", content, checklist: launchChecklist(kit.brief), generatedAt: now, readyAt: now, llm: draft.meta?.provider ?? kit.llm });
    } catch (error) {
      captureException(error, { stage: "fulfil.generate", kitId: id });
      await updateKit(id, (k) => ({ status: "failed", error: k.attempts >= MAX_ATTEMPTS ? "We couldn't finish writing your kit." : "Generation hit a snag. We're retrying automatically." }));
      return;
    }
  }

  if (kit.email && !kit.emailedAt) {
    try {
      const zip = await buildKitZip(kit);
      await sendEmail(await kitReadyEmail({ to: kit.email, kit, zip: { filename: zipFileName(kit), content: zip } }));
      await updateKit(id, { emailedAt: new Date().toISOString() });
    } catch (error) {
      captureException(error, { stage: "fulfil.email", kitId: id });
    }
  }
}
