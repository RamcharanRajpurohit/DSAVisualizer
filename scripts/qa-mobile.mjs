// Mobile QA sweep: layout (horizontal overflow, clipped/tiny controls, small text, Bit overlap)
// on every page at phone, landscape, tablet and desktop sizes, then a touch-driven pass over
// every visualizer's controls. Prints a per-page report; screenshots go to .playwright-mcp/.
//
//   node scripts/qa-mobile.mjs                      # layout + controls against http://localhost:3000
//   node scripts/qa-mobile.mjs --base https://algolab.rajpurohit.me --layout
//   node scripts/qa-mobile.mjs --controls --only /graph,/heap --viewports 360
//   node scripts/qa-mobile.mjs --layout --shots     # also save a screenshot per page and size
//
// Uses one headless Chrome (video/lib/browser.mjs) and closes it at the end.
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "../video/lib/browser.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = join(ROOT, ".playwright-mcp");

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = opt("base", "http://localhost:3000").replace(/\/$/, "");
const ONLY = opt("only", "").split(",").filter(Boolean);
const RUN_LAYOUT = flag("layout") || !flag("controls");
const RUN_CONTROLS = flag("controls") || !flag("layout");
const SAVE_SHOTS = flag("shots");

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

const VIEWPORTS = [
  { name: "360", width: 360, height: 740, touch: true },
  { name: "390", width: 390, height: 844, touch: true },
  { name: "414", width: 414, height: 896, touch: true },
  { name: "land", width: 844, height: 390, touch: true },
  { name: "tab", width: 768, height: 1024, touch: true },
  { name: "desk", width: 1440, height: 900, touch: false },
].filter((v) => {
  const want = opt("viewports", "");
  return !want || want.split(",").includes(v.name);
});

async function contextFor(browser, vp, extra = {}) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    hasTouch: vp.touch,
    isMobile: vp.touch && vp.width < 1024,
    userAgent: vp.touch ? MOBILE_UA : undefined,
    permissions: ["clipboard-read", "clipboard-write"],
    reducedMotion: "no-preference",
    ...extra,
  });
  // `next dev` puts its tools badge in the bottom-left corner; production has none, so hide it.
  await ctx.addInitScript(() => {
    const hide = () => {
      const s = document.createElement("style");
      s.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(s);
    };
    if (document.head) hide();
    else document.addEventListener("DOMContentLoaded", hide, { once: true });
  });
  return ctx;
}

async function urls() {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const all = [...new Set([...paths, "/this-page-does-not-exist"])];
  return ONLY.length ? all.filter((p) => ONLY.some((o) => p === o || p.startsWith(`${o}/`))) : all;
}

/** Collects console errors and page errors for one page. */
function watch(page) {
  const errors = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // Expected noise: the 404 page's own request, dev-only HMR chatter.
    if (/status of 404|\[HMR\]|Download the React DevTools/.test(t)) return;
    errors.push(`console: ${t.slice(0, 200)}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
  return errors;
}

const slugOf = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "_"));

async function settle(page, ms = 600) {
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(ms);
}

/** Layout probe, run in the page. `touch`: hold controls to 44px (Apple HIG) instead of 32px. */
function probeLayout(touch) {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
  };
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(hidden|auto|scroll|clip)/.test(s.overflowX)) return true;
      if (s.position === "fixed") return false;
    }
    return false;
  };
  const describe = (el) => {
    const name = el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent?.trim().slice(0, 30) || "";
    const cls = typeof el.className === "string" ? el.className.split(" ").slice(0, 3).join(".") : "";
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${name ? ` "${name}"` : ""}`;
  };

  // Elements that stick out of the viewport without a clipping/scrolling ancestor.
  const overflow = [];
  for (const el of document.body.querySelectorAll("*")) {
    // Bit (or the pill that brings him back) peeks in from the edge on purpose; fixed, so it never scrolls the page.
    if (el.closest('[data-qa-ignore], [title="Bring Bit back"], .fixed:has([title^="Bit"])')) continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.right > vw + 1 && !clipped(el) && visible(el)) overflow.push(`${describe(el)} right=${Math.round(r.right)}`);
  }

  // Interactive elements: tap target size, and anything cut off by the viewport edge.
  const small = [];
  const cut = [];
  const minTarget = touch ? 43.5 : 32;
  for (const el of document.querySelectorAll("button, a[href], input, select, [role=tab], [role=button], summary")) {
    if (!visible(el) || el.closest("[aria-hidden=true]")) continue;
    // Links inside a sentence are exempt (WCAG 2.5.8 "inline"); so is the visually hidden skip link.
    if (el.matches("p a, td a, a.sr-only")) continue;
    const r = el.getBoundingClientRect();
    if (el.matches("input[type=range]")) continue;
    if (Math.min(r.width, r.height) < minTarget) small.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    // Bit (and the pill that brings him back) peeks in from the edge on purpose when every corner is busy.
    if ((r.left < -1 || r.right > vw + 1) && !el.closest('[title^="Bit"], [title="Bring Bit back"]')) cut.push(describe(el));
  }

  // Text smaller than 12px (own text only); the drawing scales its own labels.
  const tiny = new Set();
  for (const el of document.body.querySelectorAll("*")) {
    if (el.closest("svg, canvas, [aria-hidden=true], [data-viz-canvas]")) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || !visible(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 11.5) tiny.add(`${Math.round(fs * 10) / 10}px ${describe(el)}`);
  }

  // Page title text running under header buttons / tabs.
  const h1 = document.querySelector("main h1");
  if (h1) {
    const range = document.createRange();
    range.selectNodeContents(h1);
    const lines = [...range.getClientRects()];
    for (const el of document.querySelectorAll("main button, main [role=tab]")) {
      const r = el.getBoundingClientRect();
      if (!r.width || h1.contains(el)) continue;
      if (lines.some((l) => Math.min(l.right, r.right) - Math.max(l.left, r.left) > 2 && Math.min(l.bottom, r.bottom) - Math.max(l.top, r.top) > 2)) {
        overflow.push(`title overlaps ${describe(el)}`);
      }
    }
  }

  const canvas = document.querySelector("[data-viz-canvas]");
  const cr = canvas?.getBoundingClientRect();
  return {
    scrollWidth: doc.scrollWidth,
    vw,
    overflow: overflow.slice(0, 8),
    overflowCount: overflow.length,
    small: small.slice(0, 12),
    smallCount: small.length,
    cut: cut.slice(0, 8),
    tiny: [...tiny].slice(0, 10),
    tinyCount: tiny.size,
    canvas: cr ? { w: Math.round(cr.width), h: Math.round(cr.height) } : null,
    cls: Math.round((window.__qaCls ?? 0) * 1000) / 1000,
  };
}

