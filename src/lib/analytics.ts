import type { PostHog } from "posthog-js";
import type { SyntheticEvent } from "react";
import { ANALYTICS } from "@/config/analytics";
import { onMascot } from "@/lib/mascot-bus";

/**
 * Privacy-first product analytics. posthog-js loads after the page is idle (never on the
 * critical path), keeps its state in memory only (no cookies, no local/session storage — no
 * consent banner),
 * respects Do Not Track / Global Privacy Control, and only reports from the production domain.
 * Session replay is on, with every input masked.
 * Local testing: set localStorage "dsaviz:analytics-dev" = "1".
 */
type Props = Record<string, string | number | boolean | null | undefined>;

let ph: PostHog | null = null;
let starting = false;
const queue: [string, Props | undefined][] = [];

export function track(event: string, props?: Props) {
  if (ph) ph.capture(event, props);
  else if (queue.length < 50) queue.push([event, props]);
}

function enabled() {
  if (typeof window === "undefined" || !ANALYTICS.key) return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return false;
  if (location.hostname === ANALYTICS.productionHost) return true;
  try {
    return localStorage.getItem("dsaviz:analytics-dev") === "1";
  } catch {
    return false;
  }
}

const deviceClass = () => {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const w = innerWidth;
  return w < 640 ? "phone" : w < 1024 || coarse ? "tablet" : "desktop";
};

export async function startAnalytics() {
  if (ph || starting || !enabled()) return;
  starting = true;
  const { default: posthog } = await import("posthog-js");
  posthog.init(ANALYTICS.key, {
    api_host: ANALYTICS.apiPath,
    ui_host: ANALYTICS.uiHost,
    defaults: "2026-08-30",
    // Memory-only persistence: no cookies and nothing in local/session storage (no consent banner),
    // yet a session lives for the whole visit, which session replay needs (cookieless_mode
    // "always" rules replay out). Trade-off: a reload or new tab counts as a new visitor.
    persistence: "memory",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: true,
    capture_performance: { web_vitals: true, network_timing: false },
    autocapture: false,
    rageclick: true,
    // Session replay (sampling, 2 s minimum and allowed domain are set in the PostHog project).
    disable_session_recording: false,
    session_recording: { maskAllInputs: true, recordCrossOriginIframes: false },
    disable_surveys: true,
    disable_web_experiments: true,
    advanced_disable_feature_flags: true,
    respect_dnt: true,
  });
  posthog.register({ site: "algolab", device_class: deviceClass(), pointer: matchMedia("(pointer: coarse)").matches ? "coarse" : "fine" });
  ph = posthog;
  for (const [event, props] of queue.splice(0)) posthog.capture(event, props);

  // Learning signals the app already broadcasts (quizzes, lessons, input errors).
  onMascot((e) => {
    if (e.type === "quiz") track("quiz_answered", { correct: e.correct });
    else if (e.type === "lesson-open") track("lesson_opened");
    else if (e.type === "input-error") track("input_error");
  });
}

const PANELS = ["header", "controls", "stage", "insight"] as const;

/** Name of the control behind a click/change inside a visualizer: aria-label, visible text, then tooltip. */
function controlName(el: Element) {
  const text = el.textContent?.replace(/\s+/g, " ").trim();
  const label = el.getAttribute("aria-label") || text || el.getAttribute("title") || "";
  return label.replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * Delegated tracking for every visualizer: one listener on VisualizerLayout reports which
 * control was used, in which panel, without instrumenting each feature. Values typed into
 * inputs are never sent; select changes report the chosen option's label.
 */
export function trackVisualizerInteraction(e: SyntheticEvent, visualizer: string) {
  const target = e.target as Element | null;
  if (!target?.closest) return;
  const panel = target.closest<HTMLElement>("[data-panel]")?.dataset.panel;
  if (!panel || !(PANELS as readonly string[]).includes(panel)) return;
  if (e.type === "change") {
    if (target instanceof HTMLSelectElement) {
      track("viz_control", { visualizer, panel, control: controlName(target), value: target.selectedOptions[0]?.textContent?.trim().slice(0, 60) });
    }
    return;
  }
  const control = target.closest('button, [role="tab"], a[href]');
  if (!control || control.matches("[disabled], [aria-disabled='true']")) return;
  track("viz_control", { visualizer, panel, control: controlName(control) });
}
