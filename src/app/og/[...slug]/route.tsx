import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";
import { getTopic, TOPICS } from "@/content/registry";
import { plainText } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.path.slice(1).split("/") }));
}

const BARS = [38, 62, 24, 80, 52, 92, 30, 70, 46, 86];

/** 1200×630 share image per topic, in the site's paper-and-ink style. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const topic = getTopic(`/${slug.join("/")}`);
  const title = topic?.h1 ?? SITE.name;
  const blurb = topic ? plainText(topic.summary).split(/(?<=\.)\s/)[0] : SITE.tagline;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#efe8dd", color: "#1a1a1a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30 }}>
          <div style={{ display: "flex", fontWeight: 700 }}>{SITE.name}</div>
          <div style={{ display: "flex", color: "#8c8478", fontSize: 26 }}>algolab.rajpurohit.me</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, maxWidth: 1000 }}>{title}</div>
          <div style={{ fontSize: 30, color: "#4b463f", marginTop: 22, maxWidth: 980, lineHeight: 1.3 }}>{blurb}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 110 }}>
          {BARS.map((h, i) => (
            <div
              key={i}
              style={{
                width: 42, height: h * 1.1, borderRadius: 8,
                background: i === 5 || i === 6 ? "#dce8ff" : i > 7 ? "#d9f2e1" : "#fffdf8",
                border: `3px solid ${i === 5 || i === 6 ? "#2563eb" : i > 7 ? "#16a34a" : "#2a2a2a"}`,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
