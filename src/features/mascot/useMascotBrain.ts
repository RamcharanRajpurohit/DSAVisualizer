"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onMascot } from "@/lib/mascot-bus";
import type { Mood } from "./moods";
import { CHEERS, DANGER, pick, QUIZ_RIGHT, QUIZ_WRONG, RUN_START } from "./tips";

const DROWSY_AFTER = 45_000;
const SLEEP_AFTER = 80_000;

export interface Speech {
  id: number;
  text: string;
}

/**
 * Bit's state machine. Every reaction has a priority and a duration: a celebration won't be
 * interrupted by a routine step, and everything falls back to "idle" when it expires.
 * Long inactivity → drowsy → sleeping; any activity wakes Bit up.
 */
export function useMascotBrain() {
  const [mood, setMood] = useState<Mood>("waking");
  /** Bumped on every reaction so one-shot animations replay even when the mood repeats. */
  const [beat, setBeat] = useState(0);
  const [speech, setSpeech] = useState<Speech | null>(null);
  const cur = useRef({ priority: 5, until: 0 });
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sleepy = useRef(false);
  const speechId = useRef(0);
  const lastStatus = useRef(0);
  const lastChat = useRef(0);

  const show = useCallback((m: Mood, ms: number, priority = 1) => {
    const now = Date.now();
    if (now < cur.current.until && priority < cur.current.priority) return;
    cur.current = { priority, until: now + ms };
    setMood(m);
    setBeat((b) => b + 1);
    if (moodTimer.current) clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => {
      cur.current = { priority: 0, until: 0 };
      setMood("idle");
    }, ms);
  }, []);

  const say = useCallback((text: string, ms = 3400) => {
    speechId.current += 1;
    setSpeech({ id: speechId.current, text });
    if (speechTimer.current) clearTimeout(speechTimer.current);
    speechTimer.current = setTimeout(() => setSpeech(null), ms);
  }, []);

  /** Non-urgent remarks: at most one every few seconds so Bit never spams. */
  const chat = useCallback((text: string, ms = 2600, odds = 1) => {
    const now = Date.now();
    if (now - lastChat.current < 5000 || Math.random() > odds) return;
    lastChat.current = now;
    say(text, ms);
  }, [say]);

  const hush = useCallback(() => {
    if (speechTimer.current) clearTimeout(speechTimer.current);
    setSpeech(null);
  }, []);

  const scheduleSleep = useCallback(() => {
    idleTimers.current.forEach(clearTimeout);
    idleTimers.current = [
      setTimeout(() => {
        sleepy.current = true;
        show("drowsy", SLEEP_AFTER - DROWSY_AFTER + 1000, 0);
      }, DROWSY_AFTER),
      setTimeout(() => {
        sleepy.current = true;
        show("sleeping", 1e9, 0);
      }, SLEEP_AFTER),
    ];
  }, [show]);

  /** Called on pointer / key activity (throttled by the caller). */
  const activity = useCallback(() => {
    if (sleepy.current) {
      sleepy.current = false;
      cur.current = { priority: 0, until: 0 };
      show("waking", 900, 5);
      if (Math.random() < 0.5) say("I'm up! 👀", 1800);
    }
    scheduleSleep();
  }, [scheduleSleep, show, say]);

  useEffect(() => {
    // Wake up on arrival, then settle.
    const t = setTimeout(() => show("idle", 10, 0), 1100);
    scheduleSleep();
    const off = onMascot((e) => {
      switch (e.type) {
        case "typing":
          show("listening", 1400, 1);
          break;
        case "input-error":
          show("confused", 2600, 3);
          say(e.message, 3600);
          break;
        case "status": {
          const done = e.title.trim().startsWith("✓");
          // Steps arriving in quick succession = an animation is playing: stay focused
          // instead of flipping faces every step; finishes and dangers still get a reaction.
          const now = Date.now();
          const running = now - lastStatus.current < 2500;
          lastStatus.current = now;
          if (running && !done && e.tone !== "danger") {
            show("thinking", 2600, 1);
            break;
          }
          if (!running && !done) chat(pick(RUN_START), 2000, 0.45);
          if (done) {
            show("celebrate", 1800, 3);
            chat(pick(CHEERS), 2200, 0.6);
          } else if (e.tone === "danger") {
            show("surprised", 1600, 3);
            chat(pick(DANGER), 1800, 0.6);
          } else if (e.tone === "warn") {
            show("curious", 1100, 1);
          } else if (e.tone === "ok") {
            show("happy", 900, 2);
          } else {
            show("thinking", 1100, 1);
          }
          break;
        }
        case "quiz":
          if (e.correct) {
            show("celebrate", 1900, 4);
            say(pick(QUIZ_RIGHT), 2600);
          } else {
            show("sad", 2200, 4);
            say(pick(QUIZ_WRONG), 2800);
          }
          break;
        case "lesson-open":
          show("proud", 1500, 2);
          chat("Class is in session 🎓", 2200, 0.7);
          break;
        case "say":
          say(e.text);
          break;
      }
    });
    const timers = idleTimers.current;
    return () => {
      clearTimeout(t);
      off();
      timers.forEach(clearTimeout);
      if (moodTimer.current) clearTimeout(moodTimer.current);
      if (speechTimer.current) clearTimeout(speechTimer.current);
    };
  }, [show, say, chat, scheduleSleep]);

  return { mood, beat, speech, show, say, chat, hush, activity };
}
