import { SITE } from "@/config/site";
import { TOPICS } from "@/content/registry";

export const dynamic = "force-static";

/** Agentic Resource Discovery (ARD) catalog, spec 1.0 — validated by Lighthouse's "ard-schema" audit. */
export function GET() {
  const host = new URL(SITE.url).host;
  const updatedAt = `${TOPICS.reduce<string>((d, t) => (t.updated > d ? t.updated : d), SITE.published)}T00:00:00Z`;
  const catalog = {
    specVersion: "1.0",
    host: { displayName: `${SITE.name} (${SITE.alternateName})`, documentationUrl: `${SITE.url}/llms.txt`, logoUrl: `${SITE.url}/icon.svg` },
    entries: [
      {
        identifier: `urn:air:${host}:dsa:visualizer-skills`,
        displayName: `${SITE.alternateName} DSA Visualizer — agent skills`,
        type: 'text/markdown; profile="urn:air:agent-skills"',
        url: `${SITE.url}/agent-skills.md`,
        description:
          "How an AI agent can use this site: page map, WebMCP tools on every visualizer (sort arrays, run graph algorithms, insert into trees and heaps, convert infix to postfix…) and Markdown explanations of every topic.",
        tags: ["education", "algorithms", "data-structures", "visualization", "webmcp"],
        capabilities: ["list_visualizers", "open_visualizer", "explain_topic", "sort_array", "run_algorithm", "tree_insert", "heap_insert", "convert_infix_to_postfix"],
        representativeQueries: [
          "visualize merge sort step by step",
          "show how Dijkstra's algorithm works on a graph",
          "animate AVL tree rotations",
          "convert infix to postfix with steps",
          "explain heap sort with an example",
        ],
        version: "2.0.0",
        updatedAt,
      },
    ],
  };
  return new Response(JSON.stringify(catalog, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
