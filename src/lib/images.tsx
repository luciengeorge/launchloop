/* eslint-disable @next/next/no-img-element -- Satori draws plain <img>; next/image does not exist there. */
import "server-only";
import { ImageResponse } from "@vercel/og";
import type { CSSProperties, ReactNode } from "react";
import { loadKitImageAssets, type KitImageAssets, type LoadedImage } from "./image-assets";
import { kitImageFonts } from "./image-fonts";
import type { FittedText } from "./image-fit";
import { MAX_FEATURES, monogram, monogramFontSize, planKitImage, type Box, type KitImageContent, type KitImagePlan, type MarkPlan, type PillBlock, type ShotPlan, type TextBlock } from "./image-layout";
import { IMAGE_VARIANTS, type ImageVariant } from "./image-variants";
import { hexToRgb, luminance, toHex } from "./ingest/colors";
import type { Kit, Palette } from "./schema";

type RGB = [number, number, number];

const alpha = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hexToRgb(a), hexToRgb(b)];
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
};

const luminanceContrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const plain = (s: string) =>
  s
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "")
    .replace(/(^|\s):[a-z0-9_+-]+:(?=\s|$)/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();

function domainOf(kit: Kit) {
  const url = kit.brief.url ?? kit.brief.repoUrl;
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname === "github.com" ? `github.com${u.pathname}` : u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function kitImageContent(kit: Kit): KitImageContent {
  return {
    name: plain(kit.content?.productHunt.name ?? kit.brief.name),
    tagline: plain(kit.content?.productHunt.tagline ?? kit.preview.tagline),
    headline: plain(kit.content?.landing.headline ?? kit.brief.oneLiner),
    features: (kit.content?.landing.features.map((f) => f.title) ?? kit.brief.features).slice(0, MAX_FEATURES).map(plain),
    domain: domainOf(kit),
  };
}

/** Colours for one image, derived from the brand palette. Dark brands get lighter surfaces and deeper shadows. */
function themeOf(p: Palette) {
  const dark = luminance(hexToRgb(p.background)) < 0.2;
  return {
    dark,
    bg: p.background,
    fg: p.foreground,
    muted: p.muted,
    accent: p.accent,
    accentFg: p.accentForeground,
    sub: alpha(p.foreground, dark ? 0.8 : 0.76),
    line: alpha(p.foreground, dark ? 0.16 : 0.12),
    chip: alpha(p.foreground, dark ? 0.07 : 0.05),
    frame: dark ? mix(p.background, "#ffffff", 0.07) : "#ffffff",
    toolbar: dark ? mix(p.background, "#ffffff", 0.11) : mix(p.background, "#ffffff", 0.55),
    card: dark ? mix(p.background, "#ffffff", 0.05) : alpha("#ffffff", 0.72),
    shadow: dark ? "0 40px 100px rgba(0, 0, 0, 0.55)" : "0 32px 80px rgba(15, 23, 42, 0.18)",
    glow: alpha(p.accent, dark ? 0.34 : 0.2),
    grid: alpha(p.foreground, dark ? 0.07 : 0.06),
  };
}
type Theme = ReturnType<typeof themeOf>;

const abs = (b: Box): CSSProperties => ({ position: "absolute", left: b.x, top: b.y, width: b.width, height: b.height, display: "flex" });

function Lines({ text, align = "flex-start", color }: { text: FittedText; align?: "flex-start" | "center"; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align, fontSize: text.fontSize, lineHeight: text.lineHeight, letterSpacing: text.letterSpacing, fontWeight: text.weight, ...(color && { color }) }}>
      {text.lines.map((line, i) => (
        <div key={i} style={{ display: "flex", whiteSpace: "nowrap" }}>
          {line}
        </div>
      ))}
    </div>
  );
}

function TextAt({ block, color, align = "flex-start" }: { block: TextBlock; color: string; align?: "flex-start" | "center" }) {
  return (
    <div style={{ ...abs(block.box), flexDirection: "column", alignItems: align }}>
      <Lines text={block.text} align={align} color={color} />
    </div>
  );
}

function PillAt({ pill, style, dotColor, color }: { pill: PillBlock; style: CSSProperties; dotColor?: string; color: string }) {
  return (
    <div style={{ ...abs(pill.box), alignItems: "center", gap: pill.gap, padding: `${pill.padY}px ${pill.padX}px`, borderRadius: 999, borderWidth: pill.border, borderStyle: "solid", ...style }}>
      {pill.dot && dotColor ? <div style={{ display: "flex", flexShrink: 0, width: pill.dot, height: pill.dot, borderRadius: 999, backgroundColor: dotColor }} /> : null}
      <Lines text={pill.text} color={color} />
    </div>
  );
}

