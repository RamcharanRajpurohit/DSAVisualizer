// Touch-driven control pass for scripts/qa-mobile.mjs: taps every control on every visualizer
// (operations, presets, inputs, playback, Learn, Share, focus / fullscreen, code tabs, cards,
// quiz, zoom, graph edit tools, compare mode) plus the navbar, palette, home video and 404 page.
// A control "fails" when the tap is impossible (hidden, covered, cut off), throws a page error,
// or visibly does nothing where an effect is expected.
import { createHash } from "node:crypto";

const HUBS = ["/sorting", "/stack-queue", "/linked-list", "/heap", "/bst", "/avl-tree", "/btree", "/graph"];
const isViz = (p) => HUBS.some((h) => p === h || p.startsWith(`${h}/`));
const TREE = (p) => /^\/(bst|avl-tree|btree)/.test(p);
const sha = (b) => createHash("sha1").update(b).digest("hex").slice(0, 12);
const first = (e) => String(e?.message ?? e).split("\n")[0].slice(0, 180);

class Report {
  constructor(name) {
    this.name = name;
    this.tried = 0;
    this.failed = [];
    this.notes = [];
  }
  pass() { this.tried++; }
  fail(what, why) { this.tried++; this.failed.push(`${what}: ${why}`); }
  note(what) { this.notes.push(what); }
}

/** Touch contexts tap, the desktop context clicks. */
let TOUCH = true;

/** Tap like a finger: scroll into view, then a real touch tap (fails when something covers it). */
async function tap(loc, timeout = 5000) {
  await loc.scrollIntoViewIfNeeded({ timeout });
  try {
    if (TOUCH) await loc.tap({ timeout });
    else await loc.click({ timeout });
  } catch (e) {
    const m = /<(\w+)[^>]*?(class="[^"]{0,60})?[^>]*> (?:from <\w+[^>]*> subtree )?intercepts pointer events/.exec(e.message);
    if (m) throw new Error(`covered by <${m[1]} ${m[2] ?? ""}…>`);
    // Say why Playwright gave up (not enabled / not visible / not stable …), not just "timeout".
    const why = [...e.message.matchAll(/- (element [^\n]+|element is [^\n]+)/g)].pop()?.[1];
    if (why) throw new Error(`${e.message.split("\n")[0]} (${why.trim()})`);
    throw e;
  }
}

/** Tap (or click) at a viewport point. */
const tapAt = (page, x, y) => (TOUCH ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));

async function check(r, what, fn) {
  if (process.env.QA_DEBUG) console.log(`   … ${r.name} ${what}`);
  try {
    const res = await fn();
    if (res === false) r.fail(what, "no visible effect");
    else r.pass();
  } catch (e) {
    r.fail(what, first(e));
  }
}

async function canvasSig(page) {
  const c = page.locator("[data-viz-canvas]:visible").first();
  const buf = await c.screenshot({ timeout: 5000 }).catch(() => Buffer.alloc(0));
  const text = await c.evaluate((el) => el.closest("section")?.innerText ?? "").catch(() => "");
  return `${sha(buf)}|${text.replace(/\s+/g, " ").slice(0, 400)}`;
}

/** Everything a control could change: canvas pixels, stage text, side-panel text and pressed states. */
async function pageSig(page, pixels = true) {
  const dom = await page.evaluate(() => {
    const parts = [];
    for (const el of document.querySelectorAll("main aside, main header, [role=dialog]")) parts.push(el.innerText);
    for (const el of document.querySelectorAll("[aria-pressed],[aria-selected],[aria-checked],[aria-expanded],input,select")) {
      parts.push(`${el.getAttribute("aria-pressed")}${el.getAttribute("aria-selected")}${el.getAttribute("aria-checked")}${el.getAttribute("aria-expanded")}${el.value ?? ""}`);
    }
    parts.push(location.search);
    return parts.join("¦");
  });
  const stage = pixels ? await canvasSig(page) : await page.evaluate(() => [...document.querySelectorAll("[data-viz-canvas]")].map((c) => c.closest("section")?.innerText ?? "").join("|"));
  return `${stage}#${dom.length}:${dom.slice(0, 4000)}`;
}

const scrubCounter = (page) =>
  page.evaluate(() => {
    // Stack & Queue keeps other modes mounted but hidden: use the visible bar.
    const r = [...document.querySelectorAll('input[aria-label="Scrub through steps"]')].find((e) => e.getBoundingClientRect().width > 0);
    const m = r?.parentElement?.innerText.match(/(\d+)\s*\/\s*(\d+)/);
    return m ? { i: Number(m[1]), n: Number(m[2]) } : null;
  });

/** Polls the step counter until `ok(counter)` holds (animated engines update a moment later). */
async function counterIs(page, ok, ms = 2500) {
  const end = Date.now() + ms;
  for (;;) {
    const c = await scrubCounter(page);
    if (ok(c)) return true;
    if (Date.now() > end) return false;
    await page.waitForTimeout(120);
  }
}

async function finishRuns(page) {
  // Live engines (trees): finish whatever is animating so the next control is enabled.
  for (const name of ["Finish now", "Skip to end"]) {
    const b = page.getByRole("button", { name, exact: true });
    if ((await b.count()) && (await b.first().isEnabled().catch(() => false))) await tap(b.first(), 2000).catch(() => {});
  }
  await page.waitForTimeout(250);
}

async function waitEnabled(loc, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await loc.isEnabled().catch(() => false)) return true;
    await loc.page().waitForTimeout(200);
  }
  return false;
}

/** Visible buttons in a container. Each gets a data-qa tag so it can be found again after re-renders. */
let qaSeq = 0;
async function buttonsIn(page, selector) {
  const start = (qaSeq += 1000);
  return page.evaluate(({ sel, start }) => {
    const out = [];
    let k = start;
    for (const root of document.querySelectorAll(sel)) {
      for (const b of root.querySelectorAll("button, [role=tab], [role=switch]")) {
        const r = b.getBoundingClientRect();
        if (!r.width || !r.height || getComputedStyle(b).visibility === "hidden") continue;
        if (b.closest("[role=dialog]")) continue;
        // Long lists of the same control (step timeline, history): two samples are enough.
        const li = b.closest("li");
        if (li?.parentElement && [...li.parentElement.children].indexOf(li) > 1) continue;
        const name = (b.getAttribute("aria-label") || b.textContent || b.getAttribute("title") || "").trim().replace(/\s+/g, " ");
        if (!name) continue;
        b.dataset.qa = String(++k);
        out.push({ name, qa: String(k), expanded: b.hasAttribute("aria-expanded") });
      }
    }
    return out;
  }, { sel: selector, start });
}

