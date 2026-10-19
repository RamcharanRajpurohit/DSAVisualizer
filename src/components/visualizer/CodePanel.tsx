"use client";

import { Check, Code2, Copy } from "lucide-react";
import { useState } from "react";
import { usePreference } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { highlightLine, type CodeLang } from "./highlight";
import { PseudoLines } from "./PseudocodePanel";

export type { CodeLang } from "./highlight";

/** Real implementations of what the pseudocode describes, one string (multi-line) per language. */
export type Implementations = Partial<Record<CodeLang, string>>;

export const CODE_LANGS: readonly { id: CodeLang; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "cpp", label: "C++" },
  { id: "java", label: "Java" },
  { id: "javascript", label: "JS" },
];

type Tab = "pseudo" | CodeLang;

export interface CodePanelProps {
  /** Pseudocode lines (the tab that follows the animation). */
  code: readonly string[];
  /** 1-based pseudocode line(s) to highlight. */
  active?: number | readonly number[];
  title?: string;
  implementations?: Implementations;
  className?: string;
}

/**
 * Pseudocode that follows the animation, plus copyable real code in several languages.
 * The chosen tab is remembered across pages.
 */
export function CodePanel({ code, active, title = "Code", implementations, className }: CodePanelProps) {
  const [saved, setSaved] = usePreference<string>("code.tab", "pseudo");
  const langs = CODE_LANGS.filter((l) => implementations?.[l.id]);
  const tab: Tab = saved !== "pseudo" && langs.some((l) => l.id === saved) ? (saved as CodeLang) : "pseudo";
  const [copied, setCopied] = useState(false);
  const source = tab === "pseudo" ? null : implementations?.[tab] ?? null;

  const copy = async () => {
    if (!source) return;
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: nothing else to do */
    }
  };

  return (
    <section className={cn("rounded-xl border border-line bg-surface/90 p-3", className)}>
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-fg-dim">
          <Code2 size={14} className="shrink-0 text-viz-purple" /> <span className="truncate">{title}</span>
        </h3>
        {source && (
          <button
            onClick={copy}
            className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-fg-faint hover:bg-surface-3 hover:text-fg"
            title="Copy code"
          >
            {copied ? <Check size={13} className="text-viz-green" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </header>

      {langs.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1" role="tablist" aria-label="Code language">
          {[{ id: "pseudo" as const, label: "Pseudocode" }, ...langs].map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setSaved(t.id)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                tab === t.id ? "border-viz-purple/50 bg-viz-purple/15 text-fg" : "border-line text-fg-faint hover:text-fg-dim",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === "pseudo" || !source ? (
        <PseudoLines code={code} active={active} />
      ) : (
        <>
          <pre className="scroll-thin max-h-[360px] overflow-auto rounded-lg bg-bg-elev p-2.5 font-mono text-[11.5px] leading-[1.6] text-fg-dim">
            {source.replace(/\n+$/, "").split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="w-7 shrink-0 select-none pr-2 text-right text-fg-faint/50">{i + 1}</span>
                <span className="whitespace-pre">{highlightLine(line, tab as CodeLang)}</span>
              </div>
            ))}
          </pre>
          <p className="mt-1.5 text-[10.5px] text-fg-faint">Line highlighting follows the Pseudocode tab.</p>
        </>
      )}
    </section>
  );
}
