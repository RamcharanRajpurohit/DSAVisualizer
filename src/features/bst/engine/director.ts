import type { RunInfo, RunPhase } from "./types";

interface Job {
  elapsed: number;
  duration: number;
  frame: (k: number) => void;
  resolve: () => void;
}

/**
 * The engine's clock and conductor.
 *
 *  - Every tween / morph / wait is a job on ONE requestAnimationFrame loop. Time only advances while
 *    not paused, scaled by `rate` (speed changes apply mid-animation).
 *  - `beat()` marks a phase boundary. In step mode (or after "next step" from a running/paused
 *    state) it parks the operation until `step()` / `resume()` is called — the awaitable gate.
 *  - `skip()` completes the running operation instantly (all jobs jump to their end, gates open).
 *  - `destroy()` does the same forever, so an operation still in flight after unmount just runs to
 *    completion without timers.
 */
export class Director {
  rate = 1;
  private readonly jobs = new Set<Job>();
  private raf: number | null = null;
  private lastT = 0;
  private busy = false;
  private paused = false;
  private skipping = false;
  private dead = false;
  private stepMode = false;
  private breakNext = false;
  private gate: (() => void) | null = null;
  private op = "";

  constructor(
    private readonly onFrame: () => void,
    private readonly onRun: (r: RunInfo) => void,
  ) {}

  get isBusy(): boolean { return this.busy; }

  /** True while durations should collapse to zero. */
  get instant(): boolean { return this.skipping || this.dead; }

  get phase(): RunPhase {
    if (!this.busy) return "idle";
    if (this.gate) return "waiting";
    return this.paused ? "paused" : "running";
  }

  info(): RunInfo { return { phase: this.phase, stepMode: this.stepMode, op: this.op }; }

  private emit() { if (!this.dead) this.onRun(this.info()); }

  begin(op: string) {
    this.busy = true;
    this.op = op;
    this.skipping = false;
    this.paused = false;
    this.breakNext = false;
    this.emit();
  }

  setOp(op: string) {
    this.op = op;
    this.emit();
  }

  end() {
    this.busy = false;
    this.skipping = false;
    this.paused = false;
    this.breakNext = false;
    this.op = "";
    this.openGate();
    this.emit();
  }

  /** Run `frame(k)` for k: 0 → 1 over `sec` seconds at 1× speed. */
  animate(sec: number, frame: (k: number) => void): Promise<void> {
    if (this.instant || sec <= 0.001) {
      frame(1);
      this.onFrame();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.jobs.add({ elapsed: 0, duration: sec * 1000, frame, resolve });
      this.kick();
    });
  }

  wait(sec: number): Promise<void> {
    return this.instant ? Promise.resolve() : this.animate(sec, noop);
  }

  /** A phase boundary: a timed pause, or — in step mode — wait for "Next step". */
  beat(sec: number): Promise<void> {
    if (this.instant) return Promise.resolve();
    if (this.stepMode || this.breakNext) {
      this.breakNext = false;
      return new Promise((resolve) => {
        this.gate = resolve;
        this.emit();
      });
    }
    return this.wait(sec);
  }

  pause() {
    if (!this.busy || this.gate || this.paused) return;
    this.paused = true;
    this.emit();
  }

  resume() {
    this.paused = false;
    this.breakNext = false;
    this.openGate();
    this.emit();
  }

  toggle() {
    if (this.phase === "running") this.pause();
    else this.resume();
  }

  /** Advance to the next phase boundary and stop there. */
  step() {
    if (!this.busy) return;
    if (this.gate) this.openGate();
    else {
      this.breakNext = true;
      this.paused = false;
    }
    this.emit();
  }

  setStepMode(on: boolean) {
    this.stepMode = on;
    if (!on) this.openGate();
    this.emit();
  }

  /** Finish the running operation instantly. */
  skip() {
    if (!this.busy) return;
    this.skipping = true;
    this.paused = false;
    this.breakNext = false;
    this.openGate();
    this.flush();
    this.emit();
  }

  destroy() {
    this.dead = true;
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.openGate();
    this.flush();
  }

  private openGate() {
    const g = this.gate;
    this.gate = null;
    g?.();
  }

  private flush() {
    const jobs = [...this.jobs];
    this.jobs.clear();
    for (const j of jobs) {
      j.frame(1);
      j.resolve();
    }
    if (!this.dead) this.onFrame();
  }

  private kick() {
    if (this.raf !== null || this.dead) return;
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private readonly tick = (t: number) => {
    this.raf = null;
    // Clamp so a background tab does not make everything jump to the end at once.
    const dt = Math.min(64, Math.max(0, t - this.lastT));
    this.lastT = t;
    if (!this.paused) {
      for (const j of [...this.jobs]) {
        j.elapsed += dt * this.rate;
        const k = Math.min(1, j.elapsed / j.duration);
        j.frame(k);
        if (k >= 1) {
          this.jobs.delete(j);
          j.resolve();
        }
      }
      this.onFrame();
    }
    if (this.jobs.size && !this.dead) this.raf = requestAnimationFrame(this.tick);
  };
}

const noop = () => {};
