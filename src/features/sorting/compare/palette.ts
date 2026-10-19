/*
 * Compare-mode colours ("ink on paper" theme). Pure TS so the canvas engine can use it.
 * Bar colours follow the strong (stroke) tones of the shared VIZ palette.
 */
export const BAR = {
  /** Unsorted bars: graphite ink. */
  base: "#4B463F",
  compare: "#2563EB",
  write: "#D97706",
  aux: "#7C3AED",
  done: "#16A34A",
} as const;

/** Write counts as text (a darker amber than the bar, for contrast on paper). */
export const WRITE_TEXT = "#B45309";

export interface BadgeTone {
  fill: string;
  stroke: string;
  text: string;
}

/** Finish-place badges: 1st / 2nd / 3rd, last place, everyone else. */
export const PLACE: Readonly<Record<number, BadgeTone & { label: string }>> = {
  1: { label: "1st", fill: "#FFE7BF", stroke: "#D97706", text: "#7C2D12" },
  2: { label: "2nd", fill: "#ECE6DC", stroke: "#8C8478", text: "#4B463F" },
  3: { label: "3rd", fill: "#F6E2D2", stroke: "#B4693A", text: "#6B3416" },
};
export const PLACE_LAST: BadgeTone = { fill: "#FDDEDE", stroke: "#DC2626", text: "#7F1D1D" };
export const PLACE_OTHER: BadgeTone = { fill: "#FBF8F2", stroke: "rgba(26,26,26,0.20)", text: "#4B463F" };
