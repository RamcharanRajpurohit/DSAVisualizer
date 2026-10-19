"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { RichText } from "@/components/ui";
import { emitMascot } from "@/lib/mascot-bus";
import { TONE_COLOR, type Tone } from "@/lib/theme";

/** "What is happening right now" — title in the step's tone plus a short explanation. */
export function StatusCard({
  title, detail, tone = "info", heading = "Current step",
}: { title?: string; detail?: string; tone?: Tone; heading?: string }) {
  const color = TONE_COLOR[tone];

  useEffect(() => {
    if (title) emitMascot({ type: "status", tone, title });
  }, [title, tone]);
  return (
    <section
      className="relative shrink-0 overflow-hidden rounded-xl border bg-surface/90 p-3.5"
      style={{ borderColor: `${color}40`, boxShadow: `inset 3px 0 0 ${color}` }}
      aria-live="polite"
    >
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-faint">{heading}</div>
      {/* Re-keyed per step: fades in without an exit phase, so fast playback never blanks the card. */}
      <motion.div
        key={`${title}|${detail}`}
        initial={{ opacity: 0.35, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="text-[15px] font-semibold leading-snug" style={{ color }}>
          {title ?? "Ready"}
        </div>
        {detail && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-dim">
            <RichText text={detail} />
          </p>
        )}
      </motion.div>
    </section>
  );
}
