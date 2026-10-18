import { ImageResponse } from "@vercel/og";
import { STATIC_OG_HEADERS } from "@/lib/seo";
import { SITE } from "@/lib/site";

export type ShareCard = { eyebrow: string; headline: string };

export const OG_CARD_SIZE = { width: 1200, height: 630 };

/** The branded 1200×630 share image for pages without a bespoke opengraph-image file. */
export function renderShareCard({ eyebrow, headline }: ShareCard): ImageResponse {
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
          backgroundImage: "radial-gradient(circle at 90% 10%, rgba(242,84,27,0.24) 0%, rgba(242,84,27,0) 55%)",
          color: "#18181b",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 36, fontWeight: 700 }}>
            <div style={{ display: "flex", width: 56, height: 56, borderRadius: 16, backgroundColor: "#18181b", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", width: 24, height: 24, borderRadius: 999, border: "5px solid #f2541b" }} />
            </div>
            {SITE.name}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#52525b", border: "2px solid #e4e4e7", borderRadius: 999, padding: "8px 22px" }}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: -2, lineHeight: 1.08, maxWidth: 1000 }}>{headline}</div>
        <div style={{ display: "flex", fontSize: 28, color: "#52525b" }}>launchloop.dev</div>
      </div>
    ),
    { ...OG_CARD_SIZE, headers: STATIC_OG_HEADERS },
  );
}
