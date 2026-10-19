// Soundtrack for the tour video: an original music bed plus sound effects placed on the same
// timeline as the visuals (scene changes, camera punch-ins, the real clicks logged while
// recording, Bit, cards…). Everything is synthesized here — no samples, nothing to license.
//
//   node video/audio.mjs   → video/out/tour-audio.wav (48 kHz stereo)
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLICKS } from "./build/frames/manifest.js";
import { DURATION, END_AT, FEATURES_AT, FOOTAGE } from "./composition/scenes.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SR = 48000;
const N = Math.ceil(DURATION * SR);
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const MUS = bus(), FX = bus(), SEND = new Float32Array(N);

// deterministic noise, so every render sounds the same
let seed = 0x9e3779b9;
const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296 * 2 - 1; };
const TAU = Math.PI * 2;
const note = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI → Hz

/** Mix a mono generator into a bus with equal-power pan (−1…1) and an optional reverb send. */
function add(b, t0, dur, gen, { amp = 1, pan = 0, send = 0 } = {}) {
  const s0 = Math.max(0, Math.round(t0 * SR)), s1 = Math.min(N, Math.round((t0 + dur) * SR));
  const gl = Math.cos((pan + 1) * Math.PI / 4) * amp, gr = Math.sin((pan + 1) * Math.PI / 4) * amp;
  for (let i = s0; i < s1; i++) {
    const v = gen((i - Math.round(t0 * SR)) / SR, i);
    b.L[i] += v * gl; b.R[i] += v * gr;
    if (send) SEND[i] += v * amp * send;
  }
}

/** Band-pass filtered noise whose centre glides f0 → f1 (RBJ biquad, coefficients per sample). */
function noiseBand(f0, f1, q, dur) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (t) => {
    const f = f0 * (f1 / f0) ** Math.min(1, t / dur);
    const w = TAU * f / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al;
    const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0;
    const x = rand();
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}
const swell = (t, dur, peak = 0.6) => { const u = t / dur; return u < peak ? Math.sin((u / peak) * Math.PI / 2) ** 2 : Math.cos(((u - peak) / (1 - peak)) * Math.PI / 2) ** 2; };

