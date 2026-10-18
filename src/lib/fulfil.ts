import "server-only";
import { addContact } from "./audience";
import { launchChecklist } from "./copy";
import { assemble, generateDraft, getDraft } from "./generation";
import { kitFailedEmail, kitReadyEmail, sendEmail } from "./email";
import { assignPaidKit, type KitOwnership } from "./accounts";
import { getStoredBillingCustomer, recordBillingCustomer } from "./billing";
import { getKit, normaliseEmail, updateKit } from "./kits";
import { captureServerEvent, eventUuid } from "./analytics-server";
import { gatewayErrorType } from "./llm";
import { captureException, captureExceptionThrottled } from "./observability";
import type { ProductId } from "./products";
import type { Kit } from "./schema";
import { buildKitZip, zipFileName } from "./zip";

const STALE_GENERATION_MS = 3 * 60_000;
export const MAX_ATTEMPTS = 3;
/**
 * Waits before the 2nd and 3rd attempts. Fast failures (no credits, 5xx) run all three in under a
 * minute; slow ones (45s timeouts) may not fit one function, so the kit page's status poll resumes them.
 */
export const RETRY_BACKOFF_MS = parseBackoff(process.env.KIT_RETRY_BACKOFF_MS) ?? [10_000, 30_000];
/** after() shares the triggering route's 120s maxDuration: no wait is started that would end past this. */
const RUN_BUDGET_MS = 100_000;
/** Lets the run that scheduled a retry take it before a status poll from another instance does. */
const RETRY_GRACE_MS = 15_000;

export interface PaidOrder {
  product: ProductId;
  ref: string;
  kitId?: string;
  email?: string;
  /** Stripe customer id, when Checkout created one. */
  customerId?: string;
}

export interface RecordedPayment {
  ownership: KitOwnership;
}

/** Records a paid kit (the only thing Checkout sells). Fast and idempotent; heavy work happens in `fulfilKit`. */
export async function recordPayment(order: PaidOrder): Promise<RecordedPayment> {
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
  if (!order.email) return { ownership: "none" };
  const ownership = await assignPaidKit(order.email, order.kitId);
  await addContact(order.email, "kit");
  if (order.customerId) {
    // A guest's email isn't verified, so their purchase never replaces the customer an account already has.
    const stored = await getStoredBillingCustomer(order.email);
    if (!stored || stored.customerId === order.customerId) await recordBillingCustomer(order.email, order.customerId, "kit");
  }
  return { ownership };
}

export function needsFulfilment(kit: Kit): boolean {
  if (!kit.paid) return false;
  switch (kit.status) {
    case "paid":
      return true;
    case "generating":
      return !kit.generationStartedAt || Date.now() - Date.parse(kit.generationStartedAt) > STALE_GENERATION_MS;
    case "failed":
      return kit.attempts < MAX_ATTEMPTS && (!kit.nextAttemptAt || Date.now() >= Date.parse(kit.nextAttemptAt) + RETRY_GRACE_MS);
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

function parseBackoff(raw: string | undefined): number[] | undefined {
  const waits = raw?.trim() ? raw.split(",").map((v) => Number(v.trim())) : undefined;
  return waits?.length && waits.every((n) => Number.isFinite(n) && n >= 0) ? waits : undefined;
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
  const deadline = Date.now() + RUN_BUDGET_MS;

  while (kit.status !== "ready") {
    kit = await updateKit(id, (k) => ({ status: "generating", generationStartedAt: new Date().toISOString(), attempts: k.attempts + 1, error: undefined, nextAttemptAt: undefined }));
    try {
      const draft = await generateDraft(kit);
      const content = assemble(draft.sections);
      if (!content) throw new Error("Draft finished without every section");
      const now = new Date().toISOString();
      kit = await updateKit(id, (k) => ({
        status: "ready",
        content,
        checklist: launchChecklist(k.brief),
        generatedAt: now,
        readyAt: now,
        llm: draft.meta?.provider ?? k.llm,
        ...(k.refund_needed ? { refund_needed: false } : {}),
      }));
    } catch (error) {
      captureExceptionThrottled(`fulfil.generate:${gatewayErrorType(error instanceof Error && error.cause ? error.cause : error)}`, error, { stage: "fulfil.generate", kitId: id, attempt: kit.attempts });
      if (kit.attempts >= MAX_ATTEMPTS) {
        await giveUp(id, error);
        return;
      }
      const wait = RETRY_BACKOFF_MS[kit.attempts - 1] ?? RETRY_BACKOFF_MS.at(-1)!;
      kit = await updateKit(id, { status: "failed", error: "Generation hit a snag. We're retrying automatically.", nextAttemptAt: new Date(Date.now() + wait).toISOString() });
      // Out of time in this function: the status poll starts the next attempt once it's due.
      if (Date.now() + wait > deadline) return;
      await new Promise((resolve) => setTimeout(resolve, wait));
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

/**
 * Every automatic attempt failed. Nothing template-made is delivered: the kit is marked failed and
 * flagged for a manual delivery or refund (never issued automatically), the buyer is told once, and
 * Sentry (unthrottled: each one needs a person) and PostHog record it.
 */
async function giveUp(id: string, error: unknown): Promise<void> {
  const kit = await updateKit(id, { status: "failed", error: "We couldn't finish writing your kit.", nextAttemptAt: undefined, refund_needed: true, failedAt: new Date().toISOString() });
  const reason = error instanceof Error ? error.message.slice(0, 200) : String(error);
  captureException(error, { stage: "fulfil.final_failure", kitId: id, paymentRef: kit.paymentRef, attempts: kit.attempts, refund_needed: true });
  await captureServerEvent("kit_generation_failed", {
    distinctId: `kit_${id}`,
    uuid: eventUuid(`kit_generation_failed:${id}:${kit.failedAt}`),
    properties: { plan: "kit", kitId: id, attempts: kit.attempts, refund_needed: true, reason },
  });
  if (!kit.email || kit.failureEmailedAt) return;
  try {
    await sendEmail(await kitFailedEmail({ to: kit.email, kit }));
    await updateKit(id, { failureEmailedAt: new Date().toISOString() });
  } catch (emailError) {
    captureException(emailError, { stage: "fulfil.failureEmail", kitId: id });
  }
}
