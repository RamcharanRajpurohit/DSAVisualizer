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
          padding: 72, background: "linear-gradient(135deg, #07070a 0%, #10101a 60%, #1b0f2e 100%)", color: "#ececf1",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>
          DSA<span style={{ color: "#00f2ff" }}>Visualizer</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 900 }}>See data structures &amp; algorithms think.</div>
          <div style={{ fontSize: 30, color: "#a3a3b2", marginTop: 20 }}>Step-by-step animations · pseudocode · explanations</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 120 }}>
          {BARS.map((h, i) => (
            <div
              key={i}
              style={{
                width: 44, height: h * 1.2, borderRadius: 8,
                background: i === 5 || i === 6 ? "#0b6fb8" : i > 7 ? "#00a854" : "#454552",
                border: `3px solid ${i === 5 || i === 6 ? "#5ab4ff" : i > 7 ? "#5cffa8" : "#6c6c78"}`,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
