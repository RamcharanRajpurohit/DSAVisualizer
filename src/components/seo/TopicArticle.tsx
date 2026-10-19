import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { getTopic } from "@/content/registry";
import type { TopicContent } from "@/content/types";
import { breadcrumbTrail, topicJsonLd } from "@/lib/seo";
import { JsonLd } from "./JsonLd";

/** Inline markup: **bold** and `code` (server-rendered, no HTML injection). */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*.+?\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(
      tok.startsWith("**") ? (
        <strong key={m.index} className="font-semibold text-fg">{tok.slice(2, -2)}</strong>
      ) : (
        <code key={m.index} className="rounded bg-surface-2 px-1 py-px font-mono text-[0.88em]">{tok.slice(1, -1)}</code>
      ),
    );
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Body markup: blank-line separated paragraphs and "- " bullet lists. */
function Body({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="my-3 list-disc space-y-1.5 pl-5">
              {lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}
            </ul>
          );
        }
        return <p key={i} className="my-3">{inline(lines.join(" "))}</p>;
      })}
    </>
  );
}

/**
 * The crawlable half of a visualizer page: a server-rendered article below the interactive
 * workspace. Answer-first summary, steps, explanation, complexity, code, FAQ, related links —
 * plus the matching JSON-LD. Humans who scroll get a proper study page; search engines and
 * AI agents get real text instead of an empty client app.
 */
export function TopicArticle({ topic }: { topic: TopicContent }) {
  const parent = topic.parent ? getTopic(topic.parent) : undefined;
  const trail = breadcrumbTrail(topic, parent);
  const related = topic.related.map((p) => getTopic(p)).filter((t): t is TopicContent => !!t);
  const updated = new Date(`${topic.updated}T00:00:00Z`);

  return (
    <article className="mx-auto w-full max-w-3xl px-5 pb-24 pt-14 text-[15.5px] leading-relaxed text-fg-dim sm:px-6" aria-labelledby="topic-article-title">
      <JsonLd data={topicJsonLd(topic, parent)} />

      <nav aria-label="Breadcrumb" className="mb-6 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-faint">
        <ol className="flex flex-wrap items-center gap-1.5">
          {trail.map((t, i) => (
            <li key={t.path} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {i < trail.length - 1 ? (
                <Link href={t.path} className="hover:text-fg">{t.name}</Link>
              ) : (
                <span aria-current="page" className="text-fg-dim">{t.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <h2 id="topic-article-title" className="font-serif text-4xl leading-tight text-fg sm:text-5xl">
        {topic.question ?? `What is ${topic.name}?`}
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-fg">{inline(topic.summary)}</p>

      {topic.steps && topic.steps.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-3xl text-fg">How it works</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 marker:font-mono marker:text-fg-faint">
            {topic.steps.map((s, i) => <li key={i} className="pl-1">{inline(s)}</li>)}
          </ol>
        </section>
      )}

      {topic.sections.map((s) => (
        <section key={s.heading} className="mt-10">
          <h2 className="font-serif text-3xl text-fg">{s.heading}</h2>
          <Body text={s.body} />
        </section>
      ))}

      {topic.complexity && topic.complexity.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-3xl text-fg">Time and space complexity</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line font-mono text-[11px] uppercase tracking-wider text-fg-faint">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Case</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Time</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Space</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Why</th>
                </tr>
              </thead>
              <tbody>
                {topic.complexity.map((c) => (
                  <tr key={c.label} className="border-t border-line first:border-t-0">
                    <th scope="row" className="px-4 py-2.5 font-medium text-fg">{c.label}</th>
                    <td className="px-4 py-2.5 font-mono">{c.time}</td>
                    <td className="px-4 py-2.5 font-mono">{c.space ?? "—"}</td>
                    <td className="px-4 py-2.5 text-[13.5px]">{c.note ? inline(c.note) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {topic.code && (
        <section className="mt-10">
          <h2 className="font-serif text-3xl text-fg">
            {topic.name} in {{ python: "Python", javascript: "JavaScript", java: "Java", cpp: "C++" }[topic.code.language]}
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-bg-elev p-4 font-mono text-[13px] leading-relaxed text-fg">
            <code>{topic.code.source.trim()}</code>
          </pre>
          <p className="mt-2 text-sm text-fg-faint">The visualizer above shows the same code in Python, C++, Java and JavaScript.</p>
        </section>
      )}

      {topic.faqs.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-3xl text-fg">Frequently asked questions</h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {topic.faqs.map((f) => (
              <Fragment key={f.q}>
                <div className="py-4">
                  <h3 className="text-base font-semibold text-fg">{f.q}</h3>
                  <p className="mt-1.5">{inline(f.a)}</p>
                </div>
              </Fragment>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-3xl text-fg">Keep learning</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.path}>
                <Link
                  href={r.path}
                  className="block rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <span className="block font-serif text-xl text-fg">{r.h1}</span>
                  <span className="mt-1 block text-sm text-fg-dim">{r.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-12 font-mono text-xs text-fg-faint">
        Last updated <time dateTime={topic.updated}>{updated.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>
      </p>
    </article>
  );
}
