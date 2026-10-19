"use client";

import { Play } from "lucide-react";
import { Button, Section } from "@/components/ui";

export interface ExampleCase {
  id: string;
  label: string;
  /** Tooltip: what the example shows. */
  title: string;
  run: () => void;
}

/** Topic-page shortcut: each button loads the example tree and plays one case. */
export function ExampleCases({ title, cases, disabled }: { title: string; cases: readonly ExampleCase[]; disabled: boolean }) {
  return (
    <Section title={title}>
      <div className="flex flex-col gap-2">
        {cases.map((c) => (
          <Button key={c.id} size="sm" block icon={<Play size={14} />} onClick={c.run} disabled={disabled} title={c.title}>
            {c.label}
          </Button>
        ))}
      </div>
    </Section>
  );
}
