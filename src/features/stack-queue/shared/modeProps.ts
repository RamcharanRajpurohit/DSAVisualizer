import type { ReactNode } from "react";
import type { Shortcut } from "@/components/visualizer";
import type { SQMode } from "./types";

/** What the page hands every mode. */
export interface ModeProps {
  /** The mode tabs, rendered in the header. */
  tabs: ReactNode;
  /** Whether this mode is the visible one (keyboard shortcuts only act on it). */
  active: boolean;
  /** Query params of a shared link meant for this mode (applied once), or null. */
  init: URLSearchParams | null;
  onSwitch: (mode: SQMode) => void;
  shortcuts: readonly Shortcut[];
}