const byQa = (page, b) => page.locator(`[data-qa="${b.qa}"]`);

// ───────────────────────────── shared visualizer checks ─────────────────────────────

async function header(page, r, vp, errors) {
  const vw = vp.width;
  const vh = vp.height;
  const within = async (loc) => {
    const b = await loc.boundingBox();
    return !!b && b.x >= -1 && b.y >= -1 && b.x + b.width <= vw + 1 && b.y + b.height <= vh + 1;
  };

  // Learn: opens over the canvas, fits, slides move, a try-it button runs, it closes.
  const learn = page.getByRole("button", { name: "Learn", exact: true });
  if (await learn.count()) {
    await check(r, "Learn opens", async () => {
      await tap(learn);
      const d = page.locator('[role=dialog][aria-label$="lesson"]');
      await d.waitFor({ timeout: 3000 });
      await d.scrollIntoViewIfNeeded();
      if (!(await within(d))) throw new Error("lesson panel does not fit the viewport");
    });
    await check(r, "Learn next slide", async () => {
      const d = page.locator('[role=dialog][aria-label$="lesson"]');
      const before = await d.innerText();
      await tap(d.getByRole("button", { name: /^Next/ }));
      return (await d.innerText()) !== before;
    });
    await check(r, "Learn try-it", async () => {
      const d = page.locator('[role=dialog][aria-label$="lesson"]');
      // Find a slide with try-it buttons (walk forward up to 8 slides).
      for (let k = 0; k < 8; k++) {
        const tries = d.locator("div.overflow-y-auto button");
        if (await tries.count()) {
          const before = await canvasSig(page);
          await tap(tries.first());
          await page.waitForTimeout(1500);
          await finishRuns(page);
          return (await canvasSig(page)) !== before || errors.length === 0;
        }
        const next = d.getByRole("button", { name: /^Next/ });
        if (!(await next.count())) break;
        await tap(next);
      }
      r.note("lesson has no try-it buttons");
      return true;
    });
    await check(r, "Learn closes", async () => {
      const d = page.locator('[role=dialog][aria-label$="lesson"]');
      if (!(await d.count())) return true; // a try-it may switch topics and close it
      await tap(d.getByRole("button", { name: "Close lesson" }));
      await d.waitFor({ state: "detached", timeout: 2000 });
    });
  }

  // Shortcuts dialog fits and closes (the button is hidden on touch-only devices: no keyboard there).
  const keysBtn = page.getByRole("button", { name: "Keyboard shortcuts" });
  const touchOnly = await page.evaluate(() => matchMedia("(hover: none) and (pointer: coarse)").matches);
  if (touchOnly) {
    await check(r, "Shortcuts button hidden on touch-only", async () => (await keysBtn.count()) === 0 || !(await keysBtn.isVisible()));
  } else {
    await check(r, "Shortcuts dialog", async () => {
      await tap(keysBtn);
      const d = page.locator('[role=dialog][aria-label="Keyboard shortcuts"]');
      await d.waitFor({ timeout: 2000 });
      if (!(await within(d))) throw new Error("dialog does not fit the viewport");
      await tap(d.getByRole("button", { name: "Close" }));
      await d.waitFor({ state: "detached", timeout: 2000 });
    });
  }

  // Focus mode hides and restores the side panels.
  await check(r, "Focus mode", async () => {
    await tap(page.getByRole("button", { name: "Hide side panels" }));
    const hidden = await page.locator("main aside:visible").first().waitFor({ state: "detached", timeout: 2000 }).then(() => true, () => false);
    await tap(page.getByRole("button", { name: "Show side panels" }));
    const shown = await page.locator("main aside:visible").first().waitFor({ timeout: 2000 }).then(() => true, () => false);
    if (!hidden || !shown) throw new Error(`hide=${hidden} show=${shown}`);
  });

  // Whole-page and canvas fullscreen toggle on and off.
  for (const [label, exit] of [["Whole page fullscreen", "Exit fullscreen"], ["Fullscreen canvas", "Exit canvas fullscreen"]]) {
    await check(r, label, async () => {
      await tap(page.getByRole("button", { name: label, exact: true }));
      await page.waitForTimeout(400);
      const fs = await page.evaluate(() => !!document.fullscreenElement);
      if (fs) {
        // The canvas (and its playback bar) must be usable while fullscreen.
        if (label === "Fullscreen canvas") {
          const play = page.locator("[data-viz-canvas]:visible").locator("xpath=..").getByRole("button").last();
          if (!(await play.isVisible())) throw new Error("playback bar hidden in canvas fullscreen");
        }
        await tap(page.getByRole("button", { name: exit, exact: true }));
        await page.waitForTimeout(300);
        if (await page.evaluate(() => !!document.fullscreenElement)) throw new Error("did not exit fullscreen");
      } else {
        // No Fullscreen API (iPhone Safari): the page / canvas fills the window instead.
        const stage = page.locator('section[aria-label$="interactive visualization"]:visible');
        const target = label === "Fullscreen canvas" ? stage : stage.locator("xpath=..");
        const b = await target.boundingBox();
        const fills = b && Math.abs(b.x) < 2 && Math.abs(b.y) < 2 && Math.abs(b.width - vw) < 2 && Math.abs(b.height - vh) < 2;
        await tap(page.getByRole("button", { name: exit, exact: true }));
        await page.waitForTimeout(300);
        const back = await target.boundingBox();
        if (!fills) throw new Error(`no fullscreen and the fallback does not fill the window (${JSON.stringify(b)})`);
        if (back && Math.abs(back.height - vh) < 2 && Math.abs(back.y) < 2) throw new Error("did not leave the window-filling fallback");
      }
    });
  }

  // Share: copies a link, puts it in the address bar, and the link restores the same setup.
  const share = page.getByRole("button", { name: "Copy share link" });
  if (await share.count()) {
    await check(r, "Share link", async () => {
      await tap(share);
      await page.waitForTimeout(300);
      const url = page.url();
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
      if (clip && clip !== url) throw new Error(`clipboard ${clip} ≠ address bar ${url}`);
      const p2 = await page.context().newPage();
      const errs = [];
      p2.on("pageerror", (e) => errs.push(e.message));
      await p2.goto(url, { waitUntil: "load" });
      await p2.waitForTimeout(1500);
      await tap(p2.getByRole("button", { name: "Copy share link" }));
      await p2.waitForTimeout(300);
      const again = p2.url();
      await p2.close();
      const norm = (u) => [...new URL(u).searchParams].sort().join("&");
      if (errs.length) throw new Error(`restored page error: ${errs[0]}`);
      if (norm(again) !== norm(url)) throw new Error(`restored link differs:\n   ${url}\n   ${again}`);
    });
  }
}

