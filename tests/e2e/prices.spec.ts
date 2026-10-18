import { expect, test } from "@playwright/test";
import { normalisePrices, pricingProofPoint, PRICE_RE } from "../../src/lib/prices";

test("scraped prices are normalised and deduped before they reach the brief", () => {
  const scraped = "Hobby $0/ mo Starter $20/ mo then $0.00 today. Pro $200 / month, billed $200/mo".match(PRICE_RE) ?? [];
  expect(normalisePrices(scraped)).toEqual(["$0/mo", "$20/mo", "$200/mo"]);
  expect(normalisePrices(["£9.99", "£9.99/mo", "£19.00"])).toEqual(["£9.99/mo", "£19"]);
});

test("the pricing proof point is short and clean, or dropped when it's noise", () => {
  expect(pricingProofPoint(["$0/ mo", "$20/ mo", "$0.00", "$200/ mo"])).toBe("Pricing on site: free plan, $20/mo, $200/mo");
  expect(pricingProofPoint(["$6/mo"])).toBe("Pricing on site: $6/mo");
  expect(pricingProofPoint(["$0"])).toBe("Pricing on site: free plan");
  expect(pricingProofPoint(["$49/mo", "$9/mo", "$0", "$19/mo", "$99/mo"])).toBe("Pricing on site: free plan, from $9/mo");
  expect(pricingProofPoint(["$10/mo", "€9/mo", "£8/mo"])).toBeUndefined();
  expect(pricingProofPoint([])).toBeUndefined();
});
