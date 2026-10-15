import { ImageResponse } from "@vercel/og";
import { charLength } from "@/lib/limits";
import { TAGLINE_LIMIT } from "@/lib/tagline-check";
import { TAGLINE_CHECKER } from "@/lib/tools";

export const alt = TAGLINE_CHECKER.imageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const EXAMPLE = "Turn your GitHub repo into a launch kit";

const checks = ["Fits in 60 characters", "No vague hype words", "Doesn't repeat the name"];

export default function TaglineCheckerOgImage() {
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
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>Product Hunt</div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, color: "#f2541b" }}>tagline checker</div>
        </div>

        <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>
          <div style={{ display: "flex", flex: 1, gap: 20, alignItems: "center", backgroundColor: "#ffffff", border: "2px solid #e4e4e7", borderRadius: 24, padding: 28 }}>
            <div style={{ display: "flex", width: 72, height: 72, borderRadius: 16, backgroundColor: "rgba(242,84,27,0.12)", color: "#f2541b", fontSize: 38, fontWeight: 700, alignItems: "center", justifyContent: "center" }}>L</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>LaunchLoop</div>
              <div style={{ display: "flex", fontSize: 26, color: "#52525b" }}>{EXAMPLE}</div>
            </div>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: "#047857", backgroundColor: "rgba(16,185,129,0.12)", borderRadius: 999, padding: "8px 16px" }}>
              {`${charLength(EXAMPLE)} / ${TAGLINE_LIMIT}`}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, fontSize: 24, color: "#3f3f46" }}>
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
    size,
  );
}