async function playback(page, r) {
  const bar = page.locator('input[aria-label="Scrub through steps"]:visible');
  if (!(await bar.count())) return liveBar(page, r);
  let c = await scrubCounter(page);
  // Record something first: Enter in the first value box runs the main action (empty box = random).
  // If the earlier taps left a state where that can't run (e.g. a full heap), start from a fresh page.
  for (let attempt = 0; attempt < 2 && (!c || c.n < 3); attempt++) {
    if (attempt) {
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(2500);
    }
    const box = page.locator("main aside [data-value-input]:visible").first();
    if (await box.isVisible().catch(() => false)) {
      await box.fill("").catch(() => {});
      await box.press("Enter").catch(() => {});
      await page.waitForTimeout(800);
    }
    c = await scrubCounter(page);
    // The graph records on Run.
    const run = page.locator("main aside").getByRole("button", { name: "Run", exact: true });
    if ((!c || c.n < 3) && (await run.count())) {
      await tap(run.first()).catch(() => {});
      await page.waitForTimeout(800);
      c = await scrubCounter(page);
    }
  }
  if (!c || c.n < 3) {
    r.note(`playback: only ${c?.n ?? 0} step(s) available`);
    return;
  }
  const btn = (name) => page.getByRole("button", { name, exact: true });
  const pause = async () => { if (await btn("Pause").count()) await tap(btn("Pause")); };
  await pause();
  // First / Last are disabled when already there.
  const press = async (name) => { if (await btn(name).isEnabled()) await tap(btn(name)); };
  await check(r, "Playback last", async () => { await press("Last step"); return counterIs(page, (s) => s?.i === s?.n); });
  await check(r, "Playback first", async () => { await press("First step"); return counterIs(page, (s) => s?.i === 1); });
  await check(r, "Playback next", async () => { await tap(btn("Next step")); return counterIs(page, (s) => s?.i === 2); });
  await check(r, "Playback prev", async () => { await tap(btn("Previous step")); return counterIs(page, (s) => s?.i === 1); });
  await check(r, "Playback scrubber", async () => {
    await bar.scrollIntoViewIfNeeded();
    const box = await bar.boundingBox();
    // Touch the middle of the track.
    await tapAt(page, box.x + box.width / 2, box.y + box.height / 2);
    return counterIs(page, (s) => s && s.i > 1 && s.i < s.n);
  });
  await check(r, "Playback play/pause", async () => {
    if (await btn("First step").isEnabled()) await tap(btn("First step"));
    await tap(btn("Play"));
    await page.waitForTimeout(1600);
    const playing = await btn("Pause").count();
    const s = await scrubCounter(page);
    await pause();
    if (!playing) throw new Error("Play did not switch to Pause");
    return s.i > 1;
  });
  await speeds(page, r, async (s) => {
    const cls = await page.getByRole("button", { name: /^[\d.]+×$/ }).evaluateAll((els) => els.filter((e) => e.closest("section")).map((e) => [e.innerText, e.className]));
    const mine = cls.find(([t]) => t === s)?.[1];
    return cls.filter(([, c]) => c === mine).length === 1;
  });
  const stop = btn("Stop");
  if (await stop.count()) {
    await check(r, "Playback stop", async () => {
      await tap(btn("Last step"));
      await tap(stop);
      // Stop rewinds to the first step (or, on the graph, ends the run).
      return counterIs(page, (s) => !s || s.i === 1 || s.n <= 1);
    });
  }
}

/** Trees: pause / next / finish / step mode on a live engine. */
async function liveBar(page, r) {
  const stepMode = page.getByRole("switch", { name: /Step mode/ });
  if (!(await stepMode.count())) return;
  const box = page.locator("main aside [data-value-input]:visible").first();
  await check(r, "Step mode + next", async () => {
    await tap(stepMode);
    await box.fill("");
    await box.press("Enter");
    await page.waitForTimeout(700);
    const next = page.getByRole("button", { name: /^Next/ }).first();
    if (!(await waitEnabled(next, 4000))) throw new Error("Next never enabled in step mode");
    await tap(next);
    await page.waitForTimeout(300);
  });
  await check(r, "Finish now", async () => {
    const skip = page.getByRole("button", { name: /Finish now|Skip to end/ }).first();
    if (await skip.isEnabled()) await tap(skip);
    await page.waitForTimeout(400);
    await tap(stepMode);
  });
  await check(r, "Pause / resume", async () => {
    await box.fill("");
    await box.press("Enter");
    await page.waitForTimeout(300);
    const p = page.getByRole("button", { name: "Pause", exact: true }).first();
    if (!(await p.isEnabled().catch(() => false))) return true; // finished too quickly to pause
    await tap(p);
    const res = page.getByRole("button", { name: "Resume", exact: true }).first();
    await res.waitFor({ timeout: 2000 });
    await tap(res);
    await finishRuns(page);
  });
  await speeds(page, r);
}

/**
 * Every playback speed: the phone picker (a native select) where it is shown, else the speed chips.
 * `chipOk(label)` checks the chosen chip is the one marked as selected.
 */
async function speeds(page, r, chipOk) {
  const select = page.locator('select[aria-label="Playback speed"]:visible').first();
  for (const s of ["0.25×", "0.5×", "2×", "4×", "1×"]) {
    if (await select.count()) {
      await check(r, `Speed ${s} (picker)`, async () => {
        await select.scrollIntoViewIfNeeded();
        await select.selectOption({ label: s });
        return (await select.evaluate((el) => el.options[el.selectedIndex].text)) === s;
      });
      continue;
    }
    const b = page.getByRole("button", { name: s, exact: true }).or(page.getByRole("tab", { name: s, exact: true })).first();
    if (await b.count()) {
      await check(r, `Speed ${s}`, async () => {
        await tap(b);
        return chipOk ? chipOk(s) : true;
      });
    }
  }
}

