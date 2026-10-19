import type { Tone } from "@/lib/theme";

/**
 * Fire-and-forget events that let any part of the app nudge the mascot without
 * importing it: inputs, status cards, quizzes and lessons just call emitMascot().
 */
export type MascotEvent =
  | { type: "typing" }
  | { type: "input-error"; message: string }
  | { type: "status"; tone: Tone; title: string }
  | { type: "quiz"; correct: boolean }
  | { type: "lesson-open" }
  | { type: "say"; text: string; mood?: string };

const EVENT = "dsaviz:mascot";

export function emitMascot(event: MascotEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<MascotEvent>(EVENT, { detail: event }));
}

export function onMascot(handler: (event: MascotEvent) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<MascotEvent>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
