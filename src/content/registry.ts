import { GRAPH_TOPICS } from "./topics/graph";
import { HEAP_TOPICS } from "./topics/heap";
import { LINKED_LIST_TOPICS } from "./topics/linked-list";
import { SORTING_TOPICS } from "./topics/sorting";
import { STACK_QUEUE_TOPICS } from "./topics/stack-queue";
import { TREES_TOPICS } from "./topics/trees";
import type { TopicContent, TopicPath } from "./types";

/** Every topic page on the site (hubs and sub-pages). */
export const TOPICS: readonly TopicContent[] = [
  ...SORTING_TOPICS,
  ...STACK_QUEUE_TOPICS,
  ...LINKED_LIST_TOPICS,
  ...HEAP_TOPICS,
  ...TREES_TOPICS,
  ...GRAPH_TOPICS,
];

const byPath = new Map<string, TopicContent>(TOPICS.map((t) => [t.path, t]));

export const getTopic = (path: TopicPath | string): TopicContent | undefined => byPath.get(path);

/** Sub-pages of a hub, in registry order. */
export const childTopics = (parent: TopicPath): TopicContent[] => TOPICS.filter((t) => t.parent === parent);

/** Slugs for a hub's `[slug]` route (e.g. "/sorting" → ["merge-sort", …]). */
export const childSlugs = (parent: TopicPath): string[] =>
  childTopics(parent).map((t) => t.path.slice(parent.length + 1));