async function codePanel(page, r) {
  const tabs = page.getByRole("tablist", { name: "Code language" }).first();
  if (!(await tabs.count())) return;
  const names = await tabs.getByRole("tab").allInnerTexts();
  for (const n of [...names.slice(1), names[0]]) {
    await check(r, `Code tab ${n}`, async () => {
      const t = tabs.getByRole("tab", { name: n, exact: true });
      await tap(t);
      if ((await t.getAttribute("aria-selected")) !== "true") return false;
      if (n !== "Pseudocode") {
        const copy = page.getByRole("button", { name: /^(Copy|Copied)$/ }).first();
        await tap(copy);
        const pre = tabs.locator("xpath=..").locator("pre");
        const o = await pre.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, ox: getComputedStyle(el).overflowX }));
        if (o.sw > o.cw && !/(auto|scroll)/.test(o.ox)) throw new Error("code does not scroll horizontally");
      }
    });
  }
}

async function cardsAndQuiz(page, r, vp) {
  for (const b of await buttonsIn(page, "main aside")) {
    if (!b.expanded) continue;
    await check(r, `Card "${b.name}"`, async () => {
      const loc = byQa(page, b);
      const was = await loc.getAttribute("aria-expanded");
      await tap(loc);
      const now = await loc.getAttribute("aria-expanded");
      if (now === was) return false;
      if (now === "false") await tap(loc); // leave it open so its content is exercised
    });
  }
  const quiz = page.locator("main aside:visible").getByRole("button", { name: /^Quiz me/ }).first();
  if (await quiz.count()) {
    await check(r, "Quiz", async () => {
      if ((await quiz.getAttribute("aria-expanded")) !== "true") await tap(quiz);
      const ask = page.getByRole("button", { name: /Ask me a question/ });
      await tap(ask);
      const card = quiz.locator("xpath=../..");
      const choices = card.locator("div.grid > button");
      if (!(await choices.count())) {
        r.note("quiz: nothing to ask on this state");
        return true;
      }
      await tap(choices.first());
      const fb = await card.innerText();
      if (!/Correct!|Not quite/.test(fb)) throw new Error("no feedback after answering");
      await tap(card.getByRole("button", { name: /Another question/ }));
      const b = await card.boundingBox();
      if (b && b.x + b.width > vp.width + 1) throw new Error("quiz card wider than the viewport");
    });
  }
}

async function valueInputs(page, r) {
  const boxes = page.locator("main aside [data-value-input]:visible");
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    const box = boxes.nth(i);
    if (!(await box.isVisible()) || !(await box.isEnabled())) continue;
    const label = (await box.getAttribute("aria-label")) ?? `input ${i}`;
    await check(r, `Input "${label}" rejects bad value`, async () => {
      await tap(box);
      await box.fill("abc");
      await box.press("Enter");
      await page.waitForTimeout(200);
      const invalid = await box.getAttribute("aria-invalid");
      await box.fill("");
      // Expression boxes (stack apps) take free text.
      return invalid === "true" || label === "Expression";
    });
    const dice = box.locator("xpath=..").getByRole("button", { name: /random/i });
    if (await dice.count()) {
      await check(r, `Input "${label}" dice`, async () => {
        await tap(dice);
        const v = await box.inputValue();
        await box.fill("");
        return v.trim().length > 0;
      });
    }
    // iOS zooms the page into any focused field under 16px.
    const fs = await box.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    if (fs < 16) r.fail(`Input "${label}" font`, `${fs}px (< 16px: iOS zooms in on focus)`);
  }
}

/** Taps every other enabled control in the side panels and header; selects every option; drags every slider. */
async function monkey(page, r, errors, limit = Infinity) {
  const skip = /^(Learn|Copy share link|Hide side panels|Show side panels|Whole page fullscreen|Exit fullscreen|Keyboard shortcuts|Quiz me.*|Ask me a question|Another question|Copy|Copied)$/;
  // Side panels first, header (mode tabs) last; re-scan after every tap, since a tap can swap the panel.
  const tried = new Set();
  const disabled = new Set();
  for (let guard = 0; guard < 120 && tried.size < limit; guard++) {
    const list = [...(await buttonsIn(page, "main aside")), ...(await buttonsIn(page, "main header"))]
      .filter((b) => !b.expanded && !skip.test(b.name) && !tried.has(b.name));
    const b = list.find((x) => !disabled.has(x.name)) ?? list[0];
    if (!b) break;
    const loc = byQa(page, b);
    if (!(await waitEnabled(loc, 4000))) {
      await finishRuns(page);
      if (!(await loc.isEnabled().catch(() => false))) {
        // Legitimately disabled in this state (e.g. Undo with no history); try it once more later.
        if (disabled.has(b.name)) tried.add(b.name);
        disabled.add(b.name);
        continue;
      }
    }
    tried.add(b.name);
    const errBefore = errors.length;
    const before = await pageSig(page, false);
    await check(r, `tap "${b.name.slice(0, 40)}"`, async () => {
      await tap(loc);
      await page.waitForTimeout(450);
      if (errors.length > errBefore) throw new Error(errors[errors.length - 1]);
      const after = await pageSig(page, false);
      if (after === before) r.note(`no visible change after "${b.name}"`);
    });
    await finishRuns(page);
  }

  const selects = page.locator("main aside select:visible");
  for (let i = 0; i < (await selects.count()); i++) {
    const s = selects.nth(i);
    if (!(await s.isVisible()) || !(await s.isEnabled())) continue;
    const name = (await s.getAttribute("aria-label")) ?? `select ${i}`;
    const values = await s.locator("option").evaluateAll((os) => os.map((o) => o.value));
    await check(r, `select "${name}" (${values.length} options)`, async () => {
      const errBefore = errors.length;
      for (const v of values.slice(0, 8)) {
        await s.selectOption(v);
        await page.waitForTimeout(250);
        await finishRuns(page);
      }
      if (errors.length > errBefore) throw new Error(errors[errors.length - 1]);
    });
  }

  const ranges = page.locator('main aside input[type="range"]:visible');
  for (let i = 0; i < (await ranges.count()); i++) {
    const s = ranges.nth(i);
    if (!(await s.isVisible()) || !(await s.isEnabled())) continue;
    const name = (await s.getAttribute("aria-label")) ?? `slider ${i}`;
    await check(r, `slider "${name}"`, async () => {
      await s.scrollIntoViewIfNeeded();
      const box = await s.boundingBox();
      const before = await s.inputValue();
      await tapAt(page, box.x + box.width - 4, box.y + box.height / 2);
      await page.waitForTimeout(250);
      const mid = await s.inputValue();
      await tapAt(page, box.x + 4, box.y + box.height / 2);
      await page.waitForTimeout(250);
      return mid !== before || (await s.inputValue()) !== mid;
    });
  }
}

