import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { ShipLoopPlans } from "@/components/ship-loop-plans";

test("ShipLoopPlans: planned pricing and the free waitlist, nothing to buy", () => {
  const html = renderToStaticMarkup(<ShipLoopPlans />);
  const text = html.replace(/<[^>]+>/g, "");
  expect(html).toContain('data-testid="waitlist-form"');
  expect(text).toContain("Join the waitlist, we&#x27;ll email you when it launches.");
  expect(text).toContain("Planned pricing£99/yearNot on sale yet.");
  expect(text).not.toMatch(/pre-order|one-time|first year|12 months|credit/i);
  expect(html.match(/<button[^>]*>.*?<\/button>/g)?.map((b) => b.replace(/<[^>]+>/g, ""))).toEqual(["Monthly", "Yearly (save 31%)", "Join the waitlist"]);
});
