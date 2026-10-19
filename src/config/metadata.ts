import type { Metadata } from "next";
import { getVisualizer } from "./visualizers";

/** Per-page metadata generated from the visualizer registry. */
export function visualizerMetadata(slug: string): Metadata {
  const v = getVisualizer(slug);
  return {
    title: `${v.title} Visualizer`,
    description: v.description,
    alternates: { canonical: v.href },
    openGraph: { title: `${v.title} Visualizer`, description: v.description, url: v.href },
  };
}