/** Desktop: the keyboard shortcuts listed in the "?" dialog. */
async function keyboard(page, r) {
  const k = (key) => page.keyboard.press(key);
  await page.locator("main h1").click();
  const c0 = await scrubCounter(page);
  if (c0 && c0.n > 2) {
    if (await page.getByRole("button", { name: "Pause", exact: true }).count()) await k("Space");
    // Animated engines (graph) move the counter a moment after the key.
    await check(r, "Key End", async () => { await k("End"); return counterIs(page, (c) => c?.i === c?.n); });
    await check(r, "Key Home", async () => { await k("Home"); return counterIs(page, (c) => c?.i === 1); });
    await check(r, "Key →", async () => { await k("ArrowRight"); return counterIs(page, (c) => c?.i === 2); });
    await check(r, "Key ←", async () => { await k("ArrowLeft"); return counterIs(page, (c) => c?.i === 1); });
    await check(r, "Key Space", async () => {
      await k("Space");
      await page.waitForTimeout(1200);
      const playing = await page.getByRole("button", { name: "Pause", exact: true }).count();
      if (playing) await k("Space");
      return playing > 0;
    });
  }
  await check(r, "Key ?", async () => {
    await k("?");
    const d = page.locator('[role=dialog][aria-label="Keyboard shortcuts"]');
    await d.waitFor({ timeout: 2000 });
    await k("Escape");
    await d.waitFor({ state: "detached", timeout: 2000 });
  });
  for (const [key, el] of [["f", "section"], ["Shift+F", "main > div"]]) {
    await check(r, `Key ${key}`, async () => {
      await k(key);
      await page.waitForTimeout(400);
      const fs = await page.evaluate(() => document.fullscreenElement?.tagName.toLowerCase() ?? null);
      if (!fs) throw new Error("did not enter fullscreen");
      await k(key);
      await page.waitForTimeout(400);
      if (await page.evaluate(() => !!document.fullscreenElement)) throw new Error(`${el} stayed fullscreen`);
    });
  }
  await check(r, "Key Ctrl+K", async () => {
    await k("Control+k");
    const d = page.locator('[role=dialog][aria-label="Jump to a visualizer"]');
    await d.waitFor({ timeout: 2000 });
    const b = await d.boundingBox();
    await k("Escape");
    await d.waitFor({ state: "detached", timeout: 2000 });
    if (b.height < 200) throw new Error("palette list collapsed");
  });
  // Dialogs keep Tab inside and hand focus back to the button that opened them.
  await check(r, "Shortcuts dialog traps and restores focus", async () => {
    const opener = page.getByRole("button", { name: "Keyboard shortcuts" });
    await opener.focus();
    await k("Enter");
    const d = page.locator('[role=dialog][aria-label="Keyboard shortcuts"]');
    await d.waitFor({ timeout: 2000 });
    for (let i = 0; i < 4; i++) await k("Tab");
    const inside = await d.evaluate((el) => el.contains(document.activeElement));
    await k("Escape");
    await d.waitFor({ state: "detached", timeout: 2000 });
    const back = await opener.evaluate((el) => el === document.activeElement);
    if (!inside) throw new Error("Tab left the dialog");
    if (!back) throw new Error("focus not returned to the opener");
  });
}

// ───────────────────────────── feature-specific checks ─────────────────────────────

/** Konva helpers (Konva puts itself on window). */
const konva = {
  hud: (page) => page.evaluate(() => {
    const K = window.Konva;
    const texts = K?.stages?.flatMap((s) => s.find("Text")) ?? [];
    return texts.map((t) => t.text()).find((t) => /\d+ nodes?/.test(t)) ?? "";
  }),
  nodes: (page) => page.evaluate(() => {
    const K = window.Konva;
    const st = K?.stages?.find((s) => s.container().isConnected);
    if (!st) return [];
    const box = st.container().getBoundingClientRect();
    return st.find("Group").filter((g) => g.draggable() && g.isVisible()).map((g) => {
      const p = g.getAbsolutePosition();
      const label = g.findOne("Text")?.text();
      return { label, x: box.left + p.x, y: box.top + p.y };
    });
  }),
};
const count = (hud, what) => Number(new RegExp(`(\\d+) ${what}`).exec(hud)?.[1] ?? NaN);

async function touchDrag(page, from, to) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (p) => [{ x: p.x, y: p.y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(from) });
  for (let k = 1; k <= 8; k++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt({ x: from.x + ((to.x - from.x) * k) / 8, y: from.y + ((to.y - from.y) * k) / 8 }) });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

