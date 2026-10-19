import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicArticle } from "@/components/seo/TopicArticle";
import { childSlugs, getTopic } from "@/content/registry";
import { AVLVisualizer, type AvlExample } from "@/features/bst/AVLVisualizer";
import { topicMetadata } from "@/lib/seo";

const HUB = "/avl-tree";

/** Which preloaded example each sub-page opens with. */
const EXAMPLES: Record<string, AvlExample> = {
  rotations: "rotations",
};

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return childSlugs(HUB).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(`${HUB}/${slug}`);
  return topic ? topicMetadata(topic) : {};
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const topic = getTopic(`${HUB}/${slug}`);
  const example = EXAMPLES[slug];
  if (!topic || !example) notFound();
  return (
    <>
      <AVLVisualizer heading={topic.h1} example={example} />
      <TopicArticle topic={topic} />
    </>
  );
}