/** The logo, on a tile when it is see-through and would vanish into the background, else a monogram. */
function Mark({ plan, logo, name, t, glow }: { plan: MarkPlan; logo?: LoadedImage; name: string; t: Theme; glow: boolean }) {
  const { box, radius } = plan;
  const shadow: CSSProperties = glow ? { boxShadow: `0 24px 70px ${alpha(t.accent, t.dark ? 0.45 : 0.32)}` } : {};
  if (!logo) {
    const letters = monogram(name);
    const size = monogramFontSize(letters, box);
    return (
      <div style={{ ...abs(box), alignItems: "center", justifyContent: "center", borderRadius: radius, backgroundColor: t.accent, color: t.accentFg, fontSize: size, fontWeight: 700, letterSpacing: -0.02 * size, ...shadow }}>
        {letters}
      </div>
    );
  }
  const opaque = logo.tone ? !logo.tone.transparent : logo.format === "jpeg";
  if (opaque) {
    return (
      <div style={{ ...abs(box), borderRadius: radius, overflow: "hidden", border: `1px solid ${t.line}`, ...shadow }}>
        <img src={logo.src} width={box.width} height={box.height} style={{ width: box.width, height: box.height, objectFit: "cover" }} alt="" />
      </div>
    );
  }
  const readable = logo.tone ? luminanceContrast(logo.tone.luminance, luminance(hexToRgb(t.bg))) >= 1.8 : true;
  const tile = readable ? (t.dark ? mix(t.bg, "#ffffff", 0.08) : "#ffffff") : (logo.tone?.luminance ?? 0) > 0.4 ? "#111114" : "#ffffff";
  const inset = box.width * 0.16;
  return (
    <div style={{ ...abs(box), alignItems: "center", justifyContent: "center", borderRadius: radius, backgroundColor: tile, border: `1px solid ${t.line}`, ...shadow }}>
      <img src={logo.src} width={box.width - 2 * inset} height={box.height - 2 * inset} style={{ objectFit: "contain" }} alt="" />
    </div>
  );
}

function BrowserFrame({ shot, image, t }: { shot: ShotPlan; image: LoadedImage; t: Theme }) {
  const dot = shot.toolbar * 0.26;
  return (
    <div style={{ ...abs(shot.frame), flexDirection: "column", borderRadius: shot.radius, overflow: "hidden", backgroundColor: t.frame, border: `${shot.border}px solid ${t.line}`, boxShadow: t.shadow }}>
      <div style={{ display: "flex", position: "relative", flexShrink: 0, height: shot.toolbar, alignItems: "center", gap: dot * 0.8, paddingLeft: shot.toolbar * 0.45, backgroundColor: t.toolbar, borderBottom: `1px solid ${t.line}` }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", width: dot, height: dot, borderRadius: 999, backgroundColor: alpha(t.fg, 0.22) }} />
        ))}
        {shot.url && shot.urlBox ? (
          <div style={{ ...abs(shot.urlBox), alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: alpha(t.fg, 0.07) }}>
            <Lines text={shot.url} color={t.muted} />
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", position: "relative", flex: 1, overflow: "hidden" }}>
        <img src={image.src} width={shot.image.width} height={shot.image.height} style={{ position: "absolute", left: shot.image.x, top: shot.image.y, width: shot.image.width, height: shot.image.height }} alt="" />
      </div>
    </div>
  );
}

function Check({ box, t }: { box: Box; t: Theme }) {
  const s = box.width;
  return (
    <div style={{ ...abs(box), alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: t.accent }}>
      <div style={{ display: "flex", width: s * 0.42, height: s * 0.24, marginTop: -s * 0.08, borderLeft: `${s * 0.09}px solid ${t.accentFg}`, borderBottom: `${s * 0.09}px solid ${t.accentFg}`, transform: "rotate(-45deg)" }} />
    </div>
  );
}

function PreviewTiles({ width, height, t }: { width: number; height: number; t: Theme }) {
  const size = Math.round(width / 46);
  return (
    <div
      style={{
        position: "absolute",
        left: -width * 0.3,
        top: -height * 0.6,
        width: width * 1.6,
        height: height * 2.2,
        display: "flex",
        flexWrap: "wrap",
        alignContent: "center",
        justifyContent: "center",
        gap: `${size * 3.2}px ${size * 4.5}px`,
        transform: "rotate(-22deg)",
        color: alpha(t.fg, t.dark ? 0.07 : 0.08),
        fontSize: size,
        fontWeight: 700,
        letterSpacing: size * 0.18,
      }}
    >
      {Array.from({ length: 64 }, (_, i) => (
        <div key={i} style={{ display: "flex" }}>
          PREVIEW
        </div>
      ))}
    </div>
  );
}

function backdrop(plan: KitImagePlan, t: Theme): CSSProperties {
  const glowAt = plan.shot
    ? `${Math.round(((plan.shot.frame.x + plan.shot.frame.width * 0.35) / plan.width) * 100)}% ${Math.round(((plan.shot.frame.y + 120) / plan.height) * 100)}%`
    : `${Math.round(((plan.mark.box.x + plan.mark.box.width / 2) / plan.width) * 100)}% ${Math.round(((plan.mark.box.y + plan.mark.box.height / 2) / plan.height) * 100)}%`;
  const far = plan.layout === "type" && plan.variant !== "og" ? "100% 100%" : "0% 100%";
  return {
    backgroundColor: t.bg,
    backgroundImage: `radial-gradient(circle at ${glowAt}, ${t.glow} 0%, ${alpha(t.accent, 0)} 52%), radial-gradient(circle at ${far}, ${alpha(t.accent, t.dark ? 0.16 : 0.1)} 0%, ${alpha(t.accent, 0)} 42%)`,
  };
}

