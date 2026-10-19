// AlgoLab tour video. Every visual is a pure function of time — renderAt(t) — so the renderer
// can seek to any frame and get the same pixels (the HyperFrames idea, without the dependency).
import { CLICKS, COUNTS } from "../build/frames/manifest.js";
import { DURATION, END_AT, FEATURES_AT, FOOTAGE, FPS, HOSTS, LAYOUTS, PANES, WIPE } from "./scenes.js";

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
FOOTAGE.forEach((s, i) => {
  s.end = i < FOOTAGE.length - 1 ? FOOTAGE[i + 1].start : FEATURES_AT;
  s.prev = FOOTAGE[i - 1];
  const first = s.parts[0];
  // clicks logged while recording, moved onto this scene's timeline
  s.clicks = (CLICKS[s.clip] ?? [])
    .map((e) => ({ ...e, at: s.start + (e.t - first.src) / first.rate }))
    .filter((e) => e.at > s.start - 0.2 && e.at < s.end + 0.3);
});
const AREAS = [...new Set(FOOTAGE.map((s) => s.area).filter(Boolean))];
const partKey = (s, k) => (s.parts.length > 1 ? `${s.id}-${k}` : s.id);
const sceneAt = (t) => { let c = FOOTAGE[0]; for (const s of FOOTAGE) if (t >= s.start) c = s; return c; };

const FEATURES = [
  ["Code in sync", "pseudocode highlights every step", '<path d="M8 6 2 12l6 6M16 6l6 6-6 6"/>'],
  ["Your own input", "type values, or leave it blank for random", '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>'],
  ["Keyboard-first", "space, arrow keys, F for fullscreen", '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'],
  ["Learn & quiz", "guided lessons and quick quizzes", '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'],
  ["Share a run", "one link restores your exact setup", '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'],
  ["Totally free", "44 topics · no sign-up · any browser", '<path d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9z"/>'],
];

// ---------- build the DOM that depends on data ----------
$("chapters").innerHTML = AREAS.map((a) => `<span data-a="${a}">${a}<i></i></span>`).join("");
const LABEL_POS = { right: "left:96px; top:300px", left: "left:1370px; top:300px" };
$("labels").innerHTML = FOOTAGE.filter((s) => s.title && s.layout !== "grid").map((s) => {
  const lt = s.layout === "full";
  const pos = lt ? (s.lt === "top" ? "left:186px; top:170px" : "left:186px; top:auto; bottom:52px") : LABEL_POS[s.layout];
  return `
  <div class="abs label${lt ? " lt" : ""}" id="lab-${s.id}" style="${pos}">
    <div class="k mono fx"><b>${s.chapter}</b>${s.area}</div>
    <div class="t serif fx">${s.title}</div>
    <div class="s serif fx">${s.sub}</div>
    <div class="chips">${(s.chips ?? []).map((c) => `<span class="chip mono fx">${c}</span>`).join("")}</div>
  </div>`;
}).join("");
$("cards").innerHTML = FEATURES.map(([h, sub, icon], j) => `
  <div class="abs card fx" style="left:${178 + (j % 3) * 532}px; top:${330 + Math.floor(j / 3) * 224}px">
    <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></div>
    <div><h3 class="serif">${h}</h3><p class="mono">${sub}</p></div>
  </div>`).join("");
$("wordmark").innerHTML = [..."AlgoLab"].map((c) => `<span class="mask"><span>${c}</span></span>`).join("");

const GRID = FOOTAGE.find((s) => s.layout === "grid");
const CELL = { w: 760, h: 428, gap: 26, x: 187, y: 168 };
if (GRID) {
  $("cells").innerHTML = GRID.parts.map((part, k) => `
    <div class="cell fx" style="left:${CELL.x + (k % 2) * (CELL.w + CELL.gap)}px; top:${CELL.y + Math.floor(k / 2) * (CELL.h + CELL.gap)}px">
      <img alt=""><span class="tag mono">${part.name}</span>
    </div>`).join("");
  $("gtitle").innerHTML = `${GRID.title}<span class="mono">${GRID.parts.map((q) => q.name).join(" · ")} — same graph</span>`;
}

