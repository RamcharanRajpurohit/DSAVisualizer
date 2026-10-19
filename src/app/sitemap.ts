import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { VISUALIZERS } from "@/config/visualizers";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: "monthly", priority: 1 },
    ...VISUALIZERS.map((v) => ({ url: `${SITE.url}${v.href}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
