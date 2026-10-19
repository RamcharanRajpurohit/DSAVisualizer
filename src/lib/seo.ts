import type { Metadata } from "next";
import { absoluteUrl, SITE } from "@/config/site";
import type { TopicContent } from "@/content/types";

/** Drop the light markup (**bold**, `code`) for plain-text contexts like meta tags and JSON-LD. */
export const plainText = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\s+/g, " ").trim();

const ogImage = (path: string) => `/og${path === "/" ? "" : path}`;

/** Metadata for a topic page: canonical, Open Graph, Twitter. */
export function topicMetadata(topic: TopicContent): Metadata {
  const image = { url: ogImage(topic.path), width: 1200, height: 630, alt: topic.h1 };
  return {
    title: topic.title,
    description: topic.description,
    alternates: { canonical: topic.path },
    openGraph: {
      type: "article",
      siteName: SITE.name,
      locale: SITE.locale,
      title: topic.title,
      description: topic.description,
      url: topic.path,
      modifiedTime: topic.updated,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: topic.title, description: topic.description, images: [image.url] },
  };
}

const siteIds = {
  website: `${SITE.url}/#website`,
  author: `${SITE.url}/#author`,
};

/** Site-wide graph: the website and its author. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": siteIds.website,
        url: SITE.url,
        name: SITE.name,
        alternateName: [SITE.alternateName, `${SITE.alternateName} DSA Visualizer`],
        description: SITE.description,
        inLanguage: SITE.language,
        publisher: { "@id": siteIds.author },
      },
      {
        "@type": "Person",
        "@id": siteIds.author,
        name: SITE.author.name,
        url: SITE.author.url,
        sameAs: SITE.author.sameAs,
      },
    ],
  };
}

/** Breadcrumb trail Home → hub → page. */
export function breadcrumbTrail(topic: TopicContent, parent?: TopicContent) {
  const trail = [{ name: "Home", path: "/" }];
  if (parent) trail.push({ name: parent.name, path: parent.path });
  trail.push({ name: topic.name, path: topic.path });
  return trail;
}

/** Page graph for a topic: LearningResource web page, the interactive app, breadcrumbs and FAQ. */
export function topicJsonLd(topic: TopicContent, parent?: TopicContent) {
  const url = absoluteUrl(topic.path);
  const trail = breadcrumbTrail(topic, parent);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["WebPage", "LearningResource"],
        "@id": `${url}#page`,
        url,
        name: topic.title,
        headline: topic.h1,
        description: topic.description,
        abstract: plainText(topic.summary),
        inLanguage: SITE.language,
        isPartOf: { "@id": siteIds.website },
        about: { "@type": "Thing", name: topic.name },
        teaches: topic.name,
        keywords: topic.keywords.join(", "),
        learningResourceType: ["Interactive visualization", "Tutorial"],
        educationalLevel: "Beginner to intermediate",
        isAccessibleForFree: true,
        audience: { "@type": "EducationalAudience", educationalRole: "student" },
        datePublished: SITE.published,
        dateModified: topic.updated,
        author: { "@id": siteIds.author },
        publisher: { "@id": siteIds.author },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        image: absoluteUrl(ogImage(topic.path)),
        hasPart: { "@id": `${url}#app` },
      },
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: topic.h1,
        url,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Any (runs in the browser)",
        browserRequirements: "Requires JavaScript",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: absoluteUrl(t.path) })),
      },
      ...(topic.faqs.length
        ? [
            {
              "@type": "FAQPage",
              "@id": `${url}#faq`,
              mainEntity: topic.faqs.map((f) => ({
                "@type": "Question",
                name: plainText(f.q),
                acceptedAnswer: { "@type": "Answer", text: plainText(f.a) },
              })),
            },
          ]
        : []),
    ],
  };
}

/** The same topic as clean Markdown (for /md/* and llms-full.txt). */
export function topicMarkdown(topic: TopicContent, titleOf: (path: string) => string | undefined): string {
  const lines: string[] = [`# ${topic.h1}`, "", `> ${plainText(topic.summary)}`, "", `Interactive version: ${absoluteUrl(topic.path)}`, ""];
  if (topic.steps?.length) {
    lines.push("## How it works", "", ...topic.steps.map((s, i) => `${i + 1}. ${s}`), "");
  }
  for (const s of topic.sections) lines.push(`## ${s.heading}`, "", s.body.trim(), "");
  if (topic.complexity?.length) {
    lines.push("## Complexity", "", "| Case | Time | Space |", "| --- | --- | --- |");
    for (const c of topic.complexity) lines.push(`| ${c.label} | ${c.time} | ${c.space ?? "—"} |`);
    lines.push("");
  }
  if (topic.code) lines.push("## Code", "", "```" + topic.code.language, topic.code.source.trim(), "```", "");
  if (topic.faqs.length) {
    lines.push("## FAQ", "");
    for (const f of topic.faqs) lines.push(`### ${f.q}`, "", f.a, "");
  }
  if (topic.related.length) {
    lines.push("## Related", "");
    for (const p of topic.related) lines.push(`- [${titleOf(p) ?? p}](${absoluteUrl(p)})`);
    lines.push("");
  }
  lines.push(`_Last updated ${topic.updated}._`, "");
  return lines.join("\n");
}