// ---------- instruments ----------
function pluck(t0, f, o = {}) {
  const dec = o.dec ?? 0.9;
  add(o.bus ?? MUS, t0, dec * 5, (t) => Math.min(1, t / 0.005) * Math.exp(-t / dec) *
    (Math.sin(TAU * f * t) + 0.45 * Math.sin(TAU * 2 * f * t) * Math.exp(-t / (dec * 0.4)) + 0.18 * Math.sin(TAU * 3 * f * t) * Math.exp(-t / (dec * 0.25))), o);
}
function pad(t0, dur, freqs, amp) {
  for (const [i, f] of freqs.entries()) {
    add(MUS, t0, dur, (t) => swell(t, dur, 0.35) * (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 1.003 * t + 1) + 0.12 * Math.sin(TAU * 2 * f * t)), { amp: amp / freqs.length, pan: (i / (freqs.length - 1 || 1) - 0.5) * 0.8 });
  }
}
const kick = (t0, amp) => add(MUS, t0, 0.5, (t) => Math.sin(TAU * (50 * t + (90 * 0.045) * (1 - Math.exp(-t / 0.045)))) * Math.exp(-t / 0.17), { amp });
function hat(t0, amp, pan = 0.2) {
  let prev = 0;
  add(MUS, t0, 0.12, (t) => { const n = rand(); const hp = n - prev; prev = n; return hp * Math.exp(-t / 0.025); }, { amp, pan });
}
function click(t0, amp = 0.55, pan = 0) {
  add(FX, t0, 0.06, noiseBand(4200, 3600, 2.2, 0.03), { amp: amp * 0.9, pan });
  add(FX, t0, 0.05, (t) => Math.sin(TAU * 2100 * t) * Math.exp(-t / 0.008), { amp: amp * 0.35, pan });
  add(FX, t0, 0.06, (t) => Math.sin(TAU * 170 * t) * Math.exp(-t / 0.012), { amp: amp * 0.5, pan });
}
const tock = (t0, amp = 0.4, pan = 0) => add(FX, t0, 0.08, (t) => Math.sin(TAU * 720 * t) * Math.exp(-t / 0.018) + 0.4 * Math.sin(TAU * 1450 * t) * Math.exp(-t / 0.008), { amp, pan });
function whoosh(t0, dur, f0, f1, amp, pan = 0, q = 1.1) {
  const g = noiseBand(f0, f1, q, dur);
  add(FX, t0, dur, (t, i) => g(t, i) * swell(t, dur, 0.62), { amp, pan, send: 0.35 });
}
function panWhoosh(t0, dur, f0, f1, amp, p0, p1) {
  const g = noiseBand(f0, f1, 1.0, dur);
  const s0 = Math.round(t0 * SR);
  for (let i = s0; i < Math.min(N, s0 + Math.round(dur * SR)); i++) {
    const t = (i - s0) / SR, v = g(t) * swell(t, dur, 0.55) * amp, pan = p0 + (p1 - p0) * (t / dur);
    FX.L[i] += v * Math.cos((pan + 1) * Math.PI / 4); FX.R[i] += v * Math.sin((pan + 1) * Math.PI / 4); SEND[i] += v * 0.3;
  }
}
function pop(t0, amp = 0.45, pan = 0) {
  add(FX, t0, 0.25, (t) => Math.sin(TAU * (160 * t + (800 * 0.03) * (1 - Math.exp(-t / 0.03)))) * Math.exp(-t / 0.07), { amp, pan, send: 0.2 });
  add(FX, t0, 0.03, noiseBand(2500, 2500, 1.5, 0.02), { amp: amp * 0.4, pan });
}
const thump = (t0, amp = 0.5) => add(FX, t0, 0.5, (t) => Math.sin(TAU * (55 * t + 40 * 0.05 * (1 - Math.exp(-t / 0.05)))) * Math.exp(-t / 0.14), { amp });
const boing = (t0, amp = 0.3) => add(FX, t0, 0.6, (t) => Math.sin(TAU * (230 * t + 300 * (t - 0.12 * (1 - Math.exp(-t / 0.12)))) + 2.2 * Math.sin(TAU * 13 * t) * Math.exp(-t / 0.2)) * Math.exp(-t / 0.3), { amp, pan: 0.5, send: 0.2 });
const bloop = (t0, amp = 0.12, pan = 0) => add(FX, t0, 0.16, (t) => Math.sin(TAU * (380 * t + 600 * t * t)) * Math.sin(Math.PI * Math.min(1, t / 0.14)), { amp, pan });
function blip(t0, amp = 0.16, pan = 0) {
  for (const [k, f] of [[0, 988], [0.07, 1319]].entries()) {
    add(FX, t0 + f[0], 0.07, (t) => (Math.sin(TAU * f[1] * t) + 0.2 * Math.sin(TAU * 3 * f[1] * t)) * Math.sin(Math.PI * t / 0.06) * (k ? 1 : 0.8), { amp, pan });
  }
}
const tick = (t0, f, amp = 0.16, pan = 0) => add(FX, t0, 0.12, (t) => Math.sin(TAU * f * t) * Math.exp(-t / 0.028) + 0.3 * Math.sin(TAU * 2.01 * f * t) * Math.exp(-t / 0.012), { amp, pan, send: 0.15 });
const key = (t0, amp = 0.07) => add(FX, t0, 0.03, noiseBand(5500, 5000, 2, 0.02), { amp, pan: 0.3 });
function ding(t0, amp = 0.35, f = 1318.5) {
  [[1, 1.6], [2.0, 1.0], [2.76, 0.7], [5.4, 0.35]].forEach(([m, d], k) => add(FX, t0, d * 4, (t) => Math.sin(TAU * f * m * t) * Math.exp(-t / d) * Math.min(1, t / 0.002), { amp: amp / (1 + k * 0.8), send: 0.4 }));
}

// ---------- music: 96 BPM, C – Am – F – G, bars aligned to the montage ----------
const BEAT = 60 / 96, BAR = BEAT * 4, GROOVE_AT = FOOTAGE[0].start, GROOVE_END = FEATURES_AT;
const CHORDS = [
  { root: 48, tones: [60, 64, 67, 71, 74] }, // Cmaj9
  { root: 45, tones: [57, 60, 64, 67] }, // Am7
  { root: 41, tones: [57, 60, 64, 65] }, // Fmaj7
  { root: 43, tones: [55, 59, 62, 64] }, // G6
];
for (let n = -3; GROOVE_AT + n * BAR < DURATION; n++) {
  const t = GROOVE_AT + n * BAR, ch = CHORDS[((n % 4) + 4) % 4];
  if (t + BAR < 0) continue;
  const groove = t >= GROOVE_AT - 0.01 && t < GROOVE_END - 0.01;
  const ending = t >= END_AT - BAR;
  const freqs = ch.tones.map(note);
  if (t >= -0.01 && !ending) pad(Math.max(0, t), BAR + 0.6, freqs, groove ? 0.05 : 0.07);
  if (!groove && !ending) continue;
  if (ending) continue;
  pluck(t, note(ch.root), { amp: 0.16, dec: 0.5 });
  pluck(t + BEAT * 2, note(ch.root), { amp: 0.11, dec: 0.4 });
  freqs.forEach((f, k) => { pluck(t + k * 0.012, f, { amp: 0.045, dec: 1.0, pan: (k / freqs.length - 0.5) * 0.7 }); pluck(t + BEAT * 1.5 + k * 0.012, f, { amp: 0.028, dec: 0.6, pan: (k / freqs.length - 0.5) * 0.7 }); });
  kick(t, 0.22); kick(t + BEAT * 2, 0.17);
  for (let e = 0; e < 8; e++) hat(t + e * BEAT / 2, e % 2 ? 0.05 : 0.025, e % 2 ? 0.25 : -0.2);
}
// features: a bright arpeggio over C; end: one resolved chord ringing out
for (let k = 0; k < 16; k++) pluck(FEATURES_AT + k * BEAT / 2, note([72, 76, 79, 84, 79, 76][k % 6]), { amp: 0.05, dec: 0.5, pan: (k % 4) / 3 - 0.5 });
pad(END_AT - 0.2, DURATION - END_AT + 0.2, [48, 55, 60, 64, 67, 71].map(note), 0.12);
pluck(END_AT + 1.15, note(36), { amp: 0.2, dec: 1.6 });