const words = (id) => [...$(id).querySelectorAll(".mask > span")];
const H1 = words("h1"), H2 = words("h2"), H3 = words("hook2"), WM = words("wordmark");
const UL = $("ul"), UL_LEN = UL.getTotalLength();
UL.style.strokeDasharray = String(UL_LEN);
const chapterEls = [...$("chapters").children];
const labelEls = Object.fromEntries(FOOTAGE.filter((s) => $(`lab-${s.id}`)).map((s) => [s.id, [...$(`lab-${s.id}`).querySelectorAll(".fx")]]));
const cardEls = [...$("cards").children];
const cellEls = [...$("cells").children];

// ---------- frames ----------
const pending = [];
const frameUrl = (s, k, t) => {
  const key = partKey(s, k);
  const n = cl(Math.floor((t - s.start) * FPS) + 1, 1, COUNTS[key]);
  return `../build/frames/${key}/${String(n).padStart(5, "0")}.jpg`;
};
function show(img, src) {
  if (img.dataset.src === src) return;
  img.dataset.src = src;
  img.src = src;
  pending.push(img.decode().catch(() => {}));
}

// ---------- camera ----------
function keyed(keys, r) {
  const at = (k) => ({ z: k[1], cx: k[2], cy: k[3] });
  if (r <= keys[0][0]) return at(keys[0]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (r <= b[0]) {
      const k = E.inOut((r - a[0]) / (b[0] - a[0]));
      return { z: mix(a[1], b[1], k), cx: mix(a[2], b[2], k), cy: mix(a[3], b[3], k) };
    }
  }
  return at(keys.at(-1));
}
/** Camera for scene `s` at time t: path + click punch-ins, or cursor-follow. */
function camAt(s, t) {
  let c;
  if (s.follow) {
    const ev = s.clicks;
    let fx = ev[0]?.x ?? 0.5;
    for (const e of ev.slice(1)) fx = mix(fx, e.x, p(t, e.at - 0.5, 0.45, "inOut"));
    const z = mix(1.15, s.follow.z, p(t, s.start, 0.8, "inOut"));
    c = { z, cx: fx, cy: s.follow.y };
  } else {
    c = keyed(s.cam ?? [[0, 1, 0.5, 0.5]], t - s.start);
    if (s.punch !== false) {
      for (const e of s.clicks) {
        if (e.kind === "release") continue;
        const d = t - e.at;
        const k = d < -0.45 ? 0 : d < -0.05 ? E.inOut((d + 0.45) / 0.4) : d < 0.5 ? 1 : d < 1.05 ? 1 - E.inOut((d - 0.5) / 0.55) : 0;
        if (k > 0) c = { z: mix(c.z, Math.max(c.z * 1.25, 1.95), k), cx: mix(c.cx, e.x, k), cy: mix(c.cy, e.y, k) };
      }
    }
  }
  const h = 0.5 / c.z;
  return { z: c.z, cx: cl(c.cx, h, 1 - h), cy: cl(c.cy, h, 1 - h) };
}
const camCss = (c, W, H) => `translate(${W * (0.5 - c.cx * c.z)}px, ${H * (0.5 - c.cy * c.z)}px) scale(${c.z})`;

// ---------- Bit ----------
const BIT_PATH = [
  { t: 1.75, x: 1600, y: 1330, s: 1.9 },
  { t: 2.5, x: 1600, y: 965, s: 1.9, ease: "back" },
  { t: 5.85, x: 1600, y: 965, s: 1.9 },
];
for (const s of FOOTAGE) {
  const h = HOSTS[s.layout];
  BIT_PATH.push({ t: s.start + 0.7, ...h, ease: "inOut", hop: 150 }, { t: s.end - 0.02, ...h });
}
BIT_PATH.push(
  { t: FEATURES_AT + 0.55, x: 960, y: 1018, s: 1.05, ease: "inOut", hop: 150 },
  { t: END_AT - 0.25, x: 960, y: 1018, s: 1.05 },
  { t: END_AT + 0.65, x: 1400, y: 790, s: 1.25, ease: "inOut", hop: 150 },
);
function bitPos(t) {
  if (t <= BIT_PATH[0].t) return { ...BIT_PATH[0] };
  for (let i = 0; i < BIT_PATH.length - 1; i++) {
    const a = BIT_PATH[i], b = BIT_PATH[i + 1];
    if (t <= b.t) {
      const lin = cl((t - a.t) / (b.t - a.t)), k = E[b.ease ?? "lin"](lin);
      const moving = a.x !== b.x || a.y !== b.y;
      return { x: mix(a.x, b.x, k), y: mix(a.y, b.y, k) - Math.sin(Math.PI * lin) * (moving ? b.hop ?? 0 : 0), s: mix(a.s, b.s, k) };
    }
  }
  return { ...BIT_PATH.at(-1) };
}

