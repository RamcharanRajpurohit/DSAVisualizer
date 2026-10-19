"use client";

import { useRouter } from "next/navigation";
import { VISUALIZERS } from "@/config/visualizers";
import { useAgentTools } from "@/lib/hooks/useAgentTools";

/** Site-wide WebMCP tools, available on every page. */
export function SiteAgentTools() {
  const router = useRouter();

  useAgentTools([
    {
      name: "list_visualizers",
      description:
        "List the interactive data-structure and algorithm visualizers on this site (sorting, stack & queue, linked list, heap, BST, AVL, B-tree, graph algorithms) with their URLs. For every individual algorithm page, fetch /llms.txt.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => VISUALIZERS.map((v) => ({ title: v.title, path: v.href, about: v.tagline })),
    },
    {
      name: "open_visualizer",
      description:
        "Navigate this tab to a visualizer page, e.g. '/sorting/merge-sort', '/graph/dijkstra' or '/heap'. Use list_visualizers or /llms.txt to find paths.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string", description: "Site path starting with '/', e.g. /sorting/quick-sort" } },
        required: ["path"],
        additionalProperties: false,
      },
      execute: ({ path }: { path?: unknown }) => {
        if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return "Error: path must start with '/'.";
        router.push(path);
        return `Opening ${path}`;
      },
    },
    {
      name: "explain_topic",
      description:
        "Get the written explanation of a topic as Markdown: definition, how it works, complexity table, reference code and FAQ. Pass a page path such as '/sorting/merge-sort' or '/avl-tree'.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string", description: "Topic page path, e.g. /graph/dijkstra" } },
        required: ["path"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async ({ path }: { path?: unknown }) => {
        if (typeof path !== "string" || !/^\/[a-z0-9/-]+$/.test(path)) return "Error: give a path like /sorting/merge-sort.";
        const res = await fetch(`/md${path}`);
        if (!res.ok) return `No written page for ${path}. Try list_visualizers.`;
        return res.text();
      },
    },
  ]);

  return null;
}
