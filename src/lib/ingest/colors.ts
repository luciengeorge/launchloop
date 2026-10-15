import type { Palette } from "../schema";

type RGB = [number, number, number];

export const DEFAULT_PALETTE: Palette = {
  background: "#0b0b12",
  foreground: "#f5f5f7",
  accent: "#7c5cff",
  accentForeground: "#ffffff",
  muted: "#a1a1b5",
  source: "default",
};

const clamp = (n: number, lo = 0, hi = 255) => Math.min(hi, Math.max(lo, n));

export function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((n) => Math.round(clamp(n)).toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as RGB;
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

function oklchToRgb(L: number, C: number, H: number): RGB {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return lin.map((v) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return clamp(c * 255);
  }) as RGB;
}

const num = (v: string, scale = 1) => (v.endsWith("%") ? (parseFloat(v) / 100) * scale : parseFloat(v));

/** Parses one CSS colour token (hex, rgb[a], hsl[a], oklch). Returns null for anything else. */
export function parseColor(token: string): RGB | null {
  const t = token.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/.test(t)) {
    if (t.length === 9 && parseInt(t.slice(7, 9), 16) < 128) return null;
    return hexToRgb(t);
  }
  const fn = t.match(/^(rgba?|hsla?|oklch)\(([^)]+)\)$/);
  if (!fn) return null;
  const parts = fn[2].replace(/\s*\/\s*/, " / ").split(/[\s,]+/).filter(Boolean);
  const slash = parts.indexOf("/");
  const alphaToken = slash >= 0 ? parts[slash + 1] : parts[3];
  if (alphaToken && num(alphaToken) < 0.5) return null;
  const [p0, p1, p2] = parts;
  if (!p2) return null;
  if (fn[1].startsWith("rgb")) return [num(p0, 255), num(p1, 255), num(p2, 255)];
  if (fn[1].startsWith("hsl")) return hslToRgb(parseFloat(p0), num(p1), num(p2));
  return oklchToRgb(num(p0), p1.endsWith("%") ? num(p1, 0.4) : parseFloat(p1), parseFloat(p2) || 0);
}

function hsl([r, g, b]: RGB) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  return { h: (h + 360) % 360, s, l };
}

export function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

const COLOR_TOKEN = /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch)\([^)]*\)/g;

export interface ColorHints {
  css: string;
  themeColor?: string;
}

/**
 * Picks a brand palette from raw CSS. Brand-ish custom properties
 * (--primary, --brand, --accent) and the theme-color meta tag weigh most;
 * otherwise the most frequent saturated colour wins.
 */
export function extractPalette({ css, themeColor }: ColorHints): Palette {
  const scores = new Map<string, { rgb: RGB; score: number }>();
  const bump = (rgb: RGB | null, weight: number) => {
    if (!rgb) return;
    const key = toHex(rgb);
    const entry = scores.get(key) ?? { rgb, score: 0 };
    entry.score += weight;
    scores.set(key, entry);
  };

  bump(themeColor ? parseColor(themeColor) : null, 30);

  let declaredBackground: RGB | null = null;
  for (const m of css.matchAll(/--([\w-]+)\s*:\s*([^;}]+)/g)) {
    const name = m[1].toLowerCase();
    const rgb = parseColor(m[2]);
    if (!rgb) continue;
    if (/^(color-)?(primary|brand|accent)(-500|-600)?$/.test(name)) bump(rgb, 35);
    else if (/(primary|brand|accent)/.test(name) && !/foreground|fg|text/.test(name)) bump(rgb, 8);
    if (/^(color-)?background$/.test(name) && !declaredBackground) declaredBackground = rgb;
  }
  for (const m of css.matchAll(COLOR_TOKEN)) bump(parseColor(m[0]), 1);

  const ranked = [...scores.values()]
    .map((e) => ({ ...e, ...hsl(e.rgb) }))
    .filter((e) => e.s > 0.3 && e.l > 0.22 && e.l < 0.78)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return DEFAULT_PALETTE;

  let accent = ranked[0].rgb;
  const white: RGB = [255, 255, 255];
  const ink: RGB = [10, 10, 16];
  let background: RGB = declaredBackground ?? mix(accent, ink, 0.9);
  if (contrast(background, accent) < 2.2) background = mix(accent, ink, 0.92);
  const foreground = contrast(background, white) >= contrast(background, ink) ? white : ink;
  for (let i = 0; i < 6 && contrast(background, accent) < 3; i++) accent = mix(accent, foreground, 0.15);
  const accentForeground = contrast(accent, white) >= contrast(accent, ink) ? white : ink;
  const muted = mix(foreground, background, 0.38);

  return {
    background: toHex(background),
    foreground: toHex(foreground),
    accent: toHex(accent),
    accentForeground: toHex(accentForeground),
    muted: toHex(muted),
    source: "site",
  };
}
