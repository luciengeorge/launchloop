import "server-only";
import { Resend } from "resend";
import { env, isEmailMock, siteUrl } from "./env";
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
    attachments: email.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content) })),
  });
  if (error || !data) throw new Error(`Resend send failed: ${error?.message ?? "unknown error"}`);
  return { id: data.id, mock: false };
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, paragraphs: string[], cta?: { href: string; label: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.6">${escape(p)}</p>`).join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${cta.href}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escape(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111;background:#f6f6f7;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
<h1 style="font-size:22px;margin:0 0 16px">${escape(title)}</h1>${body}${button}
<p style="margin:24px 0 0;font-size:13px;color:#666">LaunchLoop · Paste your repo. Get your whole launch.</p>
</div></body></html>`;
}

export function kitReadyEmail(params: { to: string; productName: string; kitUrl: string; zip: { filename: string; content: Uint8Array } }): OutgoingEmail {
  const paragraphs = [
    `Your launch kit for ${params.productName} is ready. The ZIP attached has your landing page copy, Product Hunt post, X thread, LinkedIn post, three social images and a launch-day checklist.`,
    "You can also copy everything from your kit page at any time. Bookmark the link below; it's your private access link.",
    "Not happy with it? Reply within 14 days and we'll refund you.",
  ];
  return {
    to: params.to,
    subject: `Your ${params.productName} launch kit is ready`,
    html: layout(`Your ${params.productName} launch kit`, paragraphs, { href: params.kitUrl, label: "Open your kit" }),
    text: `${paragraphs.join("\n\n")}\n\nOpen your kit: ${params.kitUrl}`,
    attachments: [params.zip],
  };
}

export function preorderEmail(params: { to: string; planLabel: string }): OutgoingEmail {
  const paragraphs = [
    `Thanks for pre-ordering Ship Loop (${params.planLabel}). You're on the founding list.`,
    "Ship Loop watches your repo and drafts new posts and an on-brand image every time you release. We'll email you as soon as it's ready to connect.",
    "Your pre-order is fully refundable until launch. Just reply to this email.",
  ];
  return {
    to: params.to,
    subject: "You're in: Ship Loop pre-order confirmed",
    html: layout("Ship Loop pre-order confirmed", paragraphs, { href: `${siteUrl()}/ship-loop`, label: "See what's coming" }),
    text: paragraphs.join("\n\n"),
  };
}
