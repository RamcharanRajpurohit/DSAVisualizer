import { getTopic, TOPICS } from "@/content/registry";
import { topicMarkdown } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.path.slice(1).split("/") }));
}

/** Markdown copy of a topic page (linked from llms.txt), e.g. /md/sorting/merge-sort. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const topic = getTopic(`/${slug.join("/")}`);
  if (!topic) return new Response("Not found", { status: 404 });
  return new Response(topicMarkdown(topic, (p) => getTopic(p)?.h1), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
