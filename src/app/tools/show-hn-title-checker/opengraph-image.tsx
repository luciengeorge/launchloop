import { ImageResponse } from "@vercel/og";
import { STATIC_OG_HEADERS } from "@/lib/seo";
import { HN_QUOTES } from "@/lib/show-hn-check";
import { SHOW_HN_CHECKER } from "@/lib/tools";

export const alt = SHOW_HN_CHECKER.imageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const EXAMPLE = "Show HN: Gridcast, turn a CSV into a dashboard you can share by link";

const checks = ["Starts with “Show HN”", "No uppercase or exclamation points", "No site name in the title"];

export default function ShowHnTitleCheckerOgImage() {
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
          backgroundImage: "radial-gradient(circle at 92% 8%, rgba(242,84,27,0.24) 0%, rgba(242,84,27,0) 50%)",
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

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>Show HN</div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, color: "#f2541b" }}>title checker</div>
        </div>

        <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>
          <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 10, backgroundColor: "#ffffff", border: "2px solid #e4e4e7", borderRadius: 24, padding: 28 }}>
            <div style={{ display: "flex", fontSize: 25, fontWeight: 700 }}>{EXAMPLE}</div>
            <div style={{ display: "flex", fontSize: 19, color: "#52525b" }}>{`“${HN_QUOTES.prefix.text}”`}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, fontSize: 22, color: "#3f3f46" }}>
            {checks.map((c) => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", width: 22, height: 22, borderRadius: 999, backgroundColor: "#10b981" }} />
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size, headers: STATIC_OG_HEADERS },
  );
}
