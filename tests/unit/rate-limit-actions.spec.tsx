import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { RateLimitActions } from "@/components/rate-limit-actions";

const KIT_ID = "kit_0123456789abcdef";
const html = (props: { kitId?: string; secondsLeft: number; promo: boolean }) =>
  renderToStaticMarkup(<RateLimitActions kitId={props.kitId} retryAt={Date.now() + props.secondsLeft * 1000} promo={props.promo} onRetry={() => {}} />);
/** Text as a screen reader reads it: tags dropped, the struck price's "was"/"now" kept. */
const text = (markup: string) => markup.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
const link = (markup: string) => markup.match(/<a [^>]*>.*?<\/a>/)?.[0] ?? "";
const retry = (markup: string) => markup.match(/<button[^>]*>.*?<\/button>/)?.[0] ?? "";

test("with a preview: 'Unlock my kit' at the promo price, opening that kit with the unlock flow started", () => {
  const markup = html({ kitId: KIT_ID, secondsLeft: 240, promo: true });
  expect(link(markup)).toContain(`href="/kit/${KIT_ID}?unlock=1"`);
  expect(text(link(markup))).toBe("Unlock my kit, was £19 now £14");
});

test("with a preview after LAUNCH14 ends: the full £19, no £14", () => {
  const markup = html({ kitId: KIT_ID, secondsLeft: 240, promo: false });
  expect(text(link(markup))).toBe("Unlock my kit, £19");
  expect(markup).not.toContain("£14");
});

test("without a preview: the primary button goes to pricing and still shows the price", () => {
  for (const promo of [true, false]) {
    const markup = html({ secondsLeft: 240, promo });
    expect(link(markup)).toContain('href="/pricing"');
    expect(text(link(markup))).toBe(promo ? "See the Launch Kit, was £19 now £14" : "See the Launch Kit, £19");
    expect(markup).not.toContain("Unlock my kit");
  }
});

test("secondary: 'Try again in N min' from the limiter reset, aria-disabled (still focusable) until it reaches 0", () => {
  const waiting = retry(html({ kitId: KIT_ID, secondsLeft: 240, promo: true }));
  expect(text(waiting)).toBe("Try again in 4 min");
  expect(waiting).toContain('aria-disabled="true"');
  expect(waiting).not.toMatch(/ disabled=""/);
  expect(waiting).not.toContain('tabindex="-1"');
  expect(text(retry(html({ secondsLeft: 20 * 3600, promo: false })))).toBe("Try again in 20 hours");

  const ready = retry(html({ kitId: KIT_ID, secondsLeft: 0, promo: true }));
  expect(text(ready)).toBe("Try again");
  expect(ready).not.toMatch(/ disabled=""/);
  expect(ready).not.toContain('aria-disabled="true"');
});

test("the countdown isn't a live region; a separate polite status stays empty while waiting", () => {
  const markup = html({ kitId: KIT_ID, secondsLeft: 240, promo: true });
  expect(retry(markup)).not.toMatch(/aria-live|role="(alert|status)"/);
  const status = markup.match(/<p [^>]*data-testid="rate-limit-status"[^>]*>(.*?)<\/p>/);
  expect(status?.[0]).toContain('role="status"');
  expect(status?.[0]).toContain('aria-live="polite"');
  expect(status?.[1]).toBe("");
});

test("both actions stack full width on mobile and sit side by side from sm", () => {
  const markup = html({ kitId: KIT_ID, secondsLeft: 240, promo: true });
  expect(markup).toContain("flex-col");
  expect(markup).toContain("sm:flex-row");
  for (const action of [link(markup), retry(markup)]) expect(action).toMatch(/ w-full .*sm:w-auto/);
});
