import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { VisualizerMeta } from "@/config/visualizers";
import { VisualizerIcon } from "@/components/layout/VisualizerIcon";

export function VisualizerCard({ v }: { v: VisualizerMeta }) {
  return (
    <Link
      href={v.href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_18px_50px_-20px_rgba(0,242,255,0.35)]"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-brand-alt/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand/25 bg-gradient-to-br from-brand/15 to-brand-alt/20 text-brand">
          <VisualizerIcon name={v.icon} size={22} />
        </span>
        <ArrowUpRight size={18} className="text-fg-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-faint">{v.category}</span>
      <h3 className="mt-0.5 text-lg font-semibold text-fg">{v.title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-fg-dim">{v.description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {v.topics.map((t) => (
          <span key={t} className="rounded-md border border-line bg-bg-elev px-2 py-0.5 text-[11px] text-fg-faint">
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
