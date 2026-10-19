import { SITE } from "@/config/site";
import { getTopic, TOPICS } from "@/content/registry";
import { topicMarkdown } from "@/lib/seo";

export const dynamic = "force-static";

/** All topic pages as one Markdown document, for agents that want everything in one fetch. */
export function GET() {
  const titleOf = (p: string) => getTopic(p)?.h1;
  const body = [`# ${SITE.name} (${SITE.alternateName}) — full content`, "", SITE.description, "", ...TOPICS.map((t) => topicMarkdown(t, titleOf))].join("\n\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
