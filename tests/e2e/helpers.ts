import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

/** The first email after a cold start can take well over expect's 5s default on a CI runner. */
const LOGIN_EMAIL_TIMEOUT_MS = 30_000;

async function latestLoginMail(request: APIRequestContext, email: string, skip = 0) {
  let mail: { to: string; subject: string; text: string } | undefined;
  await expect
    .poll(
      async () => {
        const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string; text: string }[] };
        const matching = emails.filter((e) => e.to === email && e.subject.includes("login link"));
        mail = matching.length > skip ? matching[0] : undefined;
        return mail;
      },
      { message: `login email for ${email}`, timeout: LOGIN_EMAIL_TIMEOUT_MS, intervals: [250, 500, 1000] },
    )
    .toBeTruthy();
  return mail!;
}

export async function magicLinkFor(request: APIRequestContext, email: string, skip = 0): Promise<string> {
  const mail = await latestLoginMail(request, email, skip);
  return mail.text.match(/https?:\/\/\S+\/login\/verify\?token=[^\s)\]]+/)![0];
}

export async function loginCodeFor(request: APIRequestContext, email: string, skip = 0): Promise<string> {
  const mail = await latestLoginMail(request, email, skip);
  return mail.text.match(/code[^\d]*?(\d{6})\b/i)![1];
}

/** Opens the magic link and confirms. Ends wherever the link's `next` points. */
export async function followMagicLink(page: Page, email: string) {
  const link = await magicLinkFor(page.request, email);
  await page.goto(link);
}

/** Requests a login link from /login and waits until the request was accepted. */
export async function sendLoginLink(page: Page, email: string) {
  await page.goto("/login");
  // The streamed form can still sit beside its Suspense fallback just after load; typing into the fallback is lost.
  await expect(page.getByTestId("login-submit")).toHaveCount(1);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a login link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
}

export async function logIn(page: Page, email: string) {
  await sendLoginLink(page, email);
  await followMagicLink(page, email);
  await page.waitForURL(/\/account$/);
  await expect(page.getByTestId("account-email")).toHaveText(email);
}

/**
 * Sets exp_hero_headline in the fake PostHog for every home page view (each is bucketed on a fresh `hero:<uuid>`),
 * optionally answering late. `false`: the flag exists but gives no variant. `null`: no flag at all, as in
 * production until it's created, and the fixture's default.
 */
export async function setHeroHeadline(request: APIRequestContext, variant: "control" | "test" | false | null, delayMs = 0) {
  const flags = variant === null ? {} : { exp_hero_headline: variant };
  await request.post("http://127.0.0.1:3419/ph/_flags", { data: { distinctId: "hero:*", flags, delayMs } });
}

/** Opening tags of <h1> elements in a page's HTML. */
export const h1Tags = (html: string) => html.match(/<h1[\s>]/g) ?? [];

export async function makeSampleKit(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample app" }).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

/** Signed out: "Log in first" → email → magic link sent (the unlock button is enabled once the panel has hydrated). */
export async function requestUnlockLogin(page: Page, email: string, price = "£19") {
  await expect(page.getByRole("button", { name: `Unlock the full kit, ${price}` })).toBeEnabled();
  await page.getByTestId("unlock-login-first").click();
  await page.getByLabel("Your email").fill(email);
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  await expect(page.getByTestId("unlock-panel")).toHaveAttribute("data-step", "sent");
}

/** Log in first (if signed out) → magic link → mock checkout → unlocked kit in /account. Works logged in or out. */
export async function unlockAndPay(page: Page, kitId: string, email: string) {
  await expect(page.getByRole("button", { name: "Unlock the full kit, £19" })).toBeEnabled();
  if (await page.getByTestId("unlock-login-first").isVisible()) {
    await requestUnlockLogin(page, email);
    await followMagicLink(page, email);
  } else {
    await page.getByRole("button", { name: "Unlock the full kit, £19" }).click();
  }
  await page.waitForURL(/\/checkout\/mock/);
  await expect(page.getByLabel("Email for your receipt and kit")).toHaveValue(email);
  await page.getByRole("button", { name: /Pay £19/ }).click();
  await page.waitForURL(new RegExp(`/account/kits/${kitId}\\?paid=1`));
}