// ---------- sound effects on the visual timeline (times mirror composition/main.js) ----------
// hook
whoosh(0.1, 0.9, 300, 900, 0.08);
[0.3, 0.4, 0.5].forEach((t, i) => tick(t + 0.08, [784, 880, 988][i], 0.14, -0.2 + i * 0.2));
[0.85, 0.95].forEach((t, i) => tick(t + 0.08, [1047, 1175][i], 0.14));
whoosh(1.45, 0.6, 900, 3400, 0.16, 0.2, 1.6); // underline swish
boing(1.85, 0.26);
thump(2.48, 0.25);
whoosh(2.95, 0.5, 2000, 500, 0.12);
[3.35, 3.43, 3.51, 3.59].forEach((t, i) => tick(t + 0.08, [659, 784, 880, 988][i], 0.13));
pop(3.95, 0.5, 0.1);
ding(4.08, 0.12, 2637);
whoosh(5.75, 0.5, 1800, 400, 0.12);

// montage: window reveal, transitions, labels, URL typing, clicks and camera moves
whoosh(5.95, 0.95, 200, 1400, 0.22);
thump(6.75, 0.32);
const sceneClicks = (s) => {
  const first = s.parts[0];
  return (CLICKS[s.clip] ?? []).map((e) => ({ ...e, at: s.start + (e.t - first.src) / first.rate })).filter((e) => e.at >= s.start - 0.05 && e.at < s.end);
};
FOOTAGE.forEach((s, i) => {
  s.end = i < FOOTAGE.length - 1 ? FOOTAGE[i + 1].start : FEATURES_AT;
  const prev = FOOTAGE[i - 1];
  if (prev) {
    if (s.layout === "grid") {
      whoosh(s.start, 0.5, 1500, 400, 0.14);
      s.parts.forEach((_, k) => { pop(s.start + 0.1 + k * 0.12, 0.32, k % 2 ? 0.4 : -0.4); pluck(s.start + 0.12 + k * 0.12, note([72, 76, 79, 84][k]), { bus: FX, amp: 0.09, dec: 0.5 }); });
      whoosh(s.end - 0.35, 0.45, 1200, 300, 0.12);
    } else if (s.enter === "float") {
      whoosh(s.start, 1.1, 1600, 300, 0.2, prev.layout === "left" ? -0.5 : 0.5, 0.8);
      whoosh(s.start + 0.3, 0.8, 300, 1300, 0.14);
      ding(s.start + 0.95, 0.05, 1568);
    } else if (s.enter === "push") panWhoosh(s.start, 0.6, 500, 1800, 0.24, 0.8, -0.8);
    else if (s.enter === "zoom") { whoosh(s.start, 0.6, 250, 1600, 0.22); thump(s.start + 0.45, 0.2); }
    else if (s.enter === "morph") whoosh(s.start, 0.8, 400, 900, 0.12);
    else panWhoosh(s.start, 0.6, 900, 2800, 0.2, -0.7, 0.7); // wipe
    bloop(s.start + 0.3, 0.1, HOSTS_PAN(s));
  }
  if (s.title && s.layout !== "grid") tick(s.start + 0.2, 1175, 0.09, -0.3);
  if (s.say) blip(s.start + 0.6, 0.13, HOSTS_PAN(s));
  if (!prev || prev.url !== s.url) for (let c = 0; c < s.url.length; c += 2) key((i === 0 ? 6.9 : s.start + 0.1) + (c / s.url.length) * 0.45);
  for (const e of sceneClicks(s)) {
    const pan = (e.x - 0.5) * 0.8;
    if (e.kind === "grab" || e.kind === "release") tock(e.at, 0.35, pan);
    else click(e.at, 0.5, pan);
    if (!s.follow && s.punch !== false && e.kind === "click") whoosh(e.at - 0.45, 0.42, 500, 2200, 0.1, pan, 1.4);
    if (s.follow) whoosh(e.at - 0.5, 0.45, 700, 1500, 0.05, pan, 1.4);
  }
  if (s.layout === "explode") {
    panWhoosh(s.start + 1.05, 0.7, 600, 1800, 0.2, 0, -0.8);
    panWhoosh(s.start + 1.05, 0.7, 600, 1800, 0.2, 0, 0.8);
    [0, 1, 2].forEach((j) => tick(s.start + 1.6 + j * 0.14, [880, 988, 1175][j], 0.12, j - 1));
    panWhoosh(s.end - 1.05, 0.7, 1800, 600, 0.16, -0.8, 0);
    panWhoosh(s.end - 1.05, 0.7, 1800, 600, 0.16, 0.8, 0);
    [-0.6, 0.6].forEach((pan) => { tock(s.end - 0.35, 0.3, pan); thump(s.end - 0.35, 0.14); });
  }
});
function HOSTS_PAN(s) { return { right: -0.6, left: 0.6, full: 0.8, explode: 0, grid: 0.8 }[s.layout] ?? 0; }

