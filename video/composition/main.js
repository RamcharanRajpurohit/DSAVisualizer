// AlgoLab demo video. Every visual is a pure function of time — renderAt(t) — so the renderer
// can seek to any frame and get the same pixels (the HyperFrames idea, without the dependency).
import { COUNTS } from "../build/frames/manifest.js";
import { DURATION, END_AT, FEATURES_AT, FOOTAGE, FPS, WIPE } from "./scenes.js";

const $ = (id) => document.getElementById(id);

// ---------- easing & tween helpers ----------
const E = {
  lin: (x) => x,
  out: (x) => 1 - (1 - x) ** 3,
  out5: (x) => 1 - (1 - x) ** 5,
  in: (x) => x ** 3,
  inOut: (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  back: (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
  back2: (x) => 1 + 3.6 * (x - 1) ** 3 + 2.6 * (x - 1) ** 2,
};
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const p = (t, t0, d, e = "out") => E[e](cl((t - t0) / d));
const mix = (a, b, k) => a + (b - a) * k;

function put(el, { x = 0, y = 0, s = 1, r = 0, o = 1, blur = 0 } = {}) {
  el.style.transform = `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`;
  el.style.opacity = String(cl(o));
  el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
  el.style.visibility = o <= 0.002 ? "hidden" : "visible";
}

// ---------- scene data ----------
FOOTAGE.forEach((s, i) => { s.end = i < FOOTAGE.length - 1 ? FOOTAGE[i + 1].start : FEATURES_AT; });
const AREAS = ["Sorting", "Graphs", "Trees", "Stacks"];

const FEATURES = [
  ["Code in sync", "pseudocode highlights every step", '<path d="M8 6 2 12l6 6M16 6l6 6-6 6"/>'],
  ["Five code tabs", "pseudocode · Python · C++ · Java · JS", '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M10 13l-2 2 2 2M14 13l2 2-2 2"/>'],
  ["Step & scrub", "pause, rewind, 0.25× to 4×", '<path d="M5 4v16M9 5l10 7-10 7z"/>'],
  ["Learn & quiz", "guided lessons and quick quizzes", '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'],
  ["Share a run", "one link restores your exact setup", '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'],
  ["Totally free", "44 topics · no sign-up · any browser", '<path d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9z"/>'],
];

// ---------- build the DOM that depends on data ----------
$("chapters").innerHTML = AREAS.map((a) => `<span data-a="${a}">${a}<i></i></span>`).join("");
$("labels").innerHTML = FOOTAGE.map((s) => `
  <div class="abs label" id="lab-${s.id}">
    <div class="k mono fx"><b>${s.chapter}</b>${s.area}</div>
    <div class="t serif fx">${s.title}</div>
    <div class="s serif fx">${s.sub}</div>
    <div class="chips">${s.chips.map((c) => `<span class="chip mono fx">${c}</span>`).join("")}</div>
  </div>`).join("");
$("cards").innerHTML = FEATURES.map(([h, sub, icon], j) => `
  <div class="abs card fx" style="left:${178 + (j % 3) * 532}px; top:${330 + Math.floor(j / 3) * 224}px">
    <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></div>
    <div><h3 class="serif">${h}</h3><p class="mono">${sub}</p></div>
  </div>`).join("");
$("wordmark").innerHTML = [..."AlgoLab"].map((c) => `<span class="mask"><span>${c}</span></span>`).join("");

const words = (id) => [...$(id).querySelectorAll(".mask > span")];
const H1 = words("h1"), H2 = words("h2"), H3 = words("hook2"), WM = words("wordmark");
const UL = $("ul"), UL_LEN = UL.getTotalLength();
UL.style.strokeDasharray = String(UL_LEN);
const chapterEls = [...$("chapters").children];
const labelEls = FOOTAGE.map((s) => [...$(`lab-${s.id}`).querySelectorAll(".fx")]);
const cardEls = [...$("cards").children];

// ---------- footage frames ----------
const pending = [];
const frameUrl = (s, t) => {
  const n = cl(Math.floor((t - s.start) * FPS) + 1, 1, COUNTS[s.id]);
  return `../build/frames/${s.id}/${String(n).padStart(5, "0")}.jpg`;
};
function show(img, src) {
  if (img.dataset.src === src) return;
  img.dataset.src = src;
  img.src = src;
  pending.push(img.decode().catch(() => {}));
}
const zoomOf = (s, t) => {
  const k = E.inOut(cl((t - s.start) / (s.end - s.start)));
  return `scale(${mix(s.zoom.from, s.zoom.to, k)})`;
};
const originOf = (s) => `${s.zoom.x * 100}% ${s.zoom.y * 100}%`;

// ---------- Bit ----------
const BIT_PATH = [
  { t: 1.75, x: 1600, y: 1330, s: 1.9 },
  { t: 2.5, x: 1600, y: 965, s: 1.9, ease: "back" },
  { t: 5.85, x: 1600, y: 965, s: 1.9 },
  { t: 6.75, x: 190, y: 968, s: 1.05, ease: "inOut", hop: 210 },
  { t: 41.55, x: 190, y: 968, s: 1.05 },
  { t: 42.35, x: 960, y: 1018, s: 1.05, ease: "inOut", hop: 150 },
  { t: 46.35, x: 960, y: 1018, s: 1.05 },
  { t: 47.25, x: 1400, y: 835, s: 1.25, ease: "inOut", hop: 150 },
];
function bitPos(t) {
  if (t <= BIT_PATH[0].t) return { ...BIT_PATH[0], land: 99 };
  for (let i = 0; i < BIT_PATH.length - 1; i++) {
    const a = BIT_PATH[i], b = BIT_PATH[i + 1];
    if (t <= b.t) {
      const k = E[b.ease ?? "lin"](cl((t - a.t) / (b.t - a.t)));
      const lin = cl((t - a.t) / (b.t - a.t));
      return { x: mix(a.x, b.x, k), y: mix(a.y, b.y, k) - Math.sin(Math.PI * lin) * (b.hop ?? 0), s: mix(a.s, b.s, k), land: 99, moving: a.x !== b.x };
    }
  }
  const last = BIT_PATH.at(-1);
  return { ...last, land: t - last.t };
}

const SAYINGS = [
  { t0: 4.35, t1: 5.7, text: "let me show you!" },
  ...FOOTAGE.map((s) => ({ t0: s.start + 0.45, t1: s.start + 2.9, text: s.say })),
  { t0: 42.7, t1: 45.6, text: "and lots more ✦" },
  { t0: 48.3, t1: 51.4, text: "see you there!", side: "beside" },
];
const HOPS = [3.95, ...FOOTAGE.map((s) => s.start + 0.3), 44.1];
const HAPPY = [[3.98, 5.65], ...FOOTAGE.map((s) => [s.start + 0.35, s.start + 1.5]), [42.4, 46.3], [47.3, 52]];

function renderBit(t) {
  const pos = bitPos(t);
  let { x, y, s } = pos;
  // idle bob, plus hops on cues
  y += Math.sin(t * 2.6) * 4 * s;
  for (const h of HOPS) {
    const k = (t - h) / 0.42;
    if (k > 0 && k < 1) y -= Math.sin(Math.PI * k) * 34 * s;
  }
  const happy = HAPPY.some(([a, b]) => t >= a && t <= b);
  const celebrating = t > 42.4;
  // squash on landings
  let sy = 1, sx = 1;
  for (const k of BIT_PATH) if (k.ease) { const d = (t - k.t) / 0.28; if (d > 0 && d < 1) { sy -= 0.12 * Math.sin(Math.PI * d); sx += 0.08 * Math.sin(Math.PI * d); } }
  const el = $("bit");
  el.style.transform = `translate(${x - 60 * s}px, ${y - 138 * s}px) scale(${s})`;
  el.style.visibility = t < 1.7 ? "hidden" : "visible";
  $("bbody").setAttribute("transform", `translate(0 37) scale(${sx} ${sy}) translate(0 -37)`);
  const wave = celebrating || happy ? Math.sin(t * 11) * 24 : Math.sin(t * 2.6) * 6;
  $("bant").setAttribute("transform", `rotate(${wave} 0 -37)`);
  // gaze: at the hook text while it reads, then at the window, then at the viewer
  const gaze = t < 5.85 ? { x: -0.9, y: -0.2 } : t < 41.6 ? { x: 0.9, y: -0.15 } : { x: 0, y: 0.1 };
  $("bface").setAttribute("transform", `translate(${gaze.x * 4.5} ${gaze.y * 3.5})`);
  const blink = !happy && (t * 1000) % 3300 < 120;
  $("beyes").setAttribute("transform", `translate(0 -4) scale(1 ${blink ? 0.1 : 1}) translate(0 4)`);
  $("bopen").setAttribute("opacity", happy ? 0 : 1);
  $("bhappy").setAttribute("opacity", happy ? 1 : 0);
  $("bsmile").setAttribute("opacity", happy ? 0 : 1);
  $("bgrin").setAttribute("opacity", happy ? 1 : 0);
  $("bblush").setAttribute("opacity", celebrating ? 0.55 : happy ? 0.35 : 0);

  // speech bubble
  const b = $("bubble");
  const say = SAYINGS.find((q) => t >= q.t0 - 0.01 && t <= q.t1 + 0.25);
  if (!say) { b.style.visibility = "hidden"; return; }
  if (b.textContent !== say.text) b.textContent = say.text;
  const k = p(t, say.t0, 0.45, "back2"), o = 1 - p(t, say.t1, 0.25, "in");
  const mode = say.side ?? (pos.x > 1300 ? "left" : "right");
  const w = b.offsetWidth, h = b.offsetHeight;
  const bx = mode === "left" ? x - 30 * s - w : mode === "beside" ? x + 62 * s : x + 36 * s;
  const by = mode === "beside" ? y - 88 * s - h / 2 : y - 132 * s - 58;
  b.style.transformOrigin = mode === "left" ? "100% 100%" : mode === "beside" ? "0% 50%" : "0% 100%";
  b.classList.toggle("r", mode === "left");
  b.classList.toggle("side", mode === "beside");
  put(b, { x: bx, y: by, s: mix(0.3, 1, k), o: cl(k * 3) * o });
}

// ---------- the timeline ----------
function renderAt(t) {
  $("grid").style.transform = `translate(${-(t * 7) % 30}px, ${-(t * 3) % 30}px)`;

  // 1 · hook — "Algorithms are hard to picture."
  {
    const out = p(t, 2.95, 0.45, "in");
    put($("kicker"), { y: mix(16, 0, p(t, 0.15, 0.7, "out5")) - out * 50, o: p(t, 0.15, 0.6) * (1 - out) });
    H1.forEach((w, i) => { w.style.transform = `translateY(${mix(110, 0, p(t, 0.3 + i * 0.1, 0.75, "out5"))}%)`; });
    H2.forEach((w, i) => { w.style.transform = `translateY(${mix(110, 0, p(t, 0.85 + i * 0.1, 0.75, "out5"))}%)`; });
    UL.style.strokeDashoffset = String(UL_LEN * (1 - p(t, 1.45, 0.6, "inOut")));
    put($("h1"), { y: -out * 70, o: 1 - out, blur: out * 6 });
    const out2 = p(t, 3.0, 0.45, "in");
    put($("h2"), { y: -out2 * 70, o: 1 - out2, blur: out2 * 6 });
  }

  // 2 · "So we made them move."
  {
    const vis = t > 3.25 && t < 6.3;
    const hook2 = $("hook2");
    H3.forEach((w, i) => { w.style.transform = `translateY(${mix(110, 0, p(t, 3.35 + i * 0.08, 0.7, "out5"))}%)`; });
    const k = p(t, 3.95, 0.7, "back2");
    const sway = t > 4.5 ? Math.sin((t - 4.5) * 7.5) * 16 * Math.min(1, (t - 4.5) * 2) : 0;
    put($("move"), { x: sway, s: mix(0.2, 1, k), r: mix(-16, -3, k) + sway * 0.12, o: p(t, 3.95, 0.12) });
    const out = p(t, 5.75, 0.45, "in");
    put(hook2, { y: -out * 40, s: mix(1, 0.92, out), o: vis ? 1 - out : 0, blur: out * 8 });
  }

  // 3 · montage chrome
  {
    const i = p(t, 6.3, 0.6, "out5"), o = p(t, 41.3, 0.4, "in");
    put($("brand"), { y: mix(-20, 0, i) - o * 20, o: i * (1 - o) });
    put($("chapters"), { y: mix(-20, 0, i) - o * 20, o: i * (1 - o) });
    for (const el of chapterEls) {
      let a = 0;
      for (const s of FOOTAGE) if (s.area === el.dataset.a) a = Math.max(a, p(t, s.start, 0.35) * (1 - p(t, s.end - 0.1, 0.35)));
      el.style.opacity = String(mix(0.34, 1, a));
      el.querySelector("i").style.transform = `scaleX(${a})`;
    }
  }

  // 4 · browser window with footage
  {
    const win = $("win");
    const wi = p(t, 6.0, 0.9, "back"), wo = p(t, 41.4, 0.55, "in");
    put(win, { y: mix(260, 0, wi) - wo * 60, s: mix(0.86, 1, wi) * mix(1, 0.94, wo), o: p(t, 6.0, 0.25) * (1 - wo), blur: wo * 6 });
    if (t > 5.9 && t < 42.1) {
      let ci = 0;
      FOOTAGE.forEach((s, i) => { if (t >= s.start) ci = i; });
      const cur = FOOTAGE[ci];
      const prev = ci > 0 && t < cur.start + WIPE ? FOOTAGE[ci - 1] : null;
      const fa = $("fa"), fb = $("fb"), edge = $("edge");
      const base = prev ?? cur;
      show(fa, frameUrl(base, t));
      fa.style.transform = zoomOf(base, t);
      fa.style.transformOrigin = originOf(base);
      if (prev) {
        const k = p(t, cur.start, WIPE, "inOut");
        show(fb, frameUrl(cur, t));
        fb.style.visibility = "visible";
        fb.style.clipPath = `inset(0 ${(1 - k) * 100}% 0 0)`;
        fb.style.transform = zoomOf(cur, t);
        fb.style.transformOrigin = originOf(cur);
        edge.style.visibility = "visible";
        edge.style.left = `${k * 1240}px`;
      } else {
        fb.style.visibility = "hidden";
        edge.style.visibility = "hidden";
      }
      // URL: type the path in
      const typeStart = ci === 0 ? 6.75 : cur.start + 0.1;
      const n = Math.round(cl((t - typeStart) / 0.45) * cur.url.length);
      $("path").textContent = cur.url.slice(0, n);
      const typing = t >= typeStart && t < typeStart + 0.9;
      $("caret").style.visibility = typing && (n < cur.url.length || Math.floor(t * 4) % 2 === 0) ? "visible" : "hidden";
    }
  }

  // 5 · scene labels
  FOOTAGE.forEach((s, i) => {
    const inAt = s.start + (i === 0 ? 0.4 : 0.15), outAt = s.end - 0.32;
    const box = $(`lab-${s.id}`);
    const live = t > inAt - 0.05 && t < s.end + 0.05;
    box.style.display = live ? "" : "none";
    if (!live) return;
    labelEls[i].forEach((el, j) => {
      const ki = p(t, inAt + j * 0.07, 0.6, "out5"), ko = p(t, outAt + j * 0.025, 0.3, "in");
      put(el, { y: mix(36, 0, ki) - ko * 26, o: ki * (1 - ko), blur: (1 - ki) * 6 + ko * 4 });
    });
  });

  // 6 · feature cards
  {
    const hi = p(t, FEATURES_AT + 0.05, 0.7, "out5"), ho = p(t, END_AT - 0.5, 0.4, "in");
    put($("fhead"), { y: mix(40, 0, hi) - ho * 30, o: hi * (1 - ho), blur: (1 - hi) * 6 });
    cardEls.forEach((c, j) => {
      const at = FEATURES_AT + 0.35 + j * 0.09;
      const k = p(t, at, 0.75, "back"), o = p(t, END_AT - 0.45 + j * 0.02, 0.4, "in");
      put(c, { y: mix(70, 0, k) - o * 40, s: mix(0.93, 1, k), o: p(t, at, 0.25) * (1 - o) });
    });
  }

  // 7 · end card
  {
    const fade = 1 - p(t, DURATION - 0.55, 0.5, "in"); // fades to paper, so the loop restarts cleanly
    WM.forEach((w, j) => { w.style.transform = `translateY(${mix(110, 0, p(t, END_AT + 0.1 + j * 0.055, 0.8, "out5"))}%)`; });
    put($("wordmark"), { s: mix(1, 1.025, p(t, END_AT, DURATION - END_AT, "lin")), o: (t > END_AT ? 1 : 0) * fade });
    const tg = p(t, END_AT + 0.75, 0.7, "out5");
    put($("tagline"), { y: mix(26, 0, tg), o: tg * fade });
    const chip = $("urlchip"), ck = p(t, END_AT + 1.15, 0.75, "back2");
    put(chip, { x: -chip.offsetWidth / 2, s: mix(0.4, 1, ck), r: mix(-6, 0, ck), o: p(t, END_AT + 1.15, 0.2) * fade });
    const tp = p(t, END_AT + 1.6, 0.7, "out5"), fr = p(t, END_AT + 1.85, 0.7, "out5");
    put($("topics"), { y: mix(20, 0, tp), o: tp * fade });
    put($("free"), { y: mix(20, 0, fr), o: fr * fade });
    $("bit").style.opacity = String(t > END_AT ? fade : 1);
  }

  renderBit(t);
}

// ---------- drivers ----------
const params = new URLSearchParams(location.search);
window.__duration = DURATION;
window.__fps = FPS;
window.__ready = document.fonts.ready.then(() => document.fonts.load('400 100px "Instrument Serif"'));
window.__seek = async (t) => {
  pending.length = 0;
  renderAt(t);
  await Promise.all(pending);
};

if (params.has("render")) {
  document.body.classList.add("render");
} else if (params.has("t")) {
  window.__ready.then(() => window.__seek(Number(params.get("t"))));
} else {
  const t0 = performance.now();
  const loop = () => {
    const t = ((performance.now() - t0) / 1000) % DURATION;
    renderAt(t);
    $("tc").textContent = t.toFixed(2) + "s";
    requestAnimationFrame(loop);
  };
  window.__ready.then(loop);
}
