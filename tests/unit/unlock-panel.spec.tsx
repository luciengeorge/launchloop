import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { UnlockPanel } from "@/components/kit/unlock-panel";
import type { Served } from "@/lib/experiments";

/** The panel's server HTML: no effects run, so this is what shows before (and without) any client code. */
const serverHtml = (launchPromo: Served) =>
  renderToStaticMarkup(<UnlockPanel kitId="kit_0123456789abcdef" priceLabel="£19" launchPromo={launchPromo} autoCheckout={false} cancelled={false} saved={false} />);
/** Text with a space wherever a tag was, the way the elements lay out (margins, not spaces, separate them). */
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("treatment: the price line, the LAUNCH14 note and the £14 button are all in the server HTML", () => {
  for (const served of [{ variant: "treatment" }, { variant: "treatment", fallback: "error" }] as Served[]) {
    const html = serverHtml(served);
    expect(text(html)).toContain("Was £19 now £14 once, no subscription");
    expect(text(html)).toContain("LAUNCH14 takes £5 off, applied for you at checkout. Launch offer for first-time buyers, while it lasts.");
    expect(text(html)).toContain("Unlock the full kit, £14");
    expect(html).not.toContain("Loading price");
    const unlockButton = html.match(/<button[^>]*>(?:(?!<button).)*?Unlock the full kit/)?.[0] ?? "";
    expect(unlockButton).not.toContain(' disabled=""');
  }
});

test("control (or a fallback): the plain £19 everywhere, no LAUNCH14 note", () => {
  for (const served of [{ variant: "control" }, { variant: "control", fallback: "timeout" }] as Served[]) {
    const html = serverHtml(served);
    expect(text(html)).toContain("£19 once, no subscription");
    expect(text(html)).toContain("Unlock the full kit, £19");
    expect(html).not.toContain("£14");
    expect(html).not.toContain("LAUNCH14");
  }
});

test("the button's price always matches the price line", () => {
  for (const variant of ["control", "treatment"] as const) {
    const html = serverHtml({ variant });
    const line = text(html.match(/<p[^>]*data-testid="kit-price"[^>]*>(.*?)<\/p>/)?.[1] ?? "");
    const button = html.match(/Unlock the full kit, £\d+/)?.[0];
    const shown = line.match(/£\d+(?= once)/)?.[0];
    expect(button).toBe(`Unlock the full kit, ${shown}`);
  }
});
