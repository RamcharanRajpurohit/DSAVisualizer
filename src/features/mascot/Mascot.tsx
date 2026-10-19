"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RichText } from "@/components/ui";
import { usePreference } from "@/lib/prefs";
import { clamp } from "@/lib/utils";
import { BitSvg } from "./BitSvg";
import { pick, TIPS } from "./tips";
import { useMascotBrain } from "./useMascotBrain";

/**
 * Bit, the site mascot (an original character, inspired by reactive website mascots like
 * Duolingo's owl). Lives in the corner, follows the pointer with its eyes, reacts to what
 * happens on the page, falls asleep when you're away, and gives tips when clicked.
 */
export function Mascot() {
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;
  const [hidden, setHidden, known] = usePreference<boolean>("mascot.hidden", false);
  const [greeted, setGreeted, greetKnown] = usePreference<boolean>("mascot.greeted", false);
  const { mood, beat, speech, show, say, hush, activity } = useMascotBrain();
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [lean, setLean] = useState(0);
  const [blinking, setBlinking] = useState(false);
  const [hover, setHover] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastPath = useRef(pathname);

  // Eyes follow the pointer; any input counts as activity (wakes Bit, resets the sleep timer).
  useEffect(() => {
    let raf = 0;
    let lastActivity = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastActivity > 800) {
        lastActivity = now;
        activity();
      }
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = bodyRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        setGaze({ x: clamp(dx / 260, -1, 1), y: clamp(dy / 220, -1, 1) });
        setLean(clamp(dx / 60, -7, 7));
      });
    };
    const onKey = () => activity();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activity]);

  // Natural, irregular blinking.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlinking(true);
        t = setTimeout(() => {
          setBlinking(false);
          loop();
        }, 130);
      }, 2200 + Math.random() * 3800);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  // First visit: introduce yourself once.
  useEffect(() => {
    if (!greetKnown || greeted || hidden) return;
    const t = setTimeout(() => {
      show("happy", 1600, 4);
      say("Hi, I'm **Bit** 👋 Click me for tips.", 3800);
      setGreeted(true);
    }, 1400);
    return () => clearTimeout(t);
  }, [greetKnown, greeted, hidden, show, say, setGreeted]);

  // New page: take a curious look around.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    show("curious", 1200, 1);
  }, [pathname, show]);

  if (!known) return null;

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="fixed bottom-3 right-3 z-40 flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs text-fg-dim hover:text-fg"
        title="Bring Bit back"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-fg" /> Bit
      </button>
    );
  }

  const tip = () => {
    const pool = TIPS[pathname] ?? TIPS["/"];
    show("playful", 1100, 3);
    say(pick(pool), 5200);
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      className="fixed bottom-3 right-3 z-40 touch-none select-none"
      onHoverStart={() => {
        setHover(true);
        show("curious", 900, 1);
      }}
      onHoverEnd={() => setHover(false)}
      initial={{ opacity: 0, y: 30, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.4 }}
    >
      <AnimatePresence>
        {speech && (
          <motion.div
            key={speech.id}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            onClick={hush}
            className="absolute bottom-full right-1 mb-1 w-max max-w-[min(240px,calc(100vw-32px))] cursor-pointer rounded-2xl rounded-br-sm border border-line-strong bg-bg-elev px-3 py-2 text-[12.5px] leading-snug text-fg shadow-[0_10px_24px_-14px_rgba(26,26,26,0.4)]"
            role="status"
          >
            <RichText text={speech.text} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <motion.div
          ref={bodyRef}
          onTap={tip}
          className="cursor-pointer"
          whileTap={{ scale: 0.92 }}
          title="Bit — click for a tip, drag to move"
        >
          <BitSvg mood={mood} beat={beat} gaze={gaze} lean={lean} blinking={blinking} size={56} reduced={reduced} />
        </motion.div>
        <AnimatePresence>
          {hover && (
            <motion.button
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              onClick={(e) => {
                e.stopPropagation();
                setHidden(true);
              }}
              className="absolute -right-1 -top-1 rounded-full border border-line-strong bg-surface p-0.5 text-fg-faint hover:text-fg"
              aria-label="Hide Bit"
              title="Hide Bit"
            >
              <X size={11} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