const SAYINGS = [
  { t0: 4.35, t1: 5.7, text: "let me show you!" },
  ...FOOTAGE.filter((s) => s.say).map((s) => ({ t0: s.start + 0.6, t1: s.start + 2.9, text: s.say })),
  { t0: FEATURES_AT + 0.9, t1: FEATURES_AT + 3.8, text: "and lots more ✦" },
  { t0: END_AT + 1.7, t1: DURATION - 0.6, text: "see you there!", side: "beside" },
];
const HOPS = [3.95, ...FOOTAGE.map((s) => s.start + 0.3), FEATURES_AT + 2.3];
const HAPPY = [[3.98, 5.65], ...FOOTAGE.map((s) => [s.start + 0.35, s.start + 1.5]), [FEATURES_AT + 0.6, END_AT - 0.3], [END_AT + 0.7, DURATION]];

function renderBit(t) {
  const pos = bitPos(t);
  let { x, y, s } = pos;
  y += Math.sin(t * 2.6) * 4 * s;
  for (const h of HOPS) {
    const k = (t - h) / 0.42;
    if (k > 0 && k < 1) y -= Math.sin(Math.PI * k) * 34 * s;
  }
  const happy = HAPPY.some(([a, b]) => t >= a && t <= b);
  const celebrating = t > FEATURES_AT + 0.6;
  let sy = 1, sx = 1;
  for (const k of BIT_PATH) if (k.ease) { const d = (t - k.t) / 0.28; if (d > 0 && d < 1) { sy -= 0.12 * Math.sin(Math.PI * d); sx += 0.08 * Math.sin(Math.PI * d); } }
  const el = $("bit");
  el.style.transform = `translate(${x - 60 * s}px, ${y - 138 * s}px) scale(${s})`;
  el.style.visibility = t < 1.7 ? "hidden" : "visible";
  $("bbody").setAttribute("transform", `translate(0 37) scale(${sx} ${sy}) translate(0 -37)`);
  const wave = celebrating || happy ? Math.sin(t * 11) * 24 : Math.sin(t * 2.6) * 6;
  $("bant").setAttribute("transform", `rotate(${wave} 0 -37)`);
  const gaze = t < 5.85 ? { x: -0.9, y: -0.2 } : t < FEATURES_AT - 0.2 ? { x: pos.x > 1300 ? -0.9 : 0.9, y: -0.15 } : { x: 0, y: 0.1 };
  $("bface").setAttribute("transform", `translate(${gaze.x * 4.5} ${gaze.y * 3.5})`);
  const blink = !happy && (t * 1000) % 3300 < 120;
  $("beyes").setAttribute("transform", `translate(0 -4) scale(1 ${blink ? 0.1 : 1}) translate(0 4)`);
  $("bopen").setAttribute("opacity", happy ? 0 : 1);
  $("bhappy").setAttribute("opacity", happy ? 1 : 0);
  $("bsmile").setAttribute("opacity", happy ? 0 : 1);
  $("bgrin").setAttribute("opacity", happy ? 1 : 0);
  $("bblush").setAttribute("opacity", celebrating ? 0.55 : happy ? 0.35 : 0);

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

// ---------- the browser window ----------
const geomOf = (s) => LAYOUTS[s.layout] ?? null;
/** Window rect at t, morphing between layouts; null while the grid owns the screen. */
function windowAt(t) {
  const cur = sceneAt(t), g1 = geomOf(cur), g0 = cur.prev ? geomOf(cur.prev) : g1;
  if (!g1) return g0 ? { ...g0, out: p(t, cur.start, 0.45, "in") } : null;
  if (!g0) return { ...g1, inn: p(t, cur.start, 0.6, "back") };
  if (cur.enter === "float") return { ...g1 };
  const k = p(t, cur.start, 0.7, "inOut");
  return { x: mix(g0.x, g1.x, k), y: mix(g0.y, g1.y, k), w: mix(g0.w, g1.w, k) };
}

function renderWindow(t) {
  const win = $("win");
  if (t < 5.95 || t > FEATURES_AT + 0.3) { win.style.visibility = "hidden"; $("win2").style.visibility = "hidden"; return null; }
  const g = windowAt(t);
  if (!g || (g.out ?? 0) >= 1) { win.style.visibility = "hidden"; return null; }
  const W = g.w, H = W * 9 / 16;
  Object.assign(win.style, { left: `${g.x}px`, top: `${g.y}px`, width: `${W}px`, height: `${H + 50}px`, visibility: "visible" });
  // entrance (3D tilt-up for the very first reveal), grid hand-offs, final exit
  const first = p(t, 6.0, 1.0, "out5"), exit = p(t, FEATURES_AT - 0.4, 0.55, "in");
  const inn = g.inn ?? 1, out = g.out ?? 0;
  // "float": the new window drifts in from in front of the screen — big, soft — and settles
  const cur = sceneAt(t);
  const fin = cur.enter === "float" && cur.prev ? p(t, cur.start + 0.32, 0.9, "out5") : 1;
  const tilt = (1 - first) * 26, lift = (1 - first) * 260 + (1 - fin) * 46;
  const sc = mix(0.86, 1, first) * mix(1, 0.94, exit) * mix(0.9, 1, inn) * mix(1, 0.92, out) * mix(1.3, 1, fin);
  win.style.transform = `perspective(1800px) translateY(${lift - exit * 60}px) rotateX(${tilt}deg) scale(${sc})`;
  const fop = cur.enter === "float" && cur.prev ? p(t, cur.start + 0.3, 0.5) : 1;
  win.style.opacity = String(p(t, 6.0, 0.3) * (1 - exit) * cl(inn * 1.6) * (1 - out) * fop);
  const blur = exit * 6 + (1 - fin) * 7;
  win.style.filter = blur > 0.05 ? `blur(${blur}px)` : "";
  renderFloatOut(t, cur);
  return { x: g.x, y: g.y + 50, W, H };
}

/** "float": the outgoing window shrinks, tilts and drifts back into the paper while it fades. */
const FLOAT = 0.95;
function renderFloatOut(t, cur) {
  const w2 = $("win2");
  const prev = cur.prev;
  if (!(cur.enter === "float" && prev && geomOf(prev) && t >= cur.start && t < cur.start + FLOAT)) { w2.style.visibility = "hidden"; return; }
  const g = geomOf(prev), W = g.w, H = W * 9 / 16;
  Object.assign(w2.style, { left: `${g.x}px`, top: `${g.y}px`, width: `${W}px`, height: `${H + 50}px`, visibility: "visible" });
  const k = p(t, cur.start, FLOAT, "inOut");
  const side = g.x + W / 2 < 960 ? -1 : 1;
  w2.style.transform = `perspective(1800px) translate(${side * 190 * k}px, ${-110 * k}px) rotateY(${-side * 18 * k}deg) rotateX(${12 * k}deg) scale(${1 - 0.55 * k})`;
  w2.style.opacity = String(1 - p(t, cur.start + 0.45, FLOAT - 0.45, "in"));
  w2.style.filter = `blur(${(5 * k).toFixed(2)}px)`;
  const img = $("i2");
  show(img, frameUrl(prev, 0, t));
  img.style.transform = camCss(camAt(prev, t), W, H);
  $("path2").textContent = prev.url;
}

function renderFootage(t, view) {
  const la = $("la"), lb = $("lb"), ia = la.firstElementChild, ib = lb.firstElementChild, edge = $("edge");
  const cur = sceneAt(t);
  if (!view || cur.layout === "grid") return;
  const { W, H } = view;
  const inWindow = ["wipe", "push", "zoom"].includes(cur.enter ?? "wipe");
  const prevShown = cur.prev && cur.prev.layout !== "grid" && inWindow && t < cur.start + WIPE ? cur.prev : null;
  const base = prevShown ?? cur;
  show(ia, frameUrl(base, 0, t));
  ia.style.transform = camCss(camAt(base, t), W, H);
  la.style.transform = ""; la.style.opacity = "1"; lb.style.visibility = "hidden"; edge.style.visibility = "hidden";
  lb.style.clipPath = "";
  if (prevShown) {
    const k = p(t, cur.start, WIPE, "inOut");
    show(ib, frameUrl(cur, 0, t));
    ib.style.transform = camCss(camAt(cur, t), W, H);
    lb.style.visibility = "visible";
    lb.style.transform = ""; lb.style.opacity = "1";
    if (cur.enter === "push") {
      la.style.transform = `translateX(${-k * W}px)`;
      lb.style.transform = `translateX(${(1 - k) * W}px)`;
    } else if (cur.enter === "zoom") {
      la.style.transform = `scale(${1 + 0.14 * k})`; la.style.opacity = String(1 - k);
      lb.style.transform = `scale(${0.88 + 0.12 * k})`; lb.style.opacity = String(k);
    } else {
      lb.style.clipPath = `inset(0 ${(1 - k) * 100}% 0 0)`;
      edge.style.visibility = "visible";
      edge.style.left = `${k * W}px`;
    }
  }
  // URL: type the path in when it changes
  const same = cur.prev && cur.prev.url === cur.url;
  const typeStart = cur === FOOTAGE[0] ? 6.9 : cur.start + 0.1;
  const n = same ? cur.url.length : Math.round(cl((t - typeStart) / 0.45) * cur.url.length);
  $("path").textContent = cur.url.slice(0, n);
  const typing = !same && t >= typeStart && t < typeStart + 0.9;
  $("caret").style.visibility = typing && (n < cur.url.length || Math.floor(t * 4) % 2 === 0) ? "visible" : "hidden";
}

// ---------- anatomy: lift the side panes out of the window ----------
function renderAnatomy(t, view) {
  const s = FOOTAGE.find((q) => q.layout === "explode");
  const live = s && view && t > s.start + 0.8 && t < s.end + 0.1;
  for (const id of ["liftL", "liftR", "slotL", "slotR"]) $(id).style.visibility = live ? "visible" : "hidden";
  const lk = live ? p(t, s.start + 1.05, 0.9, "back") * (1 - p(t, s.end - 1.05, 0.7, "inOut")) : 0;
  if (live) {
    const { x, y, W, H } = view;
    const src = frameUrl(s, 0, t);
    [["L", PANES.left, -265, 12], ["R", PANES.right, 265, -12]].forEach(([side, r, dx, ry]) => {
      const lift = $(`lift${side}`), slot = $(`slot${side}`), img = lift.firstElementChild;
      const rx = r.x * W, rTop = r.y * H, rw = r.w * W, rh = r.h * H;
      Object.assign(lift.style, { left: `${x + rx}px`, top: `${y + rTop}px`, width: `${rw}px`, height: `${rh}px` });
      Object.assign(img.style, { width: `${W}px`, height: `${H}px`, left: `${-rx}px`, top: `${-rTop}px` });
      show(img, src);
      lift.style.transform = `perspective(1400px) translate(${dx * lk}px, ${-16 * lk}px) rotateY(${ry * lk}deg) scale(${1 + 0.05 * lk})`;
      lift.style.opacity = String(cl(lk * 4));
      lift.style.boxShadow = `0 ${30 * lk}px ${70 * lk}px -${20 * lk}px rgba(40,28,12,${0.55 * lk}), 0 0 0 1.5px rgba(26,26,26,${0.2 * cl(lk * 3)})`;
      Object.assign(slot.style, { left: `${rx}px`, top: `${rTop}px`, width: `${rw}px`, height: `${rh}px`, opacity: String(cl(lk) * 0.94) });
    });
  }
  ["xL", "xC", "xR"].forEach((id, j) => {
    const el = $(id);
    if (!s) { el.style.visibility = "hidden"; return; }
    const ki = p(t, s.start + 1.6 + j * 0.14, 0.6, "out5"), ko = p(t, s.end - 1.15, 0.35, "in");
    put(el, { y: mix(26, 0, ki) - ko * 18, o: ki * (1 - ko), blur: (1 - ki) * 5 });
  });
}

// ---------- the 2×2 grid ----------
function renderGrid(t) {
  if (!GRID) return 0;
  const vis = p(t, GRID.start, 0.4) * (1 - p(t, GRID.end - 0.35, 0.35, "in"));
  put($("gtitle"), { y: mix(-20, 0, p(t, GRID.start + 0.05, 0.6, "out5")), o: vis });
  cellEls.forEach((cell, k) => {
    const at = GRID.start + 0.1 + k * 0.12;
    const ki = p(t, at, 0.7, "back"), ko = p(t, GRID.end - 0.35 + k * 0.03, 0.35, "in");
    const live = t > at - 0.05 && t < GRID.end + 0.1;
    put(cell, { y: mix(60, 0, ki) - ko * 30, s: mix(0.9, 1, ki) * mix(1, 0.94, ko), o: live ? p(t, at, 0.2) * (1 - ko) : 0 });
    if (!live) return;
    const img = cell.firstElementChild;
    show(img, frameUrl(GRID, k, t));
    img.style.transform = camCss(camAt(GRID, t), CELL.w, CELL.h);
  });
  return vis;
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
    H3.forEach((w, i) => { w.style.transform = `translateY(${mix(110, 0, p(t, 3.35 + i * 0.08, 0.7, "out5"))}%)`; });
    const k = p(t, 3.95, 0.7, "back2");
    const sway = t > 4.5 ? Math.sin((t - 4.5) * 7.5) * 16 * Math.min(1, (t - 4.5) * 2) : 0;
    put($("move"), { x: sway, s: mix(0.2, 1, k), r: mix(-16, -3, k) + sway * 0.12, o: p(t, 3.95, 0.12) });
    const out = p(t, 5.75, 0.45, "in");
    put($("hook2"), { y: -out * 40, s: mix(1, 0.92, out), o: vis ? 1 - out : 0, blur: out * 8 });
  }

  // 3 · montage
  const gridVis = renderGrid(t);
  {
    const i = p(t, 6.3, 0.6, "out5"), o = p(t, FEATURES_AT - 0.5, 0.4, "in");
    put($("brand"), { y: mix(-20, 0, i) - o * 20, o: i * (1 - o) * (1 - gridVis) });
    put($("chapters"), { y: mix(-20, 0, i) - o * 20, o: i * (1 - o) * (1 - gridVis) });
    for (const el of chapterEls) {
      let a = 0;
      for (const s of FOOTAGE) if (s.area === el.dataset.a) a = Math.max(a, p(t, s.start, 0.35) * (1 - p(t, s.end - 0.1, 0.35)));
      el.style.opacity = String(mix(0.34, 1, a));
      el.querySelector("i").style.transform = `scaleX(${a})`;
    }
  }
  const view = renderWindow(t);
  renderFootage(t, view);
  renderAnatomy(t, view);

  // scene labels
  for (const s of FOOTAGE) {
    const els = labelEls[s.id];
    if (!els) continue;
    const inAt = s.start + 0.2, outAt = s.end - 0.32;
    const box = $(`lab-${s.id}`);
    const live = t > inAt - 0.05 && t < s.end + 0.05;
    box.style.display = live ? "" : "none";
    if (!live) continue;
    if (box.classList.contains("lt")) {
      const ki = p(t, inAt, 0.6, "out5"), ko = p(t, outAt, 0.3, "in");
      put(box, { x: mix(-40, 0, ki), o: ki * (1 - ko), blur: (1 - ki) * 4 });
    }
    els.forEach((el, j) => {
      const ki = p(t, inAt + j * 0.07, 0.6, "out5"), ko = p(t, outAt + j * 0.025, 0.3, "in");
      put(el, { y: mix(36, 0, ki) - ko * 26, o: ki * (1 - ko), blur: (1 - ki) * 6 + ko * 4 });
    });
  }

  // 4 · feature cards
  {
    const hi = p(t, FEATURES_AT + 0.05, 0.7, "out5"), ho = p(t, END_AT - 0.5, 0.4, "in");
    put($("fhead"), { y: mix(40, 0, hi) - ho * 30, o: hi * (1 - ho), blur: (1 - hi) * 6 });
    cardEls.forEach((c, j) => {
      const at = FEATURES_AT + 0.35 + j * 0.09;
      const k = p(t, at, 0.75, "back"), o = p(t, END_AT - 0.45 + j * 0.02, 0.4, "in");
      put(c, { y: mix(70, 0, k) - o * 40, s: mix(0.93, 1, k), o: p(t, at, 0.25) * (1 - o) });
    });
  }

  // 5 · end card
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
