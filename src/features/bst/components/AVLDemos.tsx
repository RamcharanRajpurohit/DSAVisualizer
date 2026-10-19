"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { Button, Section, Segmented } from "@/components/ui";
import { AVL_DEMOS, DEMO_IDS, type DemoId } from "../constants";
import type { AVLEngine } from "../engine/AVLEngine";

const OPTIONS = DEMO_IDS.map((id) => ({ value: id, label: AVL_DEMOS[id].short, title: AVL_DEMOS[id].title }));

/** Scripted rotation demos: pick a case, play it. The full explanation runs in the status card. */
export function AVLDemos({ engine, busy }: { engine: AVLEngine | null; busy: boolean }) {
  const [id, setId] = useState<DemoId>("LL");
  const d = AVL_DEMOS[id];
  return (
    <Section title="Rotation demos">
      <Segmented options={OPTIONS} value={id} onChange={setId} size="sm" />
      <Button
        size="sm" block icon={<Play size={14} />}
        onClick={() => void engine?.demo(id)} disabled={!engine || busy}
        title={`${d.title}: start [${d.base.join(", ")}], then ${d.op} ${d.value}`}
      >
        {d.line}
      </Button>
    </Section>
  );
}
