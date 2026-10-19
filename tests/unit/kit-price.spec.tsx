import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { KitPrice, KitPromoNote, PricedText } from "@/components/kit-price";
import { resolveLaunchPromo } from "@/lib/launch-promo";
import { KIT_PRICE_TOKEN, kitPriceText } from "@/lib/site";

const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);
const text = (node: React.ReactNode) => html(node).replace(/<[^>]+>/g, "");

test.describe("resolveLaunchPromo", () => {
  test("on: the treatment variant", async () => {
    expect(await resolveLaunchPromo(async () => "treatment")).toBe(true);
  });

  test("off: control, a disabled flag, or no value", async () => {
    for (const value of ["control", false, undefined, null, true, "TREATMENT"]) {
      expect(await resolveLaunchPromo(async () => value)).toBe(false);
    }
  });

  test("error: a failed evaluation is off and reported", async () => {
    const errors: unknown[] = [];
    const boom = new Error("flags request failed");
    expect(await resolveLaunchPromo(() => Promise.reject(boom), { onError: (e) => errors.push(e) })).toBe(false);
    expect(errors).toEqual([boom]);
  });

  test("error: a hung evaluation times out to off", async () => {
    const started = Date.now();
    expect(await resolveLaunchPromo(() => new Promise(() => {}), { timeoutMs: 50 })).toBe(false);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

test.describe("KitPrice", () => {
  test("off: exactly the plain £19, as before", () => {
    expect(html(<KitPrice promo={false} />)).toBe("£19");
    expect(html(<KitPrice promo={false} size="display" />)).toBe('<span class="text-4xl font-semibold tracking-tight">£19</span>');
    expect(html(<KitPromoNote promo={false} />)).toBe("");
  });

  test("on: £19 struck through, then £14, with screen reader wording", () => {
    for (const size of ["inline", "display"] as const) {
      const markup = html(<KitPrice promo size={size} />);
      const struck = markup.match(/<s[^>]*>(.*?)<\/s>/)?.[1] ?? "";
      expect(struck).toContain("£19");
      expect(struck).not.toContain("£14");
      expect(text(<KitPrice promo size={size} />).replace(/\s+/g, " ")).toMatch(/was £19 ?now £14/i);
    }
    // The compact form never wraps between the two prices (header CTA on a 375px screen).
    expect(html(<KitPrice promo />)).toContain("whitespace-nowrap");
    expect(text(<KitPromoNote promo />)).toBe("LAUNCH14 applied at checkout");
  });

  test("PricedText swaps only the marked kit price", () => {
    const copy = `What do I get for ${KIT_PRICE_TOKEN}? Ship Loop credits the £19.`;
    expect(text(<PricedText text={copy} promo={false} />)).toBe("What do I get for £19? Ship Loop credits the £19.");
    expect(html(<PricedText text={copy} promo />)).toMatch(/for <span[^>]*><s[^>]*>.*£19<\/s>.*£14<\/span>\? Ship Loop credits the £19\.<\/span>$/);
    expect(kitPriceText(copy, false)).toBe("What do I get for £19? Ship Loop credits the £19.");
    expect(kitPriceText(copy, true)).toBe("What do I get for £14 (launch price, normally £19)? Ship Loop credits the £19.");
  });

  test("PricedText is one inline element, so a flex parent can't split the text from the price", () => {
    for (const promo of [false, true]) {
      const markup = html(<PricedText text={`What do I get for ${KIT_PRICE_TOKEN}?`} promo={promo} />);
      expect(markup).toMatch(/^<span>What do I get for .*\?<\/span>$/);
    }
  });
});
