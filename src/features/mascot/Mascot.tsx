"use client";

import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from "motion/react";
import { Footprints, Pause, Volume2, VolumeX, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RichText } from "@/components/ui";
import { onMascot } from "@/lib/mascot-bus";
import { usePreference } from "@/lib/prefs";
import { clamp, cn } from "@/lib/utils";
import { BitSvg } from "./BitSvg";
import { FOCUS_HINT, PAGE_HELLO, pick, TIPS } from "./tips";
import { useMascotBrain } from "./useMascotBrain";

/** Bit's box (SVG incl. antenna) in CSS px. */
const W = 56;
const H = 66;
const MARGIN = 14;
const NAVBAR = 56;

/** Where Bit wants to be. */
type Anchor =
  | { kind: "home" }
  | { kind: "element"; el: Element }
  | { kind: "canvas" }
  | { kind: "roam"; fx: number; fy: number };

const isField = (el: Element | null): el is HTMLElement =>
  !!el && el instanceof HTMLElement && el.matches("input:not([type=range]):not([type=checkbox]):not([type=radio]), textarea, select");

/** Fixed-position top-left for an anchor, clamped to the viewport. */
function targetFor(a: Anchor): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const home = { x: vw - W - MARGIN, y: vh - H - MARGIN };
  const fit = (x: number, y: number) => ({ x: clamp(x, 8, vw - W - 8), y: clamp(y, NAVBAR + 6, vh - H - 8) });

  if (a.kind === "element") {
    if (!a.el.isConnected) return home;
    const r = a.el.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > vh) return home;
    // Sit beside the field, like a helper leaning on the form; left side if there's no room on the right.
    const right = r.right + 10;
    const x = right + W < vw - 8 ? right : r.left - W - 10;
    return fit(x, r.top + r.height / 2 - H / 2 - 6);
  }
  if (a.kind === "canvas") {
    const c = document.querySelector("[data-viz-canvas]");
    if (!c) return home;
    const r = c.getBoundingClientRect();
    return fit(r.right - W - 52, r.bottom - H - 8);
  }
  if (a.kind === "roam") return fit(a.fx * vw, a.fy * vh);
  return home;
}

/**
 * Bit, the site mascot (an original character, inspired by reactive website mascots).
 * It walks to whatever you're working with — next to the input you type in, onto the canvas
 * while an animation plays — wanders when you're reading, reacts to what happens, and falls
 * asleep when you're away. Hover it to stop it moving, mute it or hide it.
 */
