import Link from "next/link";
import { BookOpenText, Code2, Gauge, MousePointerClick, Rewind, Sparkles } from "lucide-react";
import { HeroSortDemo } from "@/components/home/HeroSortDemo";
import { VisualizerCard } from "@/components/home/VisualizerCard";
import { Footer } from "@/components/layout/Footer";
import { VISUALIZERS, type VisualizerCategory } from "@/config/visualizers";

const CATEGORIES: VisualizerCategory[] = ["Algorithms", "Linear", "Trees", "Graphs"];

const FEATURES = [
  { icon: Rewind, title: "Step through time", text: "Play, pause, step backwards or scrub — every step is a full snapshot." },
  { icon: Code2, title: "Pseudocode in sync", text: "The exact line that is executing lights up as the animation runs." },
  { icon: BookOpenText, title: "Explains the why", text: "Each step says what happened and why the algorithm chose it." },
  { icon: MousePointerClick, title: "Your own input", text: "Type your own values, build graphs by hand or load presets." },
  { icon: Gauge, title: "Complexity at a glance", text: "Best, average and worst cases next to every visualization." },
  { icon: Sparkles, title: "Identity-preserving motion", text: "Elements glide to where they go, so you can follow every move." },
];

export default function Home() {
  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <section className="relative mt-8 overflow-hidden rounded-3xl border border-line bg-surface/60 px-6 py-12 text-center backdrop-blur sm:mt-12 sm:py-16">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-alt/15 blur-3xl" />
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-line-strong bg-bg-elev px-3 py-1 text-xs text-fg-dim">
            <Sparkles size={13} className="text-brand" /> Step-by-step, with pseudocode and explanations
          </p>
          <h1 className="text-gradient mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            See data structures &amp; algorithms think.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-fg-dim sm:text-lg">
            Watch merge sort split and merge, quick sort partition, AVL trees rotate, B-trees split and Dijkstra relax edges —
            one explained step at a time.
          </p>
          <div className="mt-8">
            <HeroSortDemo />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="#visualizers"
              className="rounded-full bg-gradient-to-r from-brand to-brand-alt px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Explore visualizers
            </Link>
            <Link href="/sorting" className="rounded-full border border-line-strong px-6 py-2.5 text-sm font-semibold text-fg hover:bg-surface-2">
              Start with sorting
            </Link>
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-2xl border border-line bg-surface/50 p-4">
              <Icon size={20} className="mt-0.5 shrink-0 text-brand" />
              <div>
                <h2 className="text-sm font-semibold text-fg">{title}</h2>
                <p className="mt-0.5 text-sm text-fg-dim">{text}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="visualizers" className="mt-16 scroll-mt-24">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-fg sm:text-3xl">Visualizers</h2>
              <p className="mt-1 text-sm text-fg-dim">Pick a structure or algorithm — every page has playback, pseudocode and explanations.</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] text-fg-faint">
              {CATEGORIES.map((c) => (
                <span key={c} className="rounded-full border border-line px-2.5 py-1">{c}</span>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {VISUALIZERS.map((v) => (
              <VisualizerCard key={v.slug} v={v} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
