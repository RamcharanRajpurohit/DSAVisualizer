import { absoluteUrl, SITE } from "@/config/site";
import { TOPICS } from "@/content/registry";
import { AGENT_TOOL_DOCS } from "@/content/agent-tools";

export const dynamic = "force-static";

/** Agent skills guide (linked from /.well-known/ai-catalog.json and /llms.txt). */
export function GET() {
  const lines = [
    `# ${SITE.name} (${SITE.alternateName}) — skills for AI agents`,
    "",
    SITE.description,
    "",
    "## Reading",
    `- Site map with one line per page: ${absoluteUrl("/llms.txt")}`,
    `- Full text of every page: ${absoluteUrl("/llms-full.txt")}`,
    `- Any page as Markdown: ${absoluteUrl("/md")}/<path>, e.g. ${absoluteUrl("/md/sorting/merge-sort")}`,
    "",
    "## Doing (WebMCP)",
    "Every page registers tools on `document.modelContext` (Chrome WebMCP). Site-wide tools: `list_visualizers`, `open_visualizer {path}`, `explain_topic {path}`.",
    "Open a page, then call its tools; results are short plain-text summaries.",
    "",
    ...AGENT_TOOL_DOCS.flatMap((g) => [`### ${g.page}`, "", ...g.tools.map((t) => `- \`${t.name}\`${t.args ? ` ${t.args}` : ""} — ${t.does}`), ""]),
    "## Pages",
    ...TOPICS.map((t) => `- [${t.h1}](${absoluteUrl(t.path)})`),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
