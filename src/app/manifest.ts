import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.alternateName}`,
    short_name: SITE.alternateName,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#efe8dd",
    theme_color: "#efe8dd",
    categories: ["education", "developer", "productivity"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
