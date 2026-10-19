import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicArticle } from "@/components/seo/TopicArticle";
import { childSlugs, getTopic } from "@/content/registry";
import { BTreeVisualizer, type BTreeExample } from "@/features/btree/BTreeVisualizer";
import { topicMetadata } from "@/lib/seo";

const HUB = "/btree";

/** Which preloaded example each sub-page opens with. */
const EXAMPLES: Record<string, BTreeExample> = {
  insertion: "insertion",
  deletion: "deletion",
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
      <BTreeVisualizer heading={topic.h1} example={example} />
      <TopicArticle topic={topic} />
    </>
  );
}
