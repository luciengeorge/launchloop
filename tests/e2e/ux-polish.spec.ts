import { expect, test } from "@playwright/test";
import { logIn, uniqueEmail } from "./helpers";

test("logged-in users are redirected away from /login and /login/check-email", async ({ page }) => {
  const email = uniqueEmail("ux-login-redirect");
  await logIn(page, email);

  await page.goto("/login");
  await page.waitForURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "My kits" })).toBeVisible();

  await page.goto("/login?next=/pricing");
  await page.waitForURL(/\/pricing$/);
  await expect(page.getByRole("heading", { name: /pricing/i })).toBeVisible();

  await page.goto("/login/check-email");
  await page.waitForURL(/\/account$/);

  // Magic-link verify must keep working (incomplete token stays on verify; no bounce to /account).
  await page.goto("/login/verify");
  await expect(page.getByRole("heading", { name: "Log in to LaunchLoop" })).toBeVisible();
  await expect(page.getByText(/incomplete|Request a new/i)).toBeVisible();
});

test("navbar never flashes the wrong auth CTA", async ({ page }) => {
  // Logged out: guest chrome resolves from the server (skeleton → Log in + CTA, never "My kits").
  await page.goto("/");
  await expect(page.getByTestId("nav-guest")).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Get my launch kit" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Log in" })).toBeVisible();
  await expect(page.getByTestId("nav-authed")).toHaveCount(0);

  const email = uniqueEmail("ux-nav");
  await logIn(page, email);

  // Logged in: watch for a flash of the guest CTA while the server auth chrome streams in.
  let sawGuestCta = false;
  await page.exposeBinding("llNoteGuestCta", () => {
    sawGuestCta = true;
  });
  await page.addInitScript(() => {
    const check = () => {
      const banner = document.querySelector("header");
      if (!banner) return;
      const text = banner.textContent ?? "";
      if (text.includes("Get my launch kit") || text.includes("Log in")) {
        (window as unknown as { llNoteGuestCta?: () => void }).llNoteGuestCta?.();
      }
    };
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    document.addEventListener("DOMContentLoaded", check);
  });

  await page.goto("/");
  await expect(page.getByTestId("nav-authed")).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "My kits" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Get my launch kit" })).toHaveCount(0);
  expect(sawGuestCta).toBe(false);
});

test("login submit shows Sending… and disables the button", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(uniqueEmail("ux-sending"));

  await page.route("**/api/auth/request", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  const clicked = page.getByRole("button", { name: "Email me a login link" }).click({ noWaitAfter: true });
  await expect(page.getByRole("button", { name: "Sending…" })).toBeDisabled();
  await clicked;
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

test("checkout CTAs show Working… while the request is in flight", async ({ page }) => {
  await page.goto("/pricing");
  await page.route("**/api/checkout", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });

  const btn = page.getByRole("button", { name: "£12 monthly" });
  await btn.click();
  await expect(page.getByRole("button", { name: "Working…" }).first()).toBeDisabled();
  await page.waitForURL(/\/checkout\/mock/);
});
