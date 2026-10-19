"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { buildShareUrl, type ShareParams } from "@/lib/share";

/** Copies a link that reopens this page with the same input (VisuAlgo-style shareable state). */
export function ShareButton({ getParams }: { getParams: () => ShareParams }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = buildShareUrl(getParams());
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
    }
    window.history.replaceState(null, "", url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={share}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface-2 px-2.5 text-xs font-medium text-fg-dim transition hover:bg-surface-3 hover:text-fg"
      title="Copy a link to this exact setup"
    >
      {copied ? <Check size={14} className="text-viz-green" /> : <Link2 size={14} />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
