import Link from "next/link";
import { HeroSortDemo } from "@/components/home/HeroSortDemo";
import { VisualizerCard } from "@/components/home/VisualizerCard";
import { Footer } from "@/components/layout/Footer";
import { VISUALIZERS } from "@/config/visualizers";

export default function Home() {
  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <section className="pt-14 pb-6 text-center sm:pt-20">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-fg-faint">Data structures &amp; algorithms</p>
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

        <section id="visualizers" className="mt-16 scroll-mt-24">
          <div className="mb-6 flex items-end justify-between gap-3 border-b border-line pb-4">
            <h2 className="font-serif text-4xl text-fg">Visualizers</h2>
            <span className="font-mono text-xs text-fg-faint">{VISUALIZERS.length} topics</span>
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