async function graphChecks(page, r) {
  await page.locator("[data-viz-canvas]:visible").scrollIntoViewIfNeeded();
  const tool = (n) => page.getByRole("button", { name: `${n} tool` });
  const canvasBox = async () => page.locator("[data-viz-canvas]:visible").boundingBox();

  await check(r, "Graph: Node tool adds a node by tap", async () => {
    await tap(tool("Node"));
    await page.locator("[data-viz-canvas]:visible").scrollIntoViewIfNeeded();
    const before = count(await konva.hud(page), "nodes");
    const b = await canvasBox();
    // Find an empty spot: try a few points near the bottom-left of the canvas.
    const nodes = await konva.nodes(page);
    const spots = [[0.15, 0.8], [0.5, 0.85], [0.85, 0.2], [0.2, 0.25], [0.5, 0.15]].map(([fx, fy]) => ({ x: b.x + b.width * fx, y: b.y + b.height * fy }));
    const spot = spots.find((s) => nodes.every((n) => Math.hypot(n.x - s.x, n.y - s.y) > 50)) ?? spots[0];
    await tapAt(page, spot.x, spot.y);
    await page.waitForTimeout(500);
    const after = count(await konva.hud(page), "nodes");
    if (!(after === before + 1)) throw new Error(`nodes ${before} → ${after}`);
  });
  await check(r, "Graph: Edge tool connects two nodes by tap", async () => {
    await tap(tool("Edge"));
    await page.locator("[data-viz-canvas]:visible").scrollIntoViewIfNeeded();
    const before = count(await konva.hud(page), "edges");
    const ns = await konva.nodes(page);
    const last = ns[ns.length - 1];
    const firstN = ns[0];
    await tapAt(page, last.x, last.y);
    await page.waitForTimeout(300);
    await tapAt(page, firstN.x, firstN.y);
    await page.waitForTimeout(500);
    // A new weighted edge opens the weight editor; Enter keeps the suggested weight.
    const editor = page.locator('[role=dialog][aria-label^="Weight of edge"]');
    if (await editor.count()) {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
    }
    const after = count(await konva.hud(page), "edges");
    if (!(after === before + 1)) throw new Error(`edges ${before} → ${after}`);
  });
  await check(r, "Graph: Delete tool removes a node by tap", async () => {
    await tap(tool("Delete"));
    await page.locator("[data-viz-canvas]:visible").scrollIntoViewIfNeeded();
    const before = count(await konva.hud(page), "nodes");
    const ns = await konva.nodes(page);
    const last = ns[ns.length - 1];
    await tapAt(page, last.x, last.y);
    await page.waitForTimeout(600);
    const after = count(await konva.hud(page), "nodes");
    if (!(after === before - 1)) throw new Error(`nodes ${before} → ${after}`);
  });
  await check(r, "Graph: Move tool drags a node by touch", async () => {
    await tap(tool("Move"));
    await page.locator("[data-viz-canvas]:visible").scrollIntoViewIfNeeded();
    const ns = await konva.nodes(page);
    const n = ns[0];
    await touchDrag(page, n, { x: n.x + 30, y: n.y + 30 });
    await page.waitForTimeout(300);
    const moved = (await konva.nodes(page)).find((m) => m.label === n.label);
    if (!moved || Math.hypot(moved.x - n.x, moved.y - n.y) < 10) throw new Error("node did not move");
  });
  await check(r, "Graph: weight editor by tap", async () => {
    const label = await page.evaluate(() => {
      const st = window.Konva?.stages?.find((s) => s.container().isConnected);
      const box = st.container().getBoundingClientRect();
      // Weight labels: a group of exactly [Rect, Text] holding a number.
      const g = st.find("Group").find((x) => {
        const c = x.getChildren();
        return x.listening() && c.length === 2 && c[0].getClassName() === "Rect" && c[1].getClassName() === "Text" && /^-?\d+$/.test(c[1].text());
      });
      if (!g) return null;
      const p = g.getAbsolutePosition();
      return { x: box.left + p.x, y: box.top + p.y };
    });
    if (!label) return true; // unweighted graph
    await tapAt(page, label.x, label.y);
    const editor = page.locator('[role=dialog][aria-label^="Weight of edge"]');
    await editor.waitFor({ timeout: 2000 });
    const b = await editor.boundingBox();
    const c = await canvasBox();
    if (b.x < c.x - 1 || b.x + b.width > c.x + c.width + 1) throw new Error("weight editor cut off by the canvas edge");
    await tap(editor.getByRole("button", { name: "Increase weight by 1" }));
    await tap(editor.getByRole("button", { name: /Set/ }));
    await editor.waitFor({ state: "detached", timeout: 2000 });
  });
  await check(r, "Graph: pan by touch + Reset view", async () => {
    await page.locator("[data-viz-canvas]:visible").scrollIntoViewIfNeeded();
    const c = await canvasBox();
    const ns = await konva.nodes(page);
    const spots = [[0.1, 0.92], [0.9, 0.08], [0.1, 0.08], [0.5, 0.95]].map(([fx, fy]) => ({ x: c.x + c.width * fx, y: c.y + c.height * fy }));
    const s = spots.find((p) => ns.every((n) => Math.hypot(n.x - p.x, n.y - p.y) > 45)) ?? spots[0];
    await touchDrag(page, s, { x: s.x + 40, y: s.y - 30 });
    await page.waitForTimeout(400);
    const reset = page.getByRole("button", { name: /Reset view/ });
    if (!(await reset.count())) throw new Error("touch drag on empty canvas did not pan");
    await tap(reset);
    await reset.waitFor({ state: "detached", timeout: 2500 }).catch(() => {});
    if (await reset.count()) throw new Error("Reset view did not reset");
  });
}

async function treeZoom(page, r) {
  // The monkey may have cleared the tree: insert a few random keys so zooming shows.
  const box = page.locator("main aside [data-value-input]:visible").first();
  for (let k = 0; k < 3; k++) {
    await box.fill("").catch(() => {});
    await box.press("Enter").catch(() => {});
    await page.waitForTimeout(300);
    await finishRuns(page);
  }
  // Reset first, so zoom in → zoom out → reset each change the view.
  await tap(page.locator("[data-viz-canvas]:visible").getByRole("button", { name: "Reset view", exact: true })).catch(() => {});
  for (const name of ["Zoom in", "Zoom in", "Zoom out", "Reset view"]) {
    await check(r, `Tree ${name}`, async () => {
      const before = await canvasSig(page);
      await tap(page.locator("[data-viz-canvas]:visible").getByRole("button", { name, exact: true }));
      await page.waitForTimeout(500);
      return (await canvasSig(page)) !== before;
    });
  }
}

async function compareMode(page, r) {
  await check(r, "Sorting: Compare mode", async () => {
    await tap(page.getByRole("tab", { name: /Compare/ }));
    await page.waitForTimeout(800);
    const before = await canvasSig(page);
    const play = page.locator("main").getByRole("button", { name: /^(Play|Race|Start)/ }).first();
    await tap(play);
    await page.waitForTimeout(1500);
    const after = await canvasSig(page);
    if (after === before) return false;
  });
  const cmpButtons = (await buttonsIn(page, "main aside")).filter((b) => !b.expanded);
  for (const b of cmpButtons.slice(0, 14)) {
    await check(r, `Compare: tap "${b.name.slice(0, 40)}"`, async () => {
      if (await byQa(page, b).isEnabled()) await tap(byQa(page, b));
    });
  }
  await check(r, "Sorting: back to Step-by-step", async () => {
    await tap(page.getByRole("tab", { name: /Step-by-step/ }));
    await page.locator('input[aria-label="Scrub through steps"]').waitFor({ timeout: 3000 });
  });
}

/** Tap the on-screen part of an element (Bit may be peeking in from the edge). */
async function tapVisible(page, loc) {
  const b = await loc.boundingBox();
  const vw = page.viewportSize().width;
  const left = Math.max(0, b.x);
  const right = Math.min(vw, b.x + b.width);
  if (right - left < 4) throw new Error("not on screen");
  await tapAt(page, (left + right) / 2, b.y + b.height / 2);
}