async function layoutSweep(browser, paths) {
  console.log(`\n=== LAYOUT (${BASE}) ===`);
  const failures = [];
  for (const vp of VIEWPORTS) {
    const ctx = await contextFor(browser, vp);
    // Bit stays out of the layout probe; the controls pass checks him separately.
    await ctx.addInitScript(() => {
      try { localStorage.setItem("dsaviz:mascot.hidden", "true"); } catch {}
      // Cumulative layout shift while the page loads (shifts right after input don't count).
      window.__qaCls = 0;
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (!e.hadRecentInput) window.__qaCls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
      } catch {}
    });
    const page = await ctx.newPage();
    for (const path of paths) {
      const errors = watch(page);
      try {
        await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
        await settle(page, 900);
        const r = await page.evaluate(probeLayout, vp.touch);
        const lowCanvas = r.canvas && r.canvas.h < 200;
        // Touch screens: every target ≥ 44px and no text under 12px outside the drawing.
        const thumbs = vp.touch && (r.smallCount > 0 || r.tinyCount > 0);
        const bad = r.scrollWidth > r.vw || r.overflowCount > 0 || r.cut.length > 0 || errors.length > 0 || lowCanvas || thumbs;
        const line = `[${vp.name}] ${path.padEnd(42)} sw=${r.scrollWidth}/${r.vw}` +
          `${r.canvas ? ` canvas=${r.canvas.w}x${r.canvas.h}` : ""} small=${r.smallCount} tiny=${r.tinyCount} cls=${r.cls} err=${errors.length}`;
        console.log((bad ? "FAIL " : "ok   ") + line);
        if (bad || flag("verbose")) {
          for (const o of r.overflow) console.log(`       overflow: ${o}`);
          for (const c of r.cut) console.log(`       cut off: ${c}`);
          if (lowCanvas) console.log(`       canvas only ${r.canvas.h}px tall`);
          if (thumbs) for (const x of [...r.small, ...r.tiny]) console.log(`       small/tiny: ${x}`);
          for (const e of errors) console.log(`       ${e}`);
        }
        if (flag("verbose")) {
          for (const s of r.small) console.log(`       small: ${s}`);
          for (const t of r.tiny) console.log(`       tiny: ${t}`);
        }
        if (bad) failures.push(`${vp.name} ${path}`);
        if (SAVE_SHOTS) await page.screenshot({ path: join(SHOTS, `qa-${vp.name}-${slugOf(path)}.png`), fullPage: false });
      } catch (e) {
        console.log(`FAIL [${vp.name}] ${path} — ${e.message.split("\n")[0]}`);
        failures.push(`${vp.name} ${path}`);
      }
      page.removeAllListeners("console");
      page.removeAllListeners("pageerror");
    }
    await ctx.close();
  }
  return failures;
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const paths = await urls();
  const browser = await launch();
  const failures = [];
  try {
    if (RUN_LAYOUT) failures.push(...(await layoutSweep(browser, paths)));
    if (RUN_CONTROLS) {
      const { controlsSweep } = await import("./qa-controls.mjs");
      failures.push(...(await controlsSweep({ browser, BASE, VIEWPORTS, contextFor, watch, settle, paths, SHOTS, flag })));
    }
  } finally {
    await browser.close();
  }
  console.log(`\n=== ${failures.length ? `${failures.length} FAILURES` : "ALL PASSED"} ===`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = failures.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 2;
});
