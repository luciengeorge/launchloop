import "server-only";
import { Resend } from "resend";
import { deploymentUrl, env, isEmailMock } from "./env";
import { render } from "@react-email/render";
import { KitReadyEmail } from "../emails/kit-ready";
import { LOGO_CID, LOGO_PNG_BASE64 } from "../emails/logo-data";
import { MagicLinkEmail } from "../emails/magic-link";
import { ShipLoopWelcomeEmail } from "../emails/ship-loop-welcome";
import { PRODUCTS } from "./products";
import type { Kit } from "./schema";
import { store } from "./store";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Uint8Array }[];
}

export interface OutboxEntry {
  to: string;
  subject: string;
  text: string;
  attachments: { filename: string; bytes: number }[];
  sentAt: string;
}

let client: Resend | null = null;
export function resend(): Resend | null {
  if (isEmailMock()) return null;
  client ??= new Resend(env.resendApiKey);
  return client;
}

/** Sends via Resend, or records the email in a local outbox (visible at /api/dev/outbox) in mock mode. */
export async function sendEmail(email: OutgoingEmail): Promise<{ id: string; mock: boolean }> {
  const r = resend();
  if (!r) {
    const entry: OutboxEntry = {
      to: email.to,
      subject: email.subject,
      text: email.text,
      attachments: (email.attachments ?? []).map((a) => ({ filename: a.filename, bytes: a.content.byteLength })),
      sentAt: new Date().toISOString(),
    };
    const outbox = (await store().get<OutboxEntry[]>("outbox")) ?? [];
    await store().set("outbox", [entry, ...outbox].slice(0, 50));
    console.info(`[launchloop:mock-email] to=${email.to} subject="${email.subject}" attachments=${entry.attachments.length}`);
    return { id: `mock_${Date.now()}`, mock: true };
  }
  const { data, error } = await r.emails.send({
    from: env.resendFrom,
    to: email.to,
    replyTo: env.resendReplyTo,
    subject: email.subject,
    html: email.html,
    text: email.text,
    attachments: [
      ...(email.attachments ?? []).map((a) => ({ filename: a.filename, content: Buffer.from(a.content) })),
      // Inline logo referenced as cid:launchloop-logo, so it shows without remote images or a deployed URL.
      ...(email.html.includes(`cid:${LOGO_CID}`) ? [{ filename: "logo.png", content: Buffer.from(LOGO_PNG_BASE64, "base64"), contentId: LOGO_CID }] : []),
    ],
  });
  if (error || !data) throw new Error(`Resend send failed: ${error?.message ?? "unknown error"}`);
  return { id: data.id, mock: false };
}

export async function renderEmail(node: React.ReactElement): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([render(node), render(node, { plainText: true })]);
  return { html, text };
}

export async function magicLinkEmail(params: { to: string; url: string }): Promise<OutgoingEmail> {
  return { to: params.to, subject: "Your LaunchLoop login link", ...(await renderEmail(<MagicLinkEmail url={params.url} />)) };
}

export async function kitReadyEmail(params: {
  to: string;
  kit: Kit;
  zip: { filename: string; content: Uint8Array };
}): Promise<OutgoingEmail> {
  const { kit } = params;
  const c = kit.content;
  const summary = [
    { label: "Landing page copy", detail: `headline, subheadline, CTA${c ? `, ${c.landing.features.length} feature blocks` : ""}` },
    { label: "Meta tags", detail: "title and description, sized for Google" },
    { label: "Product Hunt post", detail: "tagline, description, topics, maker comment" },
    { label: "X launch thread", detail: c ? `${c.xThread.length} posts` : "5-7 posts" },
    { label: "LinkedIn post", detail: "ready to paste" },
    { label: "3 on-brand images", detail: "Open Graph, X and Product Hunt sizes" },
    { label: "Launch-day checklist", detail: `${kit.checklist?.length ?? 10} steps` },
  ];
  const rendered = await renderEmail(
    <KitReadyEmail
      productName={kit.brief.name}
      accountUrl={`${deploymentUrl()}/account/kits/${kit.id}`}
      priceLabel={PRODUCTS.kit.priceLabel}
      receiptRef={kit.paymentRef}
      zipFilename={params.zip.filename}
      summary={summary}
    />,
  );
  return { to: params.to, subject: `Payment received: your ${kit.brief.name} launch kit is ready`, ...rendered, attachments: [params.zip] };
}

export async function preorderEmail(params: { to: string; planLabel: string }): Promise<OutgoingEmail> {
  return {
    to: params.to,
    subject: "You're in: Ship Loop pre-order confirmed",
    ...(await renderEmail(<ShipLoopWelcomeEmail planLabel={params.planLabel} shipLoopUrl={`${deploymentUrl()}/ship-loop`} accountUrl={`${deploymentUrl()}/account`} />)),
  };
}
