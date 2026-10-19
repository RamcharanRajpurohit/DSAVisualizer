// Records real product footage from the live site for the demo video.
//
//   node video/record.mjs                 # every shot
//   node video/record.mjs merge dijkstra  # only these
//
// Chrome's screencast (CDP) gives sharp frames; they are re-timed to a constant 30 fps with
// FFmpeg. An injected cursor with click ripples makes the clicks visible on screen.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./lib/browser.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "footage");
const BASE = process.env.BASE ?? "https://algolab.rajpurohit.me";
const VIEW = { width: 1600, height: 900 };
const SCALE = 1.2; // 1600×900 CSS px → 1920×1080 frames
const FPS = 30;

/** Visible cursor + click ripple (headless screencasts have no pointer). */
const CURSOR = () => {
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2.5 19.5 12l-7 1.6L9 20.5z" fill="#1a1a1a" stroke="#fbf8f2" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none", transform: "translate(-200px,-200px)", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))" });
    const host = () => document.fullscreenElement ?? document.documentElement;
    host().appendChild(c);
    document.addEventListener("fullscreenchange", () => host().appendChild(c));
    addEventListener("mousemove", (e) => { c.style.transform = `translate(${e.clientX - 4}px,${e.clientY - 2}px)`; }, true);
    // Log every press for the sound design (same wall clock as the screencast frame timestamps).
    const log = (kind, e) => (window.__clicks ||= []).push({ t: Date.now() / 1000, kind, x: e.clientX / innerWidth, y: e.clientY / innerHeight });
    addEventListener("mouseup", (e) => { if (e.target?.type === "range") log("release", e); }, true);
    addEventListener("mousedown", (e) => {
      log(e.target?.type === "range" ? "grab" : "click", e);
      const r = document.createElement("div");
      Object.assign(r.style, { position: "fixed", left: `${e.clientX - 18}px`, top: `${e.clientY - 18}px`, width: "36px", height: "36px", borderRadius: "50%", border: "2.5px solid #b91c1c", zIndex: "2147483646", pointerEvents: "none" });
      host().appendChild(r);
      r.animate([{ transform: "scale(.3)", opacity: 1 }, { transform: "scale(1.5)", opacity: 0 }], { duration: 520, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => r.remove();
    }, true);
  });
};

/** Glide the cursor to an element, pause like a person would, then click. */
async function click(page, locator, { pause = 260 } = {}) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`not visible: ${locator}`);
  const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(to.x, to.y, { steps: 28 });
  await page.waitForTimeout(pause);
  await page.mouse.down();
  await page.waitForTimeout(70);
  await page.mouse.up();
}

const btn = (page, name) => page.getByRole("button", { name, exact: true }).first();

/** Pick an option in a native <select>: the popup never renders headless, so glide + ripple, then set it. */
async function pick(page, select, value) {
  const box = await select.boundingBox();
  const to = { x: box.x + box.width * 0.7, y: box.y + box.height / 2 };
  await page.mouse.move(to.x, to.y, { steps: 26 });
  await page.waitForTimeout(220);
  await page.evaluate(({ x, y }) => document.documentElement.dispatchEvent(new MouseEvent("mousedown", { clientX: x, clientY: y, bubbles: true })), to);
  await page.waitForTimeout(260);
  await select.selectOption(value);
}

