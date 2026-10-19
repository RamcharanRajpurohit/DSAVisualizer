import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";

export const alt = `${SITE.name} — learn data structures and algorithms visually`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BARS = [38, 62, 24, 80, 52, 92, 30, 70, 46, 86];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: 72, background: "#efe8dd", color: "#1a1a1a",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>
          DSA Visualizer
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 80, fontWeight: 500, lineHeight: 1.05, maxWidth: 900 }}>Watch algorithms think.</div>
          <div style={{ fontSize: 30, color: "#4b463f", marginTop: 20 }}>Step-by-step animations · pseudocode · explanations</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 120 }}>
          {BARS.map((h, i) => (
            <div
              key={i}
              style={{
                width: 44, height: h * 1.2, borderRadius: 8,
                background: i === 5 || i === 6 ? "#dce8ff" : i > 7 ? "#d9f2e1" : "#fffdf8",
                border: `3px solid ${i === 5 || i === 6 ? "#2563eb" : i > 7 ? "#16a34a" : "#2a2a2a"}`,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
