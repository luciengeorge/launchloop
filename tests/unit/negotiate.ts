/**
 * Proactive content negotiation as an RFC 9110 server does it: each offered type gets the q of the most
 * specific matching range (exact, then type/*, then *\/*), the highest q wins, and ties go to the server's
 * own preference, the order of `offered`. Returns undefined when nothing is acceptable (a 406).
 */
export function negotiate(accept: string, offered: string[]): string | undefined {
  const ranges = accept.split(",").map((part) => {
    const [range, ...params] = part.trim().toLowerCase().split(";");
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    return { range: range.trim(), q: q ? Number(q.slice(2)) : 1 };
  });
  const qOf = (type: string) => {
    const match = ranges.find((r) => r.range === type) ?? ranges.find((r) => r.range === `${type.split("/")[0]}/*`) ?? ranges.find((r) => r.range === "*/*");
    return match?.q ?? 0;
  };
  let best: { type: string; q: number } | undefined;
  for (const type of offered) {
    const q = qOf(type);
    if (q > 0 && (!best || q > best.q)) best = { type, q };
  }
  return best?.type;
}