/** Drag a range slider's thumb from where it is to `frac` of its width. */
async function drag(page, range, frac) {
  const box = await range.boundingBox();
  const { value, min, max } = await range.evaluate((el) => ({ value: +el.value, min: +el.min, max: +el.max }));
  const from = box.x + ((value - min) / (max - min || 1)) * box.width;
  const y = box.y + box.height / 2;
  await page.mouse.move(from, y, { steps: 24 });
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.move(box.x + frac * box.width, y, { steps: 45 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}

const SHOTS = {
  merge: {
    path: "/sorting/merge-sort", speed: 2,
    async run(page) { await click(page, btn(page, "Sort")); await page.waitForTimeout(45000); },
  },
  quick: {
    path: "/sorting/quick-sort", speed: 2,
    async run(page) { await click(page, btn(page, "Sort")); await page.waitForTimeout(27000); },
  },
  race: {
    path: "/sorting", speed: 1,
    async run(page) {
      await click(page, page.getByRole("tab", { name: "Compare" }).or(btn(page, "Compare")).first());
      await page.waitForTimeout(900);
      await click(page, page.getByRole("button", { name: /^(Race|Start|Play)/ }).first());
      await page.waitForTimeout(12000);
    },
  },
  dijkstra: {
    path: "/graph/dijkstra", speed: 2,
    async run(page) { await click(page, btn(page, "Run")); await page.waitForTimeout(26000); },
  },
  avl: {
    path: "/avl-tree/rotations", speed: 2,
    async run(page) {
      // /avl-tree/rotations opens on the LR case.
      await click(page, page.getByRole("button", { name: /^Insert 35/ }).first());
      await page.waitForTimeout(1500);
      await click(page, page.getByRole("radio", { name: "2×" }).or(btn(page, "2×")).first());
      await page.waitForTimeout(30000);
    },
  },
  list: {
    path: "/linked-list/reverse-linked-list", speed: 2,
    async run(page) {
      await click(page, btn(page, "Reverse"));
      await page.waitForTimeout(14500);
      await click(page, page.getByRole("tab", { name: "Doubly", exact: true }));
      await page.waitForTimeout(1700);
      await click(page, page.getByRole("tab", { name: "Circular", exact: true }));
      await page.waitForTimeout(1900);
    },
  },
  graphs: {
    path: "/graph", speed: 4,
    async run(page) {
      const algo = page.getByRole("combobox", { name: "Algorithm" });
      for (const a of ["bfs", "dfs", "prim", "kruskal"]) {
        await pick(page, algo, a);
        await page.waitForTimeout(350);
        await click(page, page.getByRole("button", { name: /^Run/ }).first());
        await page.waitForTimeout(3300);
      }
    },
  },
  controls: {
    path: "/sorting/quick-sort", speed: 1,
    async run(page) {
      await click(page, btn(page, "Sort"));
      await page.waitForTimeout(1600);
      await click(page, btn(page, "4×"));
      await page.waitForTimeout(1500);
      await click(page, btn(page, "Pause"));
      await page.waitForTimeout(450);
      for (let i = 0; i < 3; i++) { await click(page, btn(page, "Previous step"), { pause: 120 }); await page.waitForTimeout(380); }
      for (let i = 0; i < 2; i++) { await click(page, btn(page, "Next step"), { pause: 120 }); await page.waitForTimeout(380); }
      await drag(page, page.getByRole("slider", { name: "Scrub through steps" }), 0.82);
      await page.waitForTimeout(600);
      await click(page, btn(page, "0.25×"));
      await click(page, btn(page, "Play"));
      await page.waitForTimeout(2000);
      await click(page, btn(page, "Pause"));
      for (const tab of ["Python", "C++", "Java", "JS", "Pseudocode"]) {
        await click(page, page.getByRole("tab", { name: tab, exact: true }), { pause: 140 });
        await page.waitForTimeout(650);
      }
    },
  },
  heap: {
    path: "/heap/build-heap", speed: 2,
    async run(page) { await click(page, btn(page, "Build heap")); await page.waitForTimeout(20000); },
  },
  btree: {
    path: "/btree/insertion", speed: 1,
    async run(page) {
      await click(page, page.getByRole("button", { name: /^Insert 98/ }).first());
      await page.waitForTimeout(30000);
    },
  },
  mergeFs: {
    path: "/sorting/merge-sort", speed: 2,
    async run(page) { await click(page, btn(page, "Sort")); await page.waitForTimeout(500); await click(page, btn(page, "Fullscreen canvas")); await page.waitForTimeout(44000); },
  },
  heapFs: {
    path: "/heap/build-heap", speed: 2,
    async run(page) { await click(page, btn(page, "Build heap")); await page.waitForTimeout(500); await click(page, btn(page, "Fullscreen canvas")); await page.waitForTimeout(19000); },
  },
  avlFs: {
    path: "/avl-tree/rotations", speed: 1,
    async run(page) {
      await click(page, page.getByRole("button", { name: /^Insert 35/ }).first());
      await page.waitForTimeout(1200);
      await click(page, btn(page, "2×"));
      await page.waitForTimeout(400);
      await click(page, btn(page, "Fullscreen canvas"));
      await page.waitForTimeout(30000);
    },
  },
  btreeFs: {
    path: "/btree/insertion", speed: 1,
    async run(page) { await click(page, page.getByRole("button", { name: /^Insert 98/ }).first()); await page.waitForTimeout(500); await click(page, btn(page, "Fullscreen canvas")); await page.waitForTimeout(30000); },
  },
  dijkstraFs: {
    path: "/graph/dijkstra", speed: 2,
    async run(page) { await click(page, btn(page, "Run")); await page.waitForTimeout(500); await click(page, btn(page, "Fullscreen canvas")); await page.waitForTimeout(25000); },
  },
  postfix: {
    path: "/stack-queue/infix-to-postfix", speed: 2,
    async run(page) {
      await click(page, btn(page, "a+b*(c^d-e)/f"));
      await page.waitForTimeout(500);
      await click(page, btn(page, "Run"));
      await page.waitForTimeout(20000);
    },
  },
};

async function record(browser, name, shot) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: SCALE, reducedMotion: "no-preference" });
  await ctx.addInitScript((speed) => {
    try { localStorage.setItem("dsaviz:player.speed", JSON.stringify(speed)); } catch {}
  }, shot.speed ?? 1);
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  await page.goto(BASE + shot.path, { waitUntil: "networkidle" });
  await page.mouse.move(VIEW.width * 0.62, VIEW.height * 0.55);
  await page.waitForTimeout(800);

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    frames.push({ data, t: metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 94, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await page.waitForTimeout(700); // a still beat before the first click
  await shot.run(page);
  await cdp.send("Page.stopScreencast");
  const clicks = await page.evaluate(() => window.__clicks ?? []);
  await ctx.close();

  // Frames arrive only when pixels change: hold each one until the next, then resample to 30 fps.
  const dir = join(OUT, `${name}-raw`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let list = "";
  frames.forEach((f, i) => {
    const file = join(dir, `${String(i).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(f.data, "base64"));
    const dur = i < frames.length - 1 ? frames[i + 1].t - f.t : 1 / FPS;
    list += `file '${file}'\nduration ${Math.max(dur, 0.001).toFixed(4)}\n`;
  });
  list += `file '${join(dir, `${String(frames.length - 1).padStart(5, "0")}.jpg`)}'\n`;
  writeFileSync(join(dir, "list.txt"), list);
  const mp4 = join(OUT, `${name}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"),
    "-vf", `fps=${FPS},scale=1920:1080:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "14", mp4]);
  rmSync(dir, { recursive: true, force: true });
  // Click times on the clip's own timeline (frame 0 = 0 s), for video/audio.mjs.
  const t0 = frames[0]?.t ?? 0;
  const events = clicks.map((c) => ({ t: +(c.t - t0).toFixed(3), kind: c.kind, x: +c.x.toFixed(4), y: +c.y.toFixed(4) })).filter((c) => c.t >= 0);
  writeFileSync(join(OUT, `${name}.clicks.json`), JSON.stringify(events));
  const secs = frames.length ? (frames.at(-1).t - frames[0].t).toFixed(1) : 0;
  console.log(`${name}: ${frames.length} frames over ${secs}s → ${mp4}`);
}

mkdirSync(OUT, { recursive: true });
const wanted = process.argv.slice(2);
const browser = await launch();
try {
  for (const [name, shot] of Object.entries(SHOTS)) {
    if (wanted.length && !wanted.includes(name)) continue;
    await record(browser, name, shot);
  }
} finally {
  await browser.close();
}
