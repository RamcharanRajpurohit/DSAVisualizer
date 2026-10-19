import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "About — How AlgoLab Is Built and Checked",
  description:
    "Who builds AlgoLab (DSA Visualizer), how every animation and code sample is tested against the visualizer's own engine, and how to report a mistake.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-24 pt-14 text-[15.5px] leading-relaxed text-fg-dim sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "@id": `${absoluteUrl("/about")}#page`,
          url: absoluteUrl("/about"),
          name: "About AlgoLab",
          isPartOf: { "@id": `${SITE.url}/#website` },
          about: { "@id": `${SITE.url}/#website` },
          author: { "@id": `${SITE.url}/#author` },
        }}
      />
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-fg-faint">About</p>
      <h1 className="mt-3 font-serif text-5xl leading-tight text-fg">Learning algorithms by watching them run</h1>
      <p className="mt-5 text-lg text-fg">
        {SITE.name} — {SITE.alternateName} — is a free, open-source set of interactive visualizers for data structures and
        algorithms. Each page lets you run an algorithm on your own input and step through it one decision at a time, with the
        executing line of code highlighted and an explanation of <em>why</em> each step happens.
      </p>

      <h2 className="mt-12 font-serif text-3xl text-fg">Who makes it</h2>
      <p className="mt-3">
        AlgoLab is built and maintained by{" "}
        <a href={SITE.author.url} className="text-fg underline underline-offset-4" target="_blank" rel="noreferrer">
          {SITE.author.name}
        </a>
        . The project started as a small set of visualizations and grew into a complete study companion for the topics that
        come up in computer-science courses and coding interviews.
      </p>

      <h2 className="mt-12 font-serif text-3xl text-fg">How the content is checked</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          Every animation is recorded from a real implementation of the algorithm, so what you see is exactly what the code does.
        </li>
        <li>
          The Python, C++, Java and JavaScript code on each page is compiled and run against the visualizer&apos;s own engine on
          thousands of random inputs — including empty input, duplicates, sorted and reversed data — and must produce identical
          results.
        </li>
        <li>Complexity tables and explanations are reviewed against those tests and against standard textbook definitions.</li>
        <li>Quiz questions are generated from the structure on screen and their answers are verified by independent code.</li>
      </ul>

      <h2 className="mt-12 font-serif text-3xl text-fg">Found a mistake?</h2>
      <p className="mt-3">
        Please{" "}
        <a href={`${SITE.repo}/issues`} className="text-fg underline underline-offset-4" target="_blank" rel="noreferrer">
          open an issue on GitHub
        </a>
        . The full source code is public in the{" "}
        <a href={SITE.repo} className="text-fg underline underline-offset-4" target="_blank" rel="noreferrer">
          repository
        </a>
        .
      </p>

      <p className="mt-12">
        <Link href="/" className="font-mono text-sm text-fg underline underline-offset-4">← Back to all visualizers</Link>
      </p>
    </article>
  );
}
