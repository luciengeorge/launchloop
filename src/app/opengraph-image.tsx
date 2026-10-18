import { ImageResponse } from "@vercel/og";
import { STATIC_OG_HEADERS } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          backgroundColor: "#faf8f5",
          backgroundImage: "radial-gradient(circle at 90% 10%, rgba(242,84,27,0.28) 0%, rgba(242,84,27,0) 55%)",
          color: "#18181b",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 36, fontWeight: 700 }}>
          <div style={{ display: "flex", width: 56, height: 56, borderRadius: 16, backgroundColor: "#18181b", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", width: 24, height: 24, borderRadius: 999, border: "5px solid #f2541b" }} />
          </div>
          LaunchLoop
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>Paste your repo.</div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, color: "#f2541b" }}>Get your whole launch.</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#52525b" }}>Landing copy · Product Hunt post · X thread · LinkedIn · OG images</div>
      </div>
    ),
    { ...size, headers: STATIC_OG_HEADERS },
  );
}
