import { expect, test, type Page } from "@playwright/test";
import { contrast } from "./helpers";

const measure = async (page: Page, parentStyle: string, targetStyle = "") => {
  await page.setContent(`<div style="background-color: #fff"><div style="${parentStyle}"><p id="target" style="color: #000; ${targetStyle}">Text</p></div></div>`);
  return contrast(page.locator("#target"));
};

test("an ancestor with a background image throws UnsupportedContrastError instead of returning a number", async ({ page }) => {
  await expect(measure(page, "background-image: linear-gradient(#fff, #000)")).rejects.toThrow(/UnsupportedContrastError/);
});

test("opacity other than 1 anywhere in the walked chain throws UnsupportedContrastError, even 0.99", async ({ page }) => {
  await expect(measure(page, "opacity: 0.99")).rejects.toThrow(/UnsupportedContrastError/);
  await expect(measure(page, "", "opacity: 0.5")).rejects.toThrow(/UnsupportedContrastError/);
});

test("a filter anywhere in the walked chain throws UnsupportedContrastError, but filter: none doesn't", async ({ page }) => {
  await expect(measure(page, "filter: blur(0px)")).rejects.toThrow(/UnsupportedContrastError/);
  await expect(measure(page, "", "filter: brightness(1)")).rejects.toThrow(/UnsupportedContrastError/);
  expect(await measure(page, "filter: none")).toBeCloseTo(21, 0);
});

test("each colour is parsed from a cleared fillStyle: a colour the canvas rejects doesn't inherit the previous fill", async ({ page }) => {
  // Chromium's canvas parses every computed colour today, so one is made unparseable here.
  await page.addInitScript(() => {
    const fillStyle = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "fillStyle")!;
    Object.defineProperty(CanvasRenderingContext2D.prototype, "fillStyle", {
      ...fillStyle,
      set(value: string) {
        if (value !== "oklch(0.6 none 40)") fillStyle.set!.call(this, value);
      },
    });
  });
  await page.goto("about:blank");
  await page.setContent(
    `<div style="background-color: #000"><div style="background-color: oklch(0.6 none 40)"><p id="target" style="color: #fff">Text</p></div></div>`,
  );
  // Unparseable is treated as no fill, so the text is measured on the black behind it.
  expect(await contrast(page.locator("#target"))).toBeCloseTo(21, 0);
});
