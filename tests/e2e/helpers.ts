import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

async function latestLoginMail(request: APIRequestContext, email: string, skip = 0) {
  let mail: { to: string; subject: string; text: string } | undefined;
  await expect
    .poll(async () => {
      const { emails } = (await (await request.get("/api/dev/outbox")).json()) as { emails: { to: string; subject: string; text: string }[] };
      const matching = emails.filter((e) => e.to === email && e.subject.includes("login link"));
      mail = matching.length > skip ? matching[0] : undefined;
      return mail;
    })
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

export async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a login link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await followMagicLink(page, email);
  await page.waitForURL(/\/account$/);
  await expect(page.getByTestId("account-email")).toHaveText(email);
}

export async function makeSampleKit(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample app" }).click();
  await page.waitForURL(/\/kit\/[\w-]+$/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

/** Unlock → magic link → mock checkout → unlocked kit in /account. Works logged in or out. */
export async function unlockAndPay(page: Page, kitId: string, email: string) {
  await page.getByRole("button", { name: "Unlock full kit for £19" }).click();
  if (await page.getByLabel("Your email").isVisible().catch(() => false)) {
    await page.getByLabel("Your email").fill(email);
    await page.getByRole("button", { name: "Continue to checkout" }).click();
    await expect(page.getByTestId("unlock-panel")).toHaveAttribute("data-step", "sent");
    await followMagicLink(page, email);
  }
  await page.waitForURL(/\/checkout\/mock/);
  await expect(page.getByLabel("Email for your receipt and kit")).toHaveValue(email);
  await page.getByRole("button", { name: /Pay £19/ }).click();
  await page.waitForURL(new RegExp(`/account/kits/${kitId}\\?paid=1`));
}
