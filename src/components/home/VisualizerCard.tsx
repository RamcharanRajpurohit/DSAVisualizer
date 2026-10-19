import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { VisualizerMeta } from "@/config/visualizers";
import { VisualizerIcon } from "@/components/layout/VisualizerIcon";

export function VisualizerCard({ v }: { v: VisualizerMeta }) {
  return (
    <Link
      href={v.href}
      className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_30px_-18px_rgba(26,26,26,0.35)]"
    >
      <div className="mb-5 flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-bg-elev text-fg">
          <VisualizerIcon name={v.icon} size={19} />
        </span>
        <ArrowUpRight size={18} className="text-fg-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
      </div>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-faint">{v.category}</span>
      <h3 className="mt-1 font-serif text-[26px] leading-tight text-fg">{v.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-dim">{v.tagline}</p>
    </Link>
  );
}
