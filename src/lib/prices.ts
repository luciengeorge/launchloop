// No server-only: unit tests import this directly.

/**
 * A price with its currency and optional period kept together: "£19", "$1,200/yr", "€9.50 / month".
 * Not inside a longer token on either side, and never a prefix of a longer number ("£19.995" is not "£19.99").
 */
const PRICE_RE = /(?<![\w£$€])([£$€])\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?(?![\d.,]?\d)(?:\s?\/\s?(month|mo|year|yr)\b)?/gi;
/** Beyond this it's a glued-together number or an enterprise quote, not a plan price worth citing. */
const MAX_PLAUSIBLE = 5_000;
const MAX_PRICES = 4;

interface Price {
  currency: string;
  amount: number;
  period?: "mo" | "yr";
}

function scan(text: string): Price[] {
  return [...text.matchAll(PRICE_RE)].map(([, currency, whole, cents, period]) => ({
    currency,
    amount: Number(`${whole.replace(/,/g, "")}${cents ? `.${cents}` : ""}`),
    period: period ? (period.toLowerCase().startsWith("m") ? "mo" : "yr") : undefined,
  }));
}

const format = (p: Price) => `${p.currency}${Number.isInteger(p.amount) ? p.amount.toLocaleString("en-GB") : p.amount.toFixed(2)}${p.period ? `/${p.period}` : ""}`;

/** Plausible prices in page order, one per amount (the one with a period wins), capped. */
function distinct(prices: Price[], max: number): Price[] {
  const byAmount = new Map<string, Price>();
  for (const price of prices) {
    if (price.amount > MAX_PLAUSIBLE) continue;
    const key = `${price.currency}${price.amount}`;
    const seen = byAmount.get(key);
    if (!seen || (!seen.period && price.period)) byAmount.set(key, price);
  }
  return [...byAmount.values()].slice(0, max);
}

/** Prices in scraped text, normalised ("$20/ mo" → "$20/mo", "$0.00" → "$0"), deduped and capped. */
export function pricesIn(text: string, max = MAX_PRICES): string[] {
  return distinct(scan(text), max).map(format);
}

const MAX_LISTED = 3;

/**
 * "Pricing on site: free plan, $20/mo, $200/mo". Undefined when there's nothing to say or the page
 * mixes currencies (a currency switcher scrapes as noise). More than three paid prices become "from $9/mo".
 */
export function pricingProofPoint(prices: string[]): string | undefined {
  const parsed = distinct(scan(prices.join(" ")), Infinity);
  if (!parsed.length || new Set(parsed.map((p) => p.currency)).size > 1) return undefined;
  const paid = parsed.filter((p) => p.amount > 0).sort((a, b) => a.amount - b.amount);
  const parts = [...(paid.length < parsed.length ? ["free plan"] : []), ...(paid.length > MAX_LISTED ? [`from ${format(paid[0])}`] : paid.map(format))];
  return `Pricing on site: ${parts.join(", ")}`;
}
