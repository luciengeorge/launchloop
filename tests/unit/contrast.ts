import { readFileSync } from "node:fs";
import path from "node:path";

/** WCAG 2 contrast of two `oklch(L C h)` colours, via OKLab to linear sRGB. */
export function contrast(a: string, b: string) {
  const luminance = (oklch: string) => {
    const [L, C, h] = oklch.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/)!.slice(1).map(Number);
    const [A, B] = [C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    const [r, g, bl] = rgb.map((v) => Math.min(1, Math.max(0, v)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const globalsCss = () => readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

/** The literal `oklch(...)` value of `--name` in globals.css's `:root` (or another top-level block, like `.dark`). */
export function rootToken(name: string, block = ":root") {
  const body = globalsCss().split(`\n${block} {`)[1]!.split("\n}")[0];
  return body.match(new RegExp(`--${name}: (oklch\\([^)]+\\));`))![1];
}
