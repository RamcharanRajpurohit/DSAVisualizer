/**
 * One record per topic page. The same data renders the on-page article, the page metadata,
 * the JSON-LD, the sitemap entry, llms.txt and the Markdown copy for AI agents — so humans,
 * search engines and agents always see the same, consistent content.
 *
 * Text fields use the site's light markup: **bold**, `code`, and in `body` blank-line separated
 * paragraphs plus "- " bullet lines.
 */
export type TopicPath = `/${string}`;

export interface TopicSection {
  heading: string;
  body: string;
}

export interface TopicFaq {
  q: string;
  a: string;
}

export interface TopicComplexity {
  label: string;
  time: string;
  space?: string;
  note?: string;
}

export interface TopicContent {
  /** Canonical path, e.g. "/sorting/merge-sort". */
  path: TopicPath;
  /** Hub page this belongs to (for breadcrumbs / related links), e.g. "/sorting". */
  parent?: TopicPath;
  /** Short display name: "Merge Sort". */
  name: string;
  /** <title> without the site suffix; ≤ 55 characters, keyword first ("Merge Sort Visualizer — Step by Step"). */
  title: string;
  /** Visible page heading (the visualizer title). */
  h1: string;
  /** Meta description: 140–160 characters, answer-first, includes the main keyword once. */
  description: string;
  /** 3–8 search phrases this page should rank for (used for internal QA, not stuffed into HTML). */
  keywords: readonly string[];
  /** Heading above the summary; defaults to "What is {name}?" (hubs: "What are sorting algorithms?"). */
  question?: string;
  /** 2–3 sentence direct definition — shown first, quotable by search features and AI answers. */
  summary: string;
  /** "How it works" as an ordered list of short steps. */
  steps?: readonly string[];
  /** 3–6 sections of genuinely useful explanation. */
  sections: readonly TopicSection[];
  complexity?: readonly TopicComplexity[];
  /** One reference implementation shown in the article (Python preferred). */
  code?: { language: "python" | "javascript" | "java" | "cpp"; source: string };
  /** 4–6 real questions people search for, answered in 1–3 sentences. */
  faqs: readonly TopicFaq[];
  /** Paths of closely related topics (internal links). */
  related: readonly TopicPath[];
  /** ISO date of the last meaningful content update. */
  updated: string;
}