/** Bit must stay controllable by touch (no hover on phones): tap → stop / mute / hide. */
async function mascot(page, r) {
  const bit = page.locator('[title^="Bit"]').first();
  if (!(await bit.count())) {
    r.note("Bit not shown");
    return;
  }
  const menuOpen = () => page.getByRole("button", { name: "Hide Bit" }).count();
  await check(r, "Bit: tap opens his controls", async () => {
    await tapVisible(page, bit);
    await page.getByRole("button", { name: "Hide Bit" }).waitFor({ timeout: 2000 });
  });
  await check(r, "Bit: mute / unmute", async () => {
    if (!(await menuOpen())) await tapVisible(page, bit);
    await tap(page.getByRole("button", { name: "Mute Bit" }));
    await tap(page.getByRole("button", { name: "Let Bit talk" }));
    await page.getByRole("button", { name: "Mute Bit" }).waitFor({ timeout: 2000 });
  });
  await check(r, "Bit: stop / let move", async () => {
    if (!(await menuOpen())) await tapVisible(page, bit);
    await tap(page.getByRole("button", { name: "Stop Bit moving" }));
    await tap(page.getByRole("button", { name: "Let Bit move around" }));
    await page.getByRole("button", { name: "Stop Bit moving" }).waitFor({ timeout: 2000 });
  });
  await check(r, "Bit: controls close on outside tap", async () => {
    if (!(await menuOpen())) await tapVisible(page, bit);
    await tapAt(page, 5, page.viewportSize().height / 2);
    await page.getByRole("button", { name: "Hide Bit" }).waitFor({ state: "detached", timeout: 2000 });
  });
  await check(r, "Bit: hide and bring back", async () => {
    if (!(await menuOpen())) await tapVisible(page, bit);
    await tap(page.getByRole("button", { name: "Hide Bit" }));
    const back = page.locator('[title="Bring Bit back"]');
    await back.waitFor({ timeout: 2000 });
    await page.waitForTimeout(1800); // let it settle in a free corner
    await tapVisible(page, back);
    await page.locator('[title^="Bit"]').first().waitFor({ timeout: 3000 });
  });
}

/**
 * While scrolling the whole page, Bit must never hide a control or the canvas: no overlap with the
 * canvas, and never a control's middle or a good part (30 %) of it. A sliver of a wide card header is fine.
 */
async function bitCoverage(page, r, vp) {
  const hits = await page.evaluate(async () => {
    const out = new Set();
    const body = document.querySelector('[title^="Bit"]');
    const root = body?.closest(".fixed");
    if (!root) return ["(no Bit)"];
    const settle = async () => {
      // Wait until Bit stops moving (he walks to a free spot after a scroll).
      let last = "";
      for (let k = 0; k < 25; k++) {
        await new Promise((res) => setTimeout(res, 120));
        const b = body.getBoundingClientRect();
        const now = `${Math.round(b.left)},${Math.round(b.top)}`;
        if (now === last) return;
        last = now;
      }
    };
    const H = document.documentElement.scrollHeight;
    for (let y = 0; y < H; y += Math.round(window.innerHeight / 2)) {
      window.scrollTo(0, y);
      await settle();
      const b = body.getBoundingClientRect();
      const vis = { left: Math.max(0, b.left), right: Math.min(window.innerWidth, b.right), top: b.top, bottom: b.bottom };
      if (vis.right - vis.left < 4) continue; // peeking in at the edge
      for (const el of document.querySelectorAll("button, a[href], input, select, textarea, [role=tab], [role=switch], [data-viz-canvas]")) {
        if (root.contains(el)) continue;
        const rr = el.getBoundingClientRect();
        if (!rr.width || !rr.height) continue;
        const ix = Math.min(rr.right, vis.right) - Math.max(rr.left, vis.left);
        const iy = Math.min(rr.bottom, vis.bottom) - Math.max(rr.top, vis.top);
        if (ix <= 2 || iy <= 2) continue;
        const canvas = el.matches("[data-viz-canvas]");
        const cx = rr.left + rr.width / 2;
        const cy = rr.top + rr.height / 2;
        const middle = cx > vis.left && cx < vis.right && cy > vis.top && cy < vis.bottom;
        if (!canvas && !middle && (ix * iy) / (rr.width * rr.height) < 0.3) continue;
        // Visible there (not scrolled away inside a panel, not under the navbar)?
        const hit = document.elementsFromPoint(Math.max(rr.left, vis.left) + ix / 2, Math.max(rr.top, vis.top) + iy / 2).find((e) => !root.contains(e));
        if (!hit || !el.contains(hit)) continue;
        const what = canvas ? "canvas" : (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 24);
        const ae = document.activeElement;
        const focus = ae && ae !== document.body ? `${ae.tagName.toLowerCase()} ${ae.getAttribute("aria-label") ?? ""}`.trim() : "none";
        const still = localStorage.getItem("dsaviz:mascot.still") === "true" ? ", pinned" : "";
        out.add(`${what} (scrollY ${y}, Bit at ${Math.round(b.left)},${Math.round(b.top)}, focus: ${focus}${still})`);
      }
    }
    window.scrollTo(0, 0);
    return [...out];
  });
  if (hits.length) r.fail(`Bit covers (${vp.name})`, hits.slice(0, 8).join(", "));
  else r.pass();
}

// ───────────────────────────── non-visualizer pages ─────────────────────────────