function body(plan: KitImagePlan, assets: KitImageAssets, t: Theme, name: string): ReactNode {
  const mark = <Mark plan={plan.mark} logo={assets.logo} name={name} t={t} glow={plan.layout === "type" && plan.variant === "og"} />;
  const shot = plan.shot && assets.screenshot ? <BrowserFrame shot={plan.shot} image={assets.screenshot} t={t} /> : null;
  const domainChip = (pill: PillBlock) => <PillAt pill={pill} color={t.muted} dotColor={t.accent} style={{ backgroundColor: t.chip, borderColor: t.line }} />;
  switch (plan.variant) {
    case "og":
      return (
        <>
          {shot}
          {mark}
          <TextAt block={plan.name} color={t.fg} />
          {plan.tagline ? <TextAt block={plan.tagline} color={t.sub} /> : null}
          {plan.domain ? domainChip(plan.domain) : null}
        </>
      );
    case "x":
      return (
        <>
          {shot}
          {mark}
          <TextAt block={plan.name} color={t.fg} />
          {plan.headline ? <TextAt block={plan.headline} color={t.sub} align={plan.layout === "shot" ? "center" : "flex-start"} /> : null}
          {plan.domain ? <TextAt block={plan.domain} color={t.muted} /> : null}
          {plan.pills.map((pill, i) => (
            <PillAt key={i} pill={pill} color={t.fg} dotColor={t.accent} style={{ backgroundColor: alpha(t.accent, t.dark ? 0.16 : 0.1), borderColor: alpha(t.accent, 0.5) }} />
          ))}
        </>
      );
    case "ph": {
      const domain = plan.domain;
      return (
        <>
          {shot}
          {mark}
          <TextAt block={plan.name} color={t.fg} />
          {plan.tagline ? <TextAt block={plan.tagline} color={t.sub} /> : null}
          {domain ? "padX" in domain ? domainChip(domain) : <TextAt block={domain} color={t.muted} /> : null}
          {plan.features.map((item, i) => (
            <div key={i} style={{ display: "flex" }}>
              <Check box={item.bullet} t={t} />
              <TextAt block={item.text} color={t.fg} />
            </div>
          ))}
          {plan.cards.map((card, i) => (
            <div key={i} style={{ ...abs(card.box), borderRadius: 24, backgroundColor: t.card, border: `2px solid ${alpha(t.accent, 0.55)}` }} />
          ))}
          {plan.cards.map((card, i) => (
            <div key={`t${i}`} style={{ display: "flex" }}>
              <TextAt block={card.number} color={t.accent} />
              <TextAt block={card.text} color={t.fg} />
            </div>
          ))}
        </>
      );
    }
    default: {
      const unreachable: never = plan;
      throw new Error(`Unknown image plan: ${String(unreachable)}`);
    }
  }
}

export type RenderKitImageOptions = {
  watermark: boolean;
  /** Pre-loaded screenshot and logo; loaded from the kit's visuals when absent. */
  assets?: KitImageAssets;
};

export async function renderKitImage(kit: Kit, variant: ImageVariant, options: RenderKitImageOptions): Promise<ImageResponse> {
  const { width, height } = IMAGE_VARIANTS[variant];
  const [assets, fonts] = await Promise.all([options.assets ?? loadKitImageAssets(kit.visuals), kitImageFonts()]);
  const content = kitImageContent(kit);
  const plan = planKitImage(variant, content, { screenshot: assets.screenshot, watermark: options.watermark });
  const t = themeOf(kit.palette);

  const cache = assets.degraded ? "no-store" : options.watermark ? "public, max-age=300, s-maxage=300" : "private, max-age=3600";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", fontFamily: "Geist", color: t.fg, ...backdrop(plan, t) }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: `radial-gradient(circle at 1px 1px, ${t.grid} 1.5px, transparent 0)`, backgroundSize: `${Math.round(width / 40)}px ${Math.round(width / 40)}px` }} />
        {body(plan, assets, t, content.name)}
        {options.watermark ? <PreviewTiles width={width} height={height} t={t} /> : null}
        {plan.badge ? (
          <PillAt pill={plan.badge} color={t.accentFg} dotColor={t.accentFg} style={{ backgroundColor: t.accent, borderColor: t.accent, boxShadow: `0 10px 30px ${alpha("#000000", t.dark ? 0.45 : 0.2)}` }} />
        ) : null}
      </div>
    ),
    { width, height, fonts, headers: { "Cache-Control": cache } },
  );
}

export async function renderKitImageBuffer(kit: Kit, variant: ImageVariant): Promise<Uint8Array> {
  const res = await renderKitImage(kit, variant, { watermark: !kit.paid });
  return new Uint8Array(await res.arrayBuffer());
}
