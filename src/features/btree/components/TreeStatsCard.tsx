"use client";

import { Activity, CircleCheck, CircleX } from "lucide-react";
import { motion } from "motion/react";
import { Section } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { TreeProps, TreeStats } from "../model/btree";

function Tile({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-line bg-bg-elev px-2 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-faint">{label}</span>
      <motion.span
        key={String(value)}
        initial={{ scale: 1.25, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
        className={cn("origin-left font-mono text-[15px] font-semibold tabular-nums", accent ?? "text-fg")}
      >
        {value}
      </motion.span>
    </div>
  );
}

/** Live counters plus the four defining B-tree properties (they flicker to ✗ while a split or merge is mid-way). */
export function TreeStatsCard({ stats, props, busy }: { stats: TreeStats; props: TreeProps; busy: boolean }) {
  const { order, maxKeys, minKeys } = stats;
  const checks = [
    { ok: props.sorted, text: "In-order keys are sorted" },
    { ok: props.maxOk, text: `Every node has ≤ ${maxKeys} keys` },
    { ok: props.minOk, text: `Non-root nodes have ≥ ${minKeys} key${minKeys === 1 ? "" : "s"}` },
    { ok: props.balanced, text: "All leaves on the same level" },
  ];
  return (
    <Section title="Tree stats" icon={<Activity />}>
      <div className="grid grid-cols-3 gap-1.5">
        <Tile label="Order" value={order} accent="text-viz-blue" />
        <Tile label="Height" value={stats.height} accent="text-viz-purple" />
        <Tile label="Keys" value={stats.keys} accent="text-viz-green" />
        <Tile label="Nodes" value={stats.nodes} />
        <Tile label="Leaves" value={stats.leaves} />
        <Tile label="Fill" value={`${Math.round(stats.fill * 100)}%`} accent="text-viz-amber" />
      </div>
      <p className="text-xs leading-relaxed text-fg-dim">
        Per node: at most <b className="text-fg">{maxKeys}</b> keys ({order} children). Every node except the root keeps at least{" "}
        <b className="text-fg">{minKeys}</b> key{minKeys === 1 ? "" : "s"} ({minKeys + 1} children).
      </p>
      <ul className="flex flex-col gap-1">
        {checks.map((c) => (
          <li key={c.text} className={cn("flex items-center gap-2 text-xs transition-colors", c.ok ? "text-fg-dim" : "text-viz-red")}>
            {c.ok ? <CircleCheck size={14} className="shrink-0 text-viz-green" /> : <CircleX size={14} className="shrink-0" />}
            <span>{c.text}</span>
            {!c.ok && busy && <span className="ml-auto text-[10px] uppercase tracking-wider text-viz-amber">fixing…</span>}
          </li>
        ))}
      </ul>
    </Section>
  );
}
