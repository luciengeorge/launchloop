import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { UnlockCheckoutProvider } from "@/components/kit/unlock-checkout";
import { StickyUnlockBar, UnlockCta, UnlockCtaPlaceholder } from "@/components/kit/unlock-cta";
import { CheckoutError } from "@/components/kit/unlock-error";
import { UnlockPanel } from "@/components/kit/unlock-panel";
import type { Served } from "@/lib/experiments";
import type { CheckoutFailureCode } from "@/lib/unlock-checkout";

const KIT = { kitId: "kit_0123456789abcdef", priceLabel: "£19" };
const control: Served = { variant: "control", fallback: "unassigned" };
/** Text with a space wherever a tag was. */
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const buttons = (html: string) => html.match(/<button[^>]*>.*?<\/button>/g) ?? [];

const panelHtml = (earlyCta: boolean) =>
  renderToStaticMarkup(
    <UnlockCheckoutProvider earlyCta={{ enabled: earlyCta }} autoCheckout={false}>
      <UnlockPanel {...KIT} launchPromo={control} autoCheckout={false} cancelled={false} saved={false} />
    </UnlockCheckoutProvider>,
  );

test("early CTA: the price and the same £19 unlock button as the panel, in the server HTML, in the accessible colour", () => {
  const html = renderToStaticMarkup(<UnlockCta {...KIT} launchPromo={control} />);
  expect(text(html)).toContain("£19 once, no subscription");
  const [button] = buttons(html);
  expect(text(button)).toContain("Unlock the full kit, £19");
  expect(button).toContain("bg-cta");
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
  expect(buttons(placeholder)[0]).toContain(' disabled=""');
  const classes = (html: string) => [html.match(/^<div class="([^"]+)"/)?.[1], buttons(html)[0].match(/class="([^"]+)"/)?.[1]];
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

test("flag off: the panel's button is exactly today's (no early-CTA colour); on: the panel's button matches the early CTA", () => {
  const off = buttons(panelHtml(false)).find((b) => b.includes("Unlock the full kit"))!;
  expect(off).not.toContain("bg-cta");
  expect(off).toContain("bg-primary");
  const on = buttons(panelHtml(true)).find((b) => b.includes("Unlock the full kit"))!;
  expect(on).toContain("bg-cta");
  expect(on).not.toContain("bg-primary ");
});

test("the panel rendered on its own (no provider) still works as before", () => {
  const html = renderToStaticMarkup(<UnlockPanel {...KIT} launchPromo={control} autoCheckout={false} cancelled={false} saved={false} />);
  expect(text(html)).toContain("Unlock the full kit, £19");
  expect(html).not.toContain("bg-cta");
});

test("every checkout error is an alert with an action: Try again, the save link signed out, a new preview when the kit is gone", () => {
  const codes: CheckoutFailureCode[] = ["network", "rate_limited", "kit_missing", "server", "unknown"];
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
    }
  }
});

/** WCAG 2 contrast of two `oklch(L C h)` colours, via OKLab to linear sRGB. */
function contrast(a: string, b: string) {
  const luminance = (oklch: string) => {
    const [L, C, h] = oklch.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/)!.slice(1).map(Number);
    const [A, B] = [C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    const [r, g, bl] = rgb.map((v) => Math.min(1, Math.max(0, v)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("the unlock buttons' colours meet 4.5:1 for their white label, at rest and on hover", () => {
  const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
  const root = css.match(/:root \{([\s\S]*?)\n\}/)![1];
  const token = (name: string) => root.match(new RegExp(`--${name}: (oklch\\([^)]+\\));`))![1];
  expect(contrast(token("cta"), token("primary-foreground"))).toBeGreaterThanOrEqual(4.5);
  expect(contrast(token("cta-hover"), token("primary-foreground"))).toBeGreaterThanOrEqual(4.5);
  // Why the early CTA doesn't use the brand orange as is.
  expect(contrast(token("primary"), token("primary-foreground"))).toBeLessThan(4.5);
});
