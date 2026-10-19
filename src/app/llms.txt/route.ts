import { absoluteUrl, SITE } from "@/config/site";
import { TOPICS } from "@/content/registry";
import { plainText } from "@/lib/seo";

export const dynamic = "force-static";

/** llms.txt (llmstxt.org): a concise Markdown map of the site for AI agents. */
export function GET() {
  const hubs = TOPICS.filter((t) => !t.parent);
  const lines = [
    `# ${SITE.name} (${SITE.alternateName})`,
    "",
    `> ${SITE.description}`,
    "",
    "Every page pairs an interactive, step-by-step visualizer with a written explanation, complexity table, reference code and FAQ. Pages also expose WebMCP tools (document.modelContext) so browser agents can run the visualizations directly.",
    "",
  ];
  for (const hub of hubs) {
    lines.push(`## ${hub.name}`, "", `- [${hub.h1}](${absoluteUrl(hub.path)}): ${plainText(hub.description)} ([Markdown](${absoluteUrl(`/md${hub.path}`)}))`);
    for (const t of TOPICS.filter((x) => x.parent === hub.path)) {
      lines.push(`- [${t.h1}](${absoluteUrl(t.path)}): ${plainText(t.description)} ([Markdown](${absoluteUrl(`/md${t.path}`)}))`);
    }
    lines.push("");
  }
  lines.push("## Optional", "", `- [Agent skills: WebMCP tools on each page](${absoluteUrl("/agent-skills.md")})`, `- [Full text of every page](${absoluteUrl("/llms-full.txt")})`, `- [About the author](${absoluteUrl("/about")})`, `- [Source code](${SITE.repo})`, "");
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
