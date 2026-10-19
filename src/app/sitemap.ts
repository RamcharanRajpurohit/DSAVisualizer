import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { TOPICS } from "@/content/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const newest = TOPICS.reduce((d, t) => (t.updated > d ? t.updated : d), "2026-10-19");
  return [
    { url: absoluteUrl("/"), lastModified: newest, changeFrequency: "weekly", priority: 1 },
    ...TOPICS.map((t) => ({
      url: absoluteUrl(t.path),
      lastModified: t.updated,
      changeFrequency: "monthly" as const,
      priority: t.parent ? 0.8 : 0.9,
    })),
    { url: absoluteUrl("/about"), lastModified: newest, changeFrequency: "yearly", priority: 0.4 },
  ];
}