export function Mascot() {
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;
  const [hidden, setHidden, known] = usePreference<boolean>("mascot.hidden", false);
  const [still, setStill] = usePreference<boolean>("mascot.still", false);
  const [muted, setMuted] = usePreference<boolean>("mascot.muted", false);
  const [greeted, setGreeted, greetKnown] = usePreference<boolean>("mascot.greeted", false);
  const { mood, beat, speech, show, say, chat, hush, activity } = useMascotBrain();

  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [lean, setLean] = useState(0);
  const [blinking, setBlinking] = useState(false);
  const [hover, setHover] = useState(false);
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState(1);
  const [onLeft, setOnLeft] = useState(false);
  const [nearTop, setNearTop] = useState(false);

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const bodyRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<Anchor>({ kind: "home" });
  const stillRef = useRef(still);
  const lastTyping = useRef(0);
  const lastActivity = useRef(0);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hinted = useRef(new Set<string>());
  const moodRef = useRef(mood);

  useEffect(() => {
    stillRef.current = still;
    moodRef.current = mood;
  }, [still, mood]);

  const canRoam = () => !stillRef.current && window.innerWidth >= 768;

  /** Walk (or jump, with reduced motion) to an anchor. */
  const go = useCallback((a: Anchor, instant = false) => {
    anchorRef.current = a;
    if (stillRef.current && !instant) return;
    const t = targetFor(a);
    const dx = t.x - x.get();
    const dy = t.y - y.get();
    const dist = Math.hypot(dx, dy);
    setOnLeft(t.x < window.innerWidth / 2);
    setNearTop(t.y < 170);
    if (dist < 3) return;
    if (instant || reduced) {
      x.set(t.x);
      y.set(t.y);
      return;
    }
    const duration = clamp(dist / 650, 0.35, 1.4);
    setFacing(dx < 0 ? -1 : 1);
    setWalking(dist > 40);
    animate(x, t.x, { duration, ease: "easeInOut" });
    animate(y, t.y, { duration, ease: "easeInOut" }).then(() => setWalking(false));
  }, [x, y, reduced]);

  const goHomeLater = useCallback((ms: number) => {
    if (returnTimer.current) clearTimeout(returnTimer.current);
    returnTimer.current = setTimeout(() => {
      if (isField(document.activeElement)) go({ kind: "element", el: document.activeElement });
      else go({ kind: "home" });
    }, ms);
  }, [go]);

  // Initial placement and keeping anchored positions in sync with scroll / resize.
  useEffect(() => {
    const raf0 = requestAnimationFrame(() => go({ kind: "home" }, true));
    let raf = 0;
    const sync = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (stillRef.current) {
          // Keep a pinned Bit on screen when the window shrinks.
          x.set(clamp(x.get(), 8, window.innerWidth - W - 8));
          y.set(clamp(y.get(), NAVBAR, window.innerHeight - H - 8));
          return;
        }
        const t = targetFor(anchorRef.current);
        x.set(t.x);
        y.set(t.y);
      });
    };
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(raf0);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, { capture: true });
    };
  }, [go, x, y]);

  // Follow the user's focus: hop next to the field being used; drift back when they leave it.
  useEffect(() => {
    const onIn = (e: FocusEvent) => {
      const el = e.target as Element | null;
      if (!isField(el) || !canRoam()) return;
      if (returnTimer.current) clearTimeout(returnTimer.current);
      go({ kind: "element", el });
      const key = `${pathname}`;
      if (el.matches("[data-value-input]") && !hinted.current.has(key)) {
        hinted.current.add(key);
        say(FOCUS_HINT, 3400); // once per page, so it skips the chat rate limit
      }
    };
    const onOut = () => goHomeLater(2600);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, [go, goHomeLater, say, pathname]);

  // React to the app: stay by the field while typing, watch the canvas while an animation runs.
  useEffect(() => {
    return onMascot((e) => {
      if (!canRoam()) return;
      if (e.type === "typing") {
        lastTyping.current = Date.now();
      } else if (e.type === "input-error") {
        const el = document.activeElement;
        if (isField(el)) go({ kind: "element", el });
      } else if (e.type === "status") {
        if (Date.now() - lastTyping.current < 700) return; // still at the input that started it
        if (anchorRef.current.kind !== "canvas") go({ kind: "canvas" });
        goHomeLater(e.title.trim().startsWith("✓") ? 3200 : 5000);
      }
    });
  }, [go, goHomeLater]);

  // Eyes follow the pointer; any input counts as activity (wakes Bit, resets the sleep timer).
  useEffect(() => {
    lastActivity.current = Date.now();
    let raf = 0;
    let lastPing = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      lastActivity.current = Date.now();
      if (now - lastPing > 800) {
        lastPing = now;
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
    const onKey = () => {
      lastActivity.current = Date.now();
      activity();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activity]);

  // Wander while the visitor is reading (pointer still), and sometimes share a tip.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        const idleFor = Date.now() - lastActivity.current;
        const sleepy = moodRef.current === "sleeping" || moodRef.current === "drowsy";
        const free = anchorRef.current.kind === "home" || anchorRef.current.kind === "roam";
        if (canRoam() && free && !isField(document.activeElement)) {
          if (sleepy) {
            if (anchorRef.current.kind !== "home") go({ kind: "home" });
          } else if (idleFor > 9000) {
            // Stroll along the bottom or right edge — never over the middle of the canvas.
            const edge = Math.random() < 0.6;
            go({ kind: "roam", fx: edge ? 0.45 + Math.random() * 0.5 : 0.92, fy: edge ? 0.9 : 0.35 + Math.random() * 0.5 });
            if (Math.random() < 0.3) chat(pick(TIPS[pathname] ?? TIPS["/"]), 4200);
          } else if (anchorRef.current.kind === "roam") {
            go({ kind: "home" });
          }
        }
        loop();
      }, 7000 + Math.random() * 6000);
    };
    loop();
    return () => clearTimeout(t);
  }, [go, chat, pathname]);

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

  // Bit only speaks after the visitor's first real interaction (tap, click, key, scroll). That reads
  // naturally ("hi" when you start exploring) and keeps speech bubbles out of page-load metrics —
  // browsers stop measuring Largest Contentful Paint at the first input.
  const [engaged, setEngaged] = useState(false);
  useEffect(() => {
    if (engaged) return;
    const on = () => setEngaged(true);
    const opts = { once: true, passive: true, capture: true } as const;
    const events = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    events.forEach((ev) => window.addEventListener(ev, on, opts));
    return () => events.forEach((ev) => window.removeEventListener(ev, on, { capture: true }));
  }, [engaged]);

  // First interaction ever: introduce yourself once. Later page changes: a short hello for that page.
  useEffect(() => {
    if (!greetKnown || hidden || !engaged) return;
    const t = setTimeout(() => {
      if (!greeted) {
        show("happy", 1600, 4);
        say("Hi, I'm **Bit** 👋 I'll follow along — hover me to pause or mute me.", 4200);
        setGreeted(true);
      } else {
        show("curious", 1200, 1);
        if (PAGE_HELLO[pathname]) chat(PAGE_HELLO[pathname], 2600, 0.8);
      }
      go({ kind: "home" });
    }, 600);
    return () => clearTimeout(t);
  }, [pathname, greetKnown, greeted, hidden, engaged, show, say, chat, setGreeted, go]);

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
    show("playful", 1100, 3);
    say(pick(TIPS[pathname] ?? TIPS["/"]), 5200);
  };

  const toolBtn = "flex h-6 w-6 items-center justify-center rounded-full border border-line-strong bg-bg-elev text-fg-dim shadow-sm hover:text-fg";

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={() => setStill(true)}
      style={{ x, y }}
      className="fixed left-0 top-0 z-40 touch-none select-none"
      onHoverStart={() => {
        setHover(true);
        show("curious", 900, 1);
      }}
      onHoverEnd={() => setHover(false)}
    >
      <AnimatePresence>
        {speech && !muted && engaged && (
          <motion.div
            key={speech.id}
            initial={{ opacity: 0, y: nearTop ? -6 : 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            onClick={hush}
            className={cn(
              "absolute w-max max-w-[min(240px,calc(100vw-32px))] cursor-pointer rounded-2xl border border-line-strong bg-bg-elev px-3 py-2 text-[12.5px] leading-snug text-fg shadow-[0_10px_24px_-14px_rgba(26,26,26,0.4)]",
              nearTop ? "top-full mt-1" : "bottom-full mb-1",
              onLeft ? "left-1 rounded-bl-sm" : "right-1 rounded-br-sm",
            )}
            role="status"
          >
            <RichText text={speech.text} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <motion.div ref={bodyRef} onTap={tip} className="cursor-pointer" whileTap={{ scale: 0.92 }} title="Bit — click for a tip">
          <BitSvg
            mood={mood}
            beat={beat}
            gaze={gaze}
            lean={lean}
            blinking={blinking}
            size={W}
            reduced={reduced}
            walking={walking}
            facing={facing}
          />
        </motion.div>

        {/* Hover controls: stop/resume moving, mute/unmute, hide. */}
        <AnimatePresence>
          {hover && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn("absolute top-0 flex flex-col gap-1", onLeft ? "-right-7" : "-left-7")}
            >
              <button
                className={toolBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !still;
                  setStill(next);
                  stillRef.current = next;
                  if (!next) go({ kind: "home" });
                }}
                title={still ? "Let Bit move around" : "Stop Bit moving"}
                aria-label={still ? "Let Bit move around" : "Stop Bit moving"}
              >
                {still ? <Footprints size={12} /> : <Pause size={12} />}
              </button>
              <button
                className={toolBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!muted) hush();
                  setMuted(!muted);
                }}
                title={muted ? "Let Bit talk" : "Mute Bit"}
                aria-label={muted ? "Let Bit talk" : "Mute Bit"}
              >
                {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
              <button
                className={toolBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setHidden(true);
                }}
                title="Hide Bit"
                aria-label="Hide Bit"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
