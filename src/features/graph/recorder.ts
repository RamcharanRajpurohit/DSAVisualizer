import type { WatchValue } from "@/lib/player/types";
import type { Tone } from "@/lib/theme";
import type { Chip, ChipRow, ChipTone, EdgeState, Graph, GraphStep, NodeState, Travel } from "./types";

export interface SnapExtra {
  /** 1-based pseudocode line(s). */
  line?: number | readonly number[];
  vars?: Record<string, WatchValue>;
  travel?: Travel;
  /** Autoplay lingers `hold` × the normal pause on this step. */
  hold?: number;
}

/**
 * Step recorder. Algorithms mutate the "live" picture (node / edge styles, badges, the two
 * data-structure rows) and call `snap()` to append a deep copy of it as a new step.
 */
export class Rec {
  steps: GraphStep[] = [];
  nodes: Record<string, NodeState> = {};
  edges: Record<string, EdgeState> = {};
  badges: Record<string, string> = {};
  rows: ChipRow[] = [];
  transposed = false;

  row(i: number, title: string, items: Chip[] = []) {
    this.rows[i] = { title, items };
  }

  find(key: string, remove = false): Chip | null {
    for (const r of this.rows) {
      if (!r) continue;
      const j = r.items.findIndex((it) => it.key === key);
      if (j >= 0) return remove ? r.items.splice(j, 1)[0] : r.items[j];
    }
    return null;
  }

  /** Take the chip out of whatever row it is in (it flies back into its node / edge). */
  remove(key: string) {
    this.find(key, true);
  }

  /** Move a chip to the end of row `i`, optionally restyling it — it slides there on screen. */
  move(key: string, i: number, patch: Partial<Chip> = {}) {
    const it = this.find(key, true);
    if (it) this.rows[i].items.push(Object.assign(it, patch));
  }

  tone(key: string, tone: ChipTone) {
    const it = this.find(key);
    if (it) it.tone = tone;
  }

  snap(title: string, detail: string, tone: Tone = "info", extra: SnapExtra = {}) {
    this.steps.push({
      title,
      detail,
      tone,
      nodes: { ...this.nodes },
      edges: { ...this.edges },
      badges: { ...this.badges },
      rows: this.rows.map((r) => ({ title: r.title, items: r.items.map((it) => ({ ...it })) })),
      transposed: this.transposed,
      ...extra,
    });
  }

  /** Style an edge for one snapshot only (e.g. "checked, but rejected"). */
  flash(edge: string, style: EdgeState, title: string, detail: string, tone: Tone, extra?: SnapExtra) {
    const had = Object.prototype.hasOwnProperty.call(this.edges, edge);
    const old = this.edges[edge];
    this.edges[edge] = style;
    this.snap(title, detail, tone, extra);
    if (had) this.edges[edge] = old;
    else delete this.edges[edge];
  }
}

/** A chip that stands for node `id`. */
export const nChip = (G: Graph, id: string, tone: ChipTone = "base", text?: string): Chip => ({
  key: `n${id}`,
  text: text ?? G.L(id),
  node: id,
  tone,
});

export const hop = (edge: string, from: string, style: EdgeState): { travel: Travel } => ({ travel: { edge, from, style } });

// ───────────────────────────── text helpers ─────────────────────────────

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const fmtDist = (d: number) => (d === Infinity ? "∞" : String(d));
export const signed = (w: number) => (w < 0 ? `(${w})` : String(w));
export const isComp = (s: unknown): s is `c${number}` => typeof s === "string" && /^c\d+$/.test(s);
