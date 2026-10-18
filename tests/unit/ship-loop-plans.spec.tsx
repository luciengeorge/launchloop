import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { ShipLoopPlans } from "@/components/ship-loop-plans";

const text = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>).replace(/<[^>]+>/g, "");

test.describe("ShipLoopPlans", () => {
  test("without STRIPE_PRICE_SHIPLOOP_PREORDER: planned pricing and the waitlist, no pre-order", () => {
    const html = renderToStaticMarkup(<ShipLoopPlans preorderOpen={false} />);
    expect(html).not.toMatch(/pre-order/i);
    expect(html).toContain('data-testid="waitlist-form"');
    expect(text(<ShipLoopPlans preorderOpen={false} />)).toContain("Planned pricing£99/yearNot on sale yet.");
  });

  test("with the price: the £99 one-time founding pre-order on Yearly, the waitlist below", () => {
    const html = renderToStaticMarkup(<ShipLoopPlans preorderOpen />);
    expect(html).toContain('data-testid="preorder"');
    expect(html).toContain('data-testid="waitlist-form"');
    const copy = text(<ShipLoopPlans preorderOpen />);
    expect(copy).toContain("Pre-order Ship Loop, £99 one-time");
    expect(copy).toContain("It covers your first year of Ship Loop once it launches.");
    expect(copy).toContain("If Ship Loop isn&#x27;t live within 12 months of your pre-order, we refund you in full automatically.");
    expect(copy).not.toContain("Planned pricing");
  });
});
