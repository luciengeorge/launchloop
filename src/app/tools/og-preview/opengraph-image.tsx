import { ImageResponse } from "@vercel/og";
import { STATIC_OG_HEADERS } from "@/lib/seo";
import { OG_IMAGE } from "@/lib/og-check";
import { OG_PREVIEW } from "@/lib/tools";

export const alt = OG_PREVIEW.imageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const checks = ["og:title and og:description", "Image is 1200×630", "twitter:card set"];

export default function OgPreviewOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#faf8f5",
          backgroundImage: "radial-gradient(circle at 8% 92%, rgba(242,84,27,0.22) 0%, rgba(242,84,27,0) 50%)",
          color: "#18181b",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
            <div style={{ display: "flex", width: 48, height: 48, borderRadius: 14, backgroundColor: "#18181b", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", width: 20, height: 20, borderRadius: 999, border: "4px solid #f2541b" }} />
            </div>
            LaunchLoop
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#52525b", border: "2px solid #e4e4e7", borderRadius: 999, padding: "8px 20px" }}>Free tool</div>
        </div>

        <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>OG image</div>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, color: "#f2541b" }}>preview</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24, fontSize: 24, color: "#3f3f46" }}>
              {checks.map((c) => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", width: 22, height: 22, borderRadius: 999, backgroundColor: "#10b981" }} />
                  {c}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 500, backgroundColor: "#ffffff", border: "2px solid #e4e4e7", borderRadius: 24, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                position: "relative",
                width: 500,
                height: 262,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#18181b",
                backgroundImage: "linear-gradient(135deg, #18181b 0%, #3f3f46 100%)",
                color: "#faf8f5",
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              Your app, shared well
              <div style={{ display: "flex", position: "absolute", right: 14, bottom: 14, fontSize: 18, fontWeight: 700, color: "#18181b", backgroundColor: "#f2541b", borderRadius: 999, padding: "4px 12px" }}>
                {`${OG_IMAGE.width}×${OG_IMAGE.height}`}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "18px 22px" }}>
              <div style={{ display: "flex", fontSize: 16, color: "#71717a", letterSpacing: 1 }}>YOUR-APP.COM</div>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>Turn your GitHub repo into a launch kit</div>
              <div style={{ display: "flex", fontSize: 18, color: "#52525b" }}>Launch copy and images, from your README and commits.</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, headers: STATIC_OG_HEADERS },
  );
}
