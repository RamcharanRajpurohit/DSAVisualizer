import type { Metadata } from "next";
import Link from "next/link";
import { DemoVideo } from "@/components/home/DemoVideo";
import { HeroSortDemo } from "@/components/home/HeroSortDemo";
import { VisualizerCard } from "@/components/home/VisualizerCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, SITE } from "@/config/site";
import { TOUR } from "@/config/tour";
import { VISUALIZERS } from "@/config/visualizers";
import { childTopics, getTopic } from "@/content/registry";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} (${SITE.alternateName}) — Learn Algorithms Visually` },
  description: SITE.description,
  alternates: { canonical: "/" },
};

const HOME_FAQS = [
  {
    q: "What is a DSA visualizer?",
    a: "A DSA visualizer animates data structures and algorithms one step at a time, so you can see every comparison, swap, pointer change or rotation instead of imagining it. This one also highlights the matching line of code and explains why each step happens.",
  },
  {
    q: "Which algorithms and data structures can I visualize?",
    a: "Eight sorting algorithms (bubble, selection, insertion, shell, counting, radix, merge, quick), stacks, queues, circular queues, deques, linked lists, binary heaps and heap sort, binary search trees, AVL trees, B-trees, and graph algorithms: BFS, DFS, Dijkstra, Bellman-Ford, Kruskal, Prim, topological sort and strongly connected components.",
  },
  {
    q: "Can I use my own input?",
    a: "Yes. Every visualizer accepts your own values (whole numbers from 0 to 999), offers presets and random data, and you can build your own graph by clicking. Leave the box empty and it picks a random value for you.",
  },
  {
    q: "Does it show real code?",
    a: "Yes. Each page shows pseudocode that highlights the line being executed, plus tested implementations in Python, C++, Java and JavaScript that you can copy.",
  },
  {
    q: "Is it free?",
    a: "Yes — it is free, needs no sign-up, and runs entirely in your browser.",
  },
  {
    q: "Can AI agents use this site?",
    a: "Yes. Pages expose WebMCP tools so browser agents can run visualizations directly, and a Markdown copy of every explanation is listed in /llms.txt.",
  },
];

export default function Home() {
  const hubs = VISUALIZERS.map((v) => ({ v, topic: getTopic(v.href), children: childTopics(v.href) }));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              "@id": `${SITE.url}/#home`,
              url: SITE.url,
              name: `${SITE.name} (${SITE.alternateName})`,
              description: SITE.description,
              isPartOf: { "@id": `${SITE.url}/#website` },
              mainEntity: {
                "@type": "ItemList",
                itemListElement: VISUALIZERS.map((v, i) => ({ "@type": "ListItem", position: i + 1, name: v.title, url: absoluteUrl(v.href) })),
              },
            },
            {
              "@type": "VideoObject",
              "@id": `${SITE.url}/#tour`,
              name: TOUR.title,
              description: TOUR.description,
              thumbnailUrl: [absoluteUrl(TOUR.poster)],
              uploadDate: TOUR.uploadDate,
              duration: TOUR.duration,
              contentUrl: absoluteUrl(TOUR.sources[1].src),
              width: TOUR.width,
              height: TOUR.height,
              inLanguage: SITE.language,
              isFamilyFriendly: true,
              author: { "@id": `${SITE.url}/#author` },
              publisher: { "@id": `${SITE.url}/#author` },
            },
            {
              "@type": "FAQPage",
              "@id": `${SITE.url}/#faq`,
              mainEntity: HOME_FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
          ],
        }}
      />

      <section className="pb-6 pt-14 text-center sm:pt-20">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-fg-faint">{SITE.name} · Data structures &amp; algorithms</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-serif text-5xl leading-[1.05] text-fg sm:text-7xl">
          Watch algorithms <em className="italic">think</em>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-fg-dim sm:text-lg">
          Step through every comparison, swap, split and rotation — with the code that does it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/sorting" className="rounded-full bg-fg px-6 py-2.5 text-sm font-medium text-bg-elev transition hover:bg-[#333]">
            Start with sorting
          </Link>
          <Link href="#visualizers" className="rounded-full border border-line-strong px-6 py-2.5 text-sm font-medium text-fg transition hover:bg-surface">
            All visualizers
          </Link>
        </div>
        <div className="mt-14">
          <HeroSortDemo />
        </div>
      </section>

      <section id="tour" className="mt-16 scroll-mt-24" aria-labelledby="tour-title">
        <div className="mb-5 flex items-end justify-between gap-3 border-b border-line pb-4">
          <h2 id="tour-title" className="font-serif text-4xl text-fg">The 50-second tour</h2>
          <span className="font-mono text-xs text-fg-faint">no sound needed</span>
        </div>
        <DemoVideo />
      </section>

      <section id="visualizers" className="mt-20 scroll-mt-24" aria-labelledby="visualizers-title">
        <div className="mb-6 flex items-end justify-between gap-3 border-b border-line pb-4">
          <h2 id="visualizers-title" className="font-serif text-4xl text-fg">Visualizers</h2>
          <span className="font-mono text-xs text-fg-faint">{VISUALIZERS.length} topics</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {VISUALIZERS.map((v) => (
            <VisualizerCard key={v.slug} v={v} />
          ))}
        </div>
      </section>

      <section className="mt-20" aria-labelledby="topics-title">
        <h2 id="topics-title" className="border-b border-line pb-4 font-serif text-4xl text-fg">Every algorithm, one click away</h2>
        <div className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {hubs.map(({ v, topic, children }) => (
            <div key={v.slug}>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-faint">
                <Link href={v.href} className="hover:text-fg">{topic?.name ?? v.title}</Link>
              </h3>
              <ul className="mt-2 space-y-1.5 text-[15px]">
                <li>
                  <Link href={v.href} className="text-fg hover:underline">{topic?.h1 ?? v.title}</Link>
                </li>
                {children.map((c) => (
                  <li key={c.path}>
                    <Link href={c.path} className="text-fg-dim hover:text-fg hover:underline">{c.h1}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl" aria-labelledby="faq-title">
        <h2 id="faq-title" className="border-b border-line pb-4 font-serif text-4xl text-fg">Questions</h2>
        <div className="divide-y divide-line">
          {HOME_FAQS.map((f) => (
            <div key={f.q} className="py-5">
              <h3 className="text-base font-semibold text-fg">{f.q}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-fg-dim">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