async function sitePages(ctx, BASE, vp, watch, settle) {
  const reports = [];
  const page = await ctx.newPage();
  const errors = watch(page);

  const home = new Report(`[${vp.name}] / (home, navbar, palette, video)`);
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await settle(page, 1500);
  if (vp.width < 1024) {
    await check(home, "Navbar menu opens", async () => {
      await tap(page.getByRole("button", { name: "Toggle navigation" }));
      await page.getByRole("link", { name: "Graph Algorithms" }).first().waitFor({ timeout: 2000 });
    });
    await check(home, "Navbar menu link navigates and closes", async () => {
      await tap(page.locator("nav").getByRole("link", { name: /Binary Heap/ }).first());
      await page.waitForURL(/\/heap$/, { timeout: 15000 });
      await page.waitForTimeout(500);
      if (await page.locator("nav .grid-cols-2").count()) throw new Error("menu still open after navigating");
    });
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await settle(page, 800);
  }
  await check(home, "Search palette", async () => {
    await tap(page.getByRole("button", { name: "Search visualizers" }));
    const d = page.locator('[role=dialog][aria-label="Jump to a visualizer"]');
    await d.waitFor({ timeout: 2000 });
    const b = await d.boundingBox();
    if (b.x < 0 || b.x + b.width > vp.width + 1) throw new Error("palette wider than the viewport");
    await d.locator("input").fill("dijkstra");
    await tap(d.getByRole("button", { name: /Graph Algorithms/ }));
    await page.waitForURL(/\/graph$/, { timeout: 15000 });
  });
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await settle(page, 800);
  await check(home, "Search palette closes with its close button", async () => {
    await tap(page.getByRole("button", { name: "Search visualizers" }));
    const d = page.locator('[role=dialog][aria-label="Jump to a visualizer"]');
    await d.waitFor({ timeout: 2000 });
    const b = await d.getByRole("button", { name: "Close" }).boundingBox();
    if (TOUCH && (b.width < 43.5 || b.height < 43.5)) throw new Error(`close button ${Math.round(b.width)}x${Math.round(b.height)}`);
    await tap(d.getByRole("button", { name: "Close" }));
    await d.waitFor({ state: "detached", timeout: 2000 });
  });
  await check(home, "Search palette closes on backdrop tap", async () => {
    await tap(page.getByRole("button", { name: "Search visualizers" }));
    const d = page.locator('[role=dialog][aria-label="Jump to a visualizer"]');
    await d.waitFor({ timeout: 2000 });
    await tapAt(page, 8, vp.height - 8);
    await d.waitFor({ state: "detached", timeout: 2000 });
  });
  await check(home, "Tour video play / pause", async () => {
    const btn = page.getByRole("button", { name: /^(Play|Pause) the tour video$/ });
    await btn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const v = page.locator("video");
    const playingNow = await v.evaluate((el) => !el.paused);
    await tap(btn);
    await page.waitForTimeout(800);
    const after = await v.evaluate((el) => !el.paused);
    if (after === playingNow) throw new Error(`video paused=${!after} did not toggle`);
    await tap(btn);
    const box = await v.boundingBox();
    if (box.width > vp.width) throw new Error("video wider than the viewport");
  });
  await check(home, "Visualizer card link", async () => {
    await tap(page.locator("#visualizers a").first());
    await page.waitForURL((u) => u.pathname !== "/", { timeout: 15000 });
  });
  if (errors.length) home.fail("console/page errors", errors.join(" | "));
  reports.push(home);

  const nf = new Report(`[${vp.name}] 404`);
  errors.length = 0;
  await page.goto(`${BASE}/this-page-does-not-exist`, { waitUntil: "load" });
  await check(nf, "404 back link", async () => {
    await tap(page.getByRole("link", { name: /Back to all visualizers/ }));
    await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });
  });
  reports.push(nf);

  const about = new Report(`[${vp.name}] /about`);
  errors.length = 0;
  await page.goto(`${BASE}/about`, { waitUntil: "load" });
  await settle(page, 800);
  if (errors.length) about.fail("console/page errors", errors.join(" | "));
  else about.pass();
  reports.push(about);
  await page.close();
  return reports;
}

// ───────────────────────────── driver ─────────────────────────────

/**
 * One visualizer page. `depth`: "all" taps every control (hubs at the phone size), "some" taps the
 * first dozen (sub-pages: same controls as their hub, different starting state), "shared" only runs
 * the shared checks (other sizes).
 */
async function vizPage(ctx, BASE, path, vp, { watch, settle, depth, flag }) {
  const r = new Report(`[${vp.name}] ${path}`);
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = watch(page);
  try {
    await page.goto(BASE + path, { waitUntil: "load", timeout: 90000 });
    await settle(page, 2500);
    if (depth !== "shared") {
      await monkey(page, r, errors, depth === "all" ? Infinity : 12);
      await valueInputs(page, r);
      if (path.startsWith("/graph")) await graphChecks(page, r);
      if (TREE(path)) await treeZoom(page, r);
      if (path.startsWith("/sorting")) await compareMode(page, r);
    }
    await playback(page, r);
    await codePanel(page, r);
    await cardsAndQuiz(page, r, vp);
    await header(page, r, vp, errors);
    if (!vp.touch) await keyboard(page, r);
    if (depth === "all" || flag("bit")) {
      if (vp.touch) await mascot(page, r);
      await bitCoverage(page, r, vp);
    }
  } catch (e) {
    r.fail("page", first(e));
  }
  for (const e of errors) r.fail("error", e);
  await page.close();
  return r;
}

function print(r) {
  const head = r.failed.length ? "FAIL" : "ok  ";
  console.log(`${head} ${r.name} — ${r.tried} controls tried, ${r.failed.length} failed`);
  for (const f of r.failed) console.log(`       ✗ ${f}`);
  for (const n of r.notes) console.log(`       · ${n}`);
}

export async function controlsSweep({ browser, BASE, VIEWPORTS, contextFor, watch, settle, paths, flag }) {
  console.log(`\n=== CONTROLS (${BASE}) ===`);
  const failures = [];
  // Every control on every page at a phone size; the shared bits at every other size.
  const fullVp = VIEWPORTS.find((v) => v.name === "390") ?? VIEWPORTS[0];
  for (const vp of VIEWPORTS) {
    TOUCH = vp.touch;
    const full = vp === fullVp;
    const noFs = flag("no-fullscreen-api") || vp.name === "360";
    const ctx = await contextFor(browser, vp);
    await ctx.addInitScript((noFs) => {
      try {
        // Meet Bit already (no intro bubble), and keep him on.
        localStorage.setItem("dsaviz:mascot.greeted", "true");
        localStorage.removeItem("dsaviz:mascot.hidden");
      } catch {}
      // iOS Safari has no element fullscreen: emulate that at 360px.
      if (noFs) {
        delete Element.prototype.requestFullscreen;
        Object.defineProperty(Element.prototype, "requestFullscreen", { value: undefined, configurable: true });
      }
    }, noFs);
    for (const r of await sitePages(ctx, BASE, vp, watch, settle)) {
      print(r);
      if (r.failed.length) failures.push(r.name);
    }
    const viz = paths.filter(isViz).filter((p) => (full && !flag("hubs")) || HUBS.includes(p));
    for (const path of viz) {
      const depth = !full ? "shared" : HUBS.includes(path) ? "all" : "some";
      const r = await vizPage(ctx, BASE, path, vp, { watch, settle, depth, flag });
      print(r);
      if (r.failed.length) failures.push(r.name);
    }
    await ctx.close();
  }
  return failures;
}
