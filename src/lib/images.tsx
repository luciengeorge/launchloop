import "server-only";
import { ImageResponse } from "@vercel/og";
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

export function renderKitImage(kit: Kit, variant: ImageVariant, options: { watermark: boolean }): ImageResponse {
  const { width, height } = IMAGE_VARIANTS[variant];
  const p = kit.palette;
  const name = plain(kit.content?.productHunt.name ?? kit.brief.name);
  const tagline = plain(kit.content?.productHunt.tagline ?? kit.preview.tagline);
  const headline = plain(kit.content?.landing.headline ?? kit.brief.oneLiner);
  const features = (kit.content?.landing.features.map((f) => f.title) ?? kit.brief.features).slice(0, 3).map(plain);
  const domain = domainOf(kit);
  const scale = width / 1200;

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
    padding: 72 * scale,
  };

  const pill = (text: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12 * scale,
        padding: `${10 * scale}px ${22 * scale}px`,
        borderRadius: 999,
        backgroundColor: alpha(p.foreground, 0.08),
        border: `1px solid ${alpha(p.foreground, 0.16)}`,
        fontSize: 24 * scale,
        color: p.muted,
      }}
    >
      <div style={{ display: "flex", width: 12 * scale, height: 12 * scale, borderRadius: 999, backgroundColor: p.accent }} />
      {text}
    </div>
  );

  let body: React.ReactNode;
  if (variant === "og") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        <div style={{ display: "flex" }}>{pill(domain || "Now live")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 44, lineHeight: 1.25, color: alpha(p.foreground, 0.85), maxWidth: 980 }}>{tagline}</div>
        </div>
        <div style={{ display: "flex", height: 10, width: 220, borderRadius: 999, backgroundColor: p.accent }} />
      </div>
    );
  } else if (variant === "x") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", flex: 1, gap: 40 }}>
        {pill(name)}
        <div style={{ display: "flex", fontSize: 92, fontWeight: 700, letterSpacing: -2, lineHeight: 1.08, maxWidth: 1300, justifyContent: "center" }}>
          {headline}
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          {features.map((f) => (
            <div
              key={f}
              style={{ display: "flex", padding: "14px 28px", borderRadius: 999, backgroundColor: p.accent, color: p.accentForeground, fontSize: 32, fontWeight: 600 }}
            >
              {f}
            </div>
          ))}
        </div>
        {domain ? <div style={{ display: "flex", fontSize: 30, color: p.muted }}>{domain}</div> : null}
      </div>
    );
  } else {
    body = (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 42, color: alpha(p.foreground, 0.85), lineHeight: 1.25 }}>{tagline}</div>
        </div>
        <div style={{ display: "flex", gap: 28, flex: 1 }}>
          {features.map((f, i) => (
            <div
              key={f}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                flex: 1,
                padding: 36,
                borderRadius: 28,
                backgroundColor: alpha(p.foreground, 0.06),
                border: `2px solid ${alpha(p.accent, 0.55)}`,
              }}
            >
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: p.accent }}>{`0${i + 1}`}</div>
              <div style={{ display: "flex", fontSize: 38, fontWeight: 600, lineHeight: 1.2 }}>{f}</div>
            </div>
          ))}
        </div>
      </div>
    );
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
