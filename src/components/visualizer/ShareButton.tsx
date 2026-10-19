"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { emitMascot } from "@/lib/mascot-bus";
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
    emitMascot({ type: "say", text: "Link copied — anyone who opens it sees exactly this 🔗" });
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={share}
      className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2 text-xs font-medium text-fg-dim transition hover:bg-surface-2 hover:text-fg"
      title="Copy a link to this exact setup"
      aria-label="Copy share link"
    >
      {copied ? <Check size={14} className="text-viz-green-deep" /> : <Link2 size={14} />}
      {copied && "Copied"}
    </button>
  );
}
