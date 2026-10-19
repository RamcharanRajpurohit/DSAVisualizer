"use client";

import { Clapperboard, Play } from "lucide-react";
import { useState } from "react";
import { Button, RichText, Section, Segmented } from "@/components/ui";
import { AVL_DEMOS, DEMO_IDS, type DemoId } from "../constants";
import type { AVLEngine } from "../engine/AVLEngine";

const OPTIONS = DEMO_IDS.map((id) => ({ value: id, label: AVL_DEMOS[id].short, title: AVL_DEMOS[id].title }));

/** Scripted rotation demos: pick a case, read what will happen, play it. */
export function AVLDemos({ engine, busy }: { engine: AVLEngine | null; busy: boolean }) {
  const [id, setId] = useState<DemoId>("LL");
  const d = AVL_DEMOS[id];
  return (
    <Section title="Rotation demos" icon={<Clapperboard />}>
      <Segmented options={OPTIONS} value={id} onChange={setId} size="sm" />
      <div className="rounded-lg border border-line bg-bg-elev p-2.5">
        <div className="mb-1 text-xs font-semibold text-viz-purple">{d.title}</div>
        <p className="text-[12px] leading-relaxed text-fg-dim">
          <RichText text={d.intro} />
        </p>
        <p className="mt-1.5 font-mono text-[10.5px] text-fg-faint">
          start [{d.base.join(", ")}] · then {d.op} {d.value}
        </p>
      </div>
      <Button variant="primary" size="sm" block icon={<Play size={14} />} onClick={() => void engine?.demo(id)} disabled={!engine || busy}>
        Play demo
      </Button>
    </Section>
  );
}
