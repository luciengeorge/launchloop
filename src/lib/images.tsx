import "server-only";
import { ImageResponse } from "@vercel/og";
import type { CSSProperties } from "react";
import type { FittedText } from "./image-fit";
import { MAX_FEATURES, planKitImage, type KitImageContent, type PillPlan } from "./image-layout";
import { IMAGE_VARIANTS, type ImageVariant } from "./image-variants";
import { hexToRgb } from "./ingest/colors";
import type { Kit } from "./schema";

const alpha = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const plain = (s: string) =>
  s
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "")
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

function Watermark({ color }: { color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 90,
        transform: "rotate(-18deg)",
      }}
    >
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: "flex", fontSize: 92, fontWeight: 700, color, letterSpacing: 8 }}>
          PREVIEW · LAUNCHLOOP
        </div>
      ))}
    </div>
  );
}

function Lines({ text, align = "flex-start", style }: { text: FittedText; align?: "flex-start" | "center"; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align,
        flexShrink: 0,
        fontSize: text.fontSize,
        lineHeight: text.lineHeight,
        letterSpacing: text.letterSpacing,
        ...style,
      }}
    >
      {text.lines.map((line, i) => (
        <div key={i} style={{ display: "flex", whiteSpace: "nowrap" }}>
          {line}
        </div>
      ))}
    </div>
  );
}

function Pill({ plan, style, dotColor }: { plan: PillPlan; style: CSSProperties; dotColor?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        gap: plan.gap,
        padding: `${plan.padY}px ${plan.padX}px`,
        borderRadius: 999,
        ...style,
      }}
    >
      {plan.dot && dotColor ? <div style={{ display: "flex", flexShrink: 0, width: plan.dot, height: plan.dot, borderRadius: 999, backgroundColor: dotColor }} /> : null}
      <Lines text={plan.text} align="center" />
    </div>
  );
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

export function renderKitImage(kit: Kit, variant: ImageVariant, options: { watermark: boolean }): ImageResponse {
  const { width, height } = IMAGE_VARIANTS[variant];
  const p = kit.palette;
  const plan = planKitImage(variant, kitImageContent(kit));
  const scale = plan.scale;

  const frame = {
    width: "100%",
    height: "100%",
    display: "flex",
    position: "relative" as const,
    flexDirection: "column" as const,
    backgroundColor: p.background,
    backgroundImage: `radial-gradient(circle at 85% 15%, ${alpha(p.accent, 0.45)} 0%, ${alpha(p.accent, 0)} 55%), radial-gradient(circle at 0% 100%, ${alpha(p.accent, 0.22)} 0%, ${alpha(p.accent, 0)} 45%)`,
    color: p.foreground,
    fontFamily: "sans-serif",
    padding: plan.padding,
  };

  const outlinePill = (pill: PillPlan) => (
    <Pill
      plan={pill}
      dotColor={p.accent}
      style={{ backgroundColor: alpha(p.foreground, 0.08), border: `${pill.border}px solid ${alpha(p.foreground, 0.16)}`, color: p.muted }}
    />
  );

  let body: React.ReactNode;
  switch (plan.variant) {
    case "og":
      body = (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", flexShrink: 0 }}>{outlinePill(plan.domain)}</div>
          <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, gap: 20 }}>
            <Lines text={plan.name} style={{ fontWeight: 700 }} />
            <Lines text={plan.tagline} style={{ color: alpha(p.foreground, 0.85) }} />
          </div>
          <div style={{ display: "flex", flexShrink: 0, height: 10, width: 220, borderRadius: 999, backgroundColor: p.accent }} />
        </div>
      );
      break;
    case "x":
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", flex: 1, gap: 40 }}>
          {outlinePill(plan.name)}
          <Lines text={plan.headline} align="center" style={{ fontWeight: 700 }} />
          {plan.pills.length ? (
            <div style={{ display: "flex", flexShrink: 0, gap: 20, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
              {plan.pills.map((pill, i) => (
                <Pill key={i} plan={pill} style={{ backgroundColor: p.accent, color: p.accentForeground, fontWeight: 600 }} />
              ))}
            </div>
          ) : null}
          {plan.domain ? <Lines text={plan.domain} align="center" style={{ color: p.muted }} /> : null}
        </div>
      );
      break;
    case "ph":
      body = (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, gap: 16 }}>
            <Lines text={plan.name} style={{ fontWeight: 700 }} />
            <Lines text={plan.tagline} style={{ color: alpha(p.foreground, 0.85) }} />
          </div>
          {plan.cards.length ? (
            <div style={{ display: "flex", gap: 28, flex: 1 }}>
              {plan.cards.map((card, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    flex: 1,
                    overflow: "hidden",
                    padding: 36,
                    borderRadius: 28,
                    backgroundColor: alpha(p.foreground, 0.06),
                    border: `2px solid ${alpha(p.accent, 0.55)}`,
                  }}
                >
                  <Lines text={card.number} style={{ fontWeight: 700, color: p.accent }} />
                  <Lines text={card.text} style={{ fontWeight: 600 }} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
      break;
    default: {
      const unreachable: never = plan;
      throw new Error(`Unknown image plan: ${String(unreachable)}`);
    }
  }

  return new ImageResponse(
    (
      <div style={frame}>
        {body}
        {options.watermark ? <Watermark color={alpha(p.foreground, 0.16)} /> : null}
        {options.watermark ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              justifyContent: "center",
              padding: 14 * scale,
              backgroundColor: alpha("#000000", 0.55),
              color: "#ffffff",
              fontSize: 22 * scale,
            }}
          >
            Free preview. Unlock the full kit at launchloop.dev
          </div>
        ) : null}
      </div>
    ),
    {
      width,
      height,
      headers: { "Cache-Control": options.watermark ? "public, max-age=300, s-maxage=300" : "private, max-age=3600" },
    },
  );
}

export async function renderKitImageBuffer(kit: Kit, variant: ImageVariant): Promise<Uint8Array> {
  const res = renderKitImage(kit, variant, { watermark: !kit.paid });
  return new Uint8Array(await res.arrayBuffer());
}