// features and end card
whoosh(FEATURES_AT - 0.4, 0.6, 1500, 300, 0.16);
whoosh(FEATURES_AT + 0.05, 0.6, 400, 1500, 0.12);
blip(FEATURES_AT + 0.9, 0.12);
for (let j = 0; j < 6; j++) { pop(FEATURES_AT + 0.35 + j * 0.09, 0.22, (j % 3 - 1) * 0.5); pluck(FEATURES_AT + 0.37 + j * 0.09, note([72, 74, 76, 79, 81, 84][j]), { bus: FX, amp: 0.08, dec: 0.45 }); }
whoosh(END_AT - 0.5, 0.5, 1400, 300, 0.14);
for (let j = 0; j < 7; j++) tick(END_AT + 0.15 + j * 0.055, [523, 587, 659, 784, 880, 1047, 1175][j], 0.08, (j - 3) * 0.12);
pop(END_AT + 1.15, 0.4);
ding(END_AT + 1.2, 0.3);
blip(END_AT + 1.7, 0.12, 0.4);

// ---------- reverb (Freeverb-style combs + allpasses on the send), mix, limit, write ----------
function reverb(input) {
  const outL = new Float32Array(N), outR = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ buf: new Float32Array(d), i: 0, lp: 0 }));
  const aps = [225, 556, 441].map((d) => ({ buf: new Float32Array(d), i: 0 }));
  for (let n = 0; n < N; n++) {
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.6 + c.lp * 0.4;
      c.buf[c.i] = input[n] * 0.015 + c.lp * 0.84;
      c.i = (c.i + 1) % c.buf.length;
      acc += y;
    }
    for (const a of aps) { const b = a.buf[a.i]; a.buf[a.i] = acc + b * 0.5; acc = b - acc; a.i = (a.i + 1) % a.buf.length; }
    outL[n] = acc; outR[n] = n > 23 ? outL[n - 23] : 0;
  }
  return { L: outL, R: outR };
}
const VERB = reverb(SEND);
const out = Buffer.alloc(N * 4);
let peak = 0;
const mixL = new Float32Array(N), mixR = new Float32Array(N);
for (let n = 0; n < N; n++) {
  const fade = Math.min(1, (DURATION - n / SR) / 0.5, n / SR / 0.02);
  mixL[n] = (MUS.L[n] * 0.85 + FX.L[n] + VERB.L[n] * 0.9) * fade;
  mixR[n] = (MUS.R[n] * 0.85 + FX.R[n] + VERB.R[n] * 0.9) * fade;
  peak = Math.max(peak, Math.abs(mixL[n]), Math.abs(mixR[n]));
}
const gain = 0.9 / (peak || 1);
for (let n = 0; n < N; n++) {
  out.writeInt16LE(Math.round(Math.tanh(mixL[n] * gain * 1.1) * 32000), n * 4);
  out.writeInt16LE(Math.round(Math.tanh(mixR[n] * gain * 1.1) * 32000), n * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0); header.writeUInt32LE(36 + out.length, 4); header.write("WAVE", 8);
header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
header.write("data", 36); header.writeUInt32LE(out.length, 40);
const file = join(HERE, "out", "tour-audio.wav");
writeFileSync(file, Buffer.concat([header, out]));
console.log(`wrote ${file} (${DURATION}s, peak gain ${gain.toFixed(2)})`);
