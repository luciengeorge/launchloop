import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { ShipLoopPlans } from "@/components/ship-loop-plans";

test("ShipLoopPlans: the free waitlist only, with no price, no plans and nothing to buy", () => {
  const html = renderToStaticMarkup(<ShipLoopPlans />);
  const text = html.replace(/<[^>]+>/g, "");
  expect(html).toContain('data-testid="waitlist-form"');
  expect(text).toContain("Join the waitlist, we&#x27;ll email you when it launches.");
  expect(text).toContain("Not on sale, so there&#x27;s nothing to buy.");
  expect(text).not.toMatch(/£|pre-?order|one-time|first year|12 months|credit|monthly|yearly|planned/i);
  expect(html).not.toContain('role="radio');
  expect(html).not.toContain('name="plan"');
  expect(html.match(/<button[^>]*>.*?<\/button>/g)?.map((b) => b.replace(/<[^>]+>/g, ""))).toEqual(["Join the waitlist"]);
});
