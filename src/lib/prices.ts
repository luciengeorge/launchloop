// No server-only: unit tests import this directly.

export const PRICE_RE = /[£$€]\s?\d+(?:\.\d{2})?(?:\s?\/\s?(?:mo|month|yr|year))?/gi;

interface Price {
  currency: string;
  amount: number;
  period?: "mo" | "yr";
}

function parse(raw: string): Price | null {
  const m = /^([£$€])\s?(\d+(?:\.\d{2})?)(?:\s?\/\s?(mo|month|yr|year))?$/i.exec(raw.trim());
  if (!m) return null;
  const period = m[3]?.toLowerCase();
  return { currency: m[1], amount: Number(m[2]), period: period ? (period.startsWith("m") ? "mo" : "yr") : undefined };
}

const format = (p: Price) => `${p.currency}${Number.isInteger(p.amount) ? p.amount : p.amount.toFixed(2)}${p.period ? `/${p.period}` : ""}`;

/** "$20/ mo" → "$20/mo", "$0.00" → "$0"; one entry per amount (the one with a period wins), in page order. */
export function normalisePrices(raw: string[], max = 4): string[] {
  const byAmount = new Map<string, Price>();
  for (const price of raw.map(parse)) {
    if (!price) continue;
    const key = `${price.currency}${price.amount}`;
    const seen = byAmount.get(key);
    if (!seen || (!seen.period && price.period)) byAmount.set(key, price);
  }
  return [...byAmount.values()].slice(0, max).map(format);
}

const MAX_LISTED = 3;

/**
 * "Pricing on site: free plan, $20/mo, $200/mo". Undefined when there's nothing to say or the page
 * mixes currencies (a currency switcher scrapes as noise). More than three paid prices become "from $9/mo".
 */
export function pricingProofPoint(prices: string[]): string | undefined {
  const parsed = normalisePrices(prices, Infinity)
    .map(parse)
    .filter((p) => p !== null);
  if (!parsed.length || new Set(parsed.map((p) => p.currency)).size > 1) return undefined;
  const paid = parsed.filter((p) => p.amount > 0).sort((a, b) => a.amount - b.amount);
  const parts = [...(paid.length < parsed.length ? ["free plan"] : []), ...(paid.length > MAX_LISTED ? [`from ${format(paid[0])}`] : paid.map(format))];
  return `Pricing on site: ${parts.join(", ")}`;
}
