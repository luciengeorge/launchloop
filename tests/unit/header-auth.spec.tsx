import { expect, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { HeaderAuth, SignedInLinks } from "@/components/header-auth";

const count = (html: string, needle: string) => html.split(needle).length - 1;

for (const promo of [false, true]) {
  test(`promo ${promo ? "on" : "off"}: the server (signed-out) header has one of each test id`, () => {
    const html = renderToStaticMarkup(<HeaderAuth promo={promo} />);
    expect(count(html, 'data-testid="nav-login"')).toBe(1);
    expect(count(html, 'data-testid="kit-price-promo"')).toBe(promo ? 1 : 0);
    expect(html).not.toContain("nav-my-kits");
  });

  test(`promo ${promo ? "on" : "off"}: the signed-in links' invisible signed-out copy carries no test ids`, () => {
    const html = renderToStaticMarkup(<SignedInLinks promo={promo} />);
    expect(count(html, 'data-testid="nav-my-kits"')).toBe(1);
    expect(count(html, 'data-testid="nav-logout"')).toBe(1);
    expect(html).not.toContain('data-testid="nav-login"');
    expect(html).not.toContain('data-testid="kit-price-promo"');
    // The copy is still there, so the group keeps the signed-out width.
    expect(html).toMatch(/<div class="invisible [^"]*" aria-hidden="true" inert="">/);
    expect(count(html, ">Log in<")).toBe(1);
  });
}
