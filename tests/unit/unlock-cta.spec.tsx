import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { UnlockCheckoutProvider } from "@/components/kit/unlock-checkout";
import { StickyUnlockBar, UnlockCta, UnlockCtaPlaceholder } from "@/components/kit/unlock-cta";
import { CheckoutError } from "@/components/kit/unlock-error";
import { UnlockPanel } from "@/components/kit/unlock-panel";
import type { Served } from "@/lib/experiments";
import type { CheckoutFailureCode } from "@/lib/unlock-checkout";
import { contrast, rootToken } from "./contrast";

const KIT = { kitId: "kit_0123456789abcdef", priceLabel: "£19" };
const control: Served = { variant: "control", fallback: "unassigned" };
/** Text with a space wherever a tag was. */
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const buttons = (html: string) => html.match(/<button[^>]*>.*?<\/button>/g) ?? [];
const firstButton = (html: string) => buttons(html)[0] ?? "";

const panelHtml = (earlyCta: boolean) =>
  renderToStaticMarkup(
    <UnlockCheckoutProvider earlyCta={{ enabled: earlyCta }} autoCheckout={false}>
      <UnlockPanel {...KIT} launchPromo={control} autoCheckout={false} cancelled={false} saved={false} />
    </UnlockCheckoutProvider>,
  );

test("early CTA: the price and the same £19 unlock button as the panel, in the server HTML, in the shared orange", () => {
  const html = renderToStaticMarkup(<UnlockCta {...KIT} launchPromo={control} />);
  expect(text(html)).toContain("£19 once, no subscription");
  const button = firstButton(html);
  expect(text(button)).toContain("Unlock the full kit, £19");
  expect(button).toContain("bg-primary ");
  expect(button).not.toContain(' disabled=""');
  expect(html).not.toContain("£14");
  expect(html).not.toContain("LAUNCH14");
  expect(html).not.toMatch(/—|–/);
});

test("early CTA: the LAUNCH14 arm (if ever served again) shows the price the panel shows", () => {
  const html = renderToStaticMarkup(<UnlockCta {...KIT} launchPromo={{ variant: "treatment" }} />);
  expect(text(html)).toContain("Was £19 now £14 once, no subscription");
  expect(text(html)).toContain("Unlock the full kit, £14");
});

test("early CTA placeholder: no price yet, disabled, and the same box and button width as the real one", () => {
  const placeholder = renderToStaticMarkup(<UnlockCtaPlaceholder />);
  const real = renderToStaticMarkup(<UnlockCta {...KIT} launchPromo={control} />);
  expect(placeholder).toContain("Loading price");
  expect(firstButton(placeholder)).toContain(' disabled=""');
  const classes = (html: string) => [html.match(/^<div class="([^"]+)"/)?.[1], firstButton(html).match(/class="([^"]+)"/)?.[1]];
  expect(classes(placeholder)).toEqual(classes(real));
});

test("sticky bar: hidden (and out of the tab order) until the browser decides, never on lg and up", () => {
  const html = renderToStaticMarkup(<StickyUnlockBar {...KIT} launchPromo={control} />);
  expect(html).toContain('data-visible="false"');
  const bar = html.match(/^<aside[^>]*>/)![0];
  expect(bar).toContain("invisible");
  expect(bar).toContain("translate-y-full");
  expect(bar).toContain("lg:hidden");
  expect(bar).toContain("fixed");
  expect(text(html)).toContain("Unlock the full kit, £19");
});

test("the panel's button has the same classes in both arms, and the same colours as the early CTA's", () => {
  const classes = (button: string) => button.match(/class="([^"]+)"/)![1];
  const off = buttons(panelHtml(false)).find((b) => b.includes("Unlock the full kit"))!;
  const on = buttons(panelHtml(true)).find((b) => b.includes("Unlock the full kit"))!;
  expect(classes(on)).toBe(classes(off));
  expect(off).toContain("bg-primary ");
  const colours = (button: string) => classes(button).split(" ").filter((c) => /^(hover:)?(bg|text)-(primary|cta)/.test(c));
  const early = firstButton(renderToStaticMarkup(<UnlockCta {...KIT} launchPromo={control} />));
  expect(colours(off)).toEqual(["bg-primary", "text-primary-foreground", "hover:bg-primary-hover"]);
  expect(colours(early)).toEqual(colours(off));
});

test("the panel rendered on its own (no provider) still works as before", () => {
  const html = renderToStaticMarkup(<UnlockPanel {...KIT} launchPromo={control} autoCheckout={false} cancelled={false} saved={false} />);
  expect(text(html)).toContain("Unlock the full kit, £19");
});

test("every checkout error is an alert with an action: Try again, the save link signed out, a new preview when the kit is gone", () => {
  const codes: CheckoutFailureCode[] = ["network", "rate_limited", "kit_missing", "checkout_unavailable", "server", "unknown"];
  for (const code of codes) {
    for (const isLoggedIn of [true, false]) {
      const html = renderToStaticMarkup(<CheckoutError failure={{ code, message: "Couldn't start checkout. Please try again." }} isLoggedIn={isLoggedIn} onRetry={() => {}} />);
      expect(html).toMatch(/^<div role="alert"/);
      const actions = html.match(/<(button|a)\b[^>]*>.*?<\/\1>/g) ?? [];
      expect(actions.length, `${code} ${isLoggedIn}`).toBeGreaterThan(0);
      const labels = actions.map(text).map((l) => l.trim());
      expect(labels.includes("Try again")).toBe(code !== "kit_missing");
      expect(labels.includes("Email me a link instead")).toBe(code !== "kit_missing" && !isLoggedIn);
      if (code === "kit_missing") expect(html).toMatch(/<a [^>]*href="\/#start"[^>]*>Make a new preview<\/a>/);
      expect(labels.includes("Email us for a payment link")).toBe(code === "checkout_unavailable");
      if (code === "checkout_unavailable") expect(html).toContain('href="mailto:hello@launchloop.dev?subject=Payment%20link%20for%20my%20launch%20kit"');
    }
  }
});

test("the error's link actions are outlined like its buttons: border-border, not the base's border-transparent", () => {
  for (const code of ["kit_missing", "checkout_unavailable"] as const) {
    const html = renderToStaticMarkup(<CheckoutError failure={{ code, message: "Checkout is offline." }} isLoggedIn onRetry={() => {}} />);
    const links = html.match(/<a [^>]*>/g) ?? [];
    expect(links.length, code).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toContain("border-border");
      expect(link).not.toContain("border-transparent");
    }
  }
});

test("the unlock buttons' orange meets 4.5:1 for its label, at rest and on hover", () => {
  expect(contrast(rootToken("primary"), rootToken("primary-foreground"))).toBeGreaterThanOrEqual(4.5);
  expect(contrast(rootToken("primary-hover"), rootToken("primary-foreground"))).toBeGreaterThanOrEqual(4.5);
});
