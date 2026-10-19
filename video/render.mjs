// Renders composition/index.html to video, one deterministic frame at a time.
//
//   node video/render.mjs                    # full render → out/algolab-demo-master.mp4
//   node video/render.mjs --stills 2,9.5,44  # spot-check frames → out/still-<t>.jpg
//   node video/render.mjs --from 6 --to 14   # render a slice (quick iteration)
import { spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./lib/browser.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(HERE, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!file.startsWith(HERE) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/composition/?render`;

mkdirSync(OUT, { recursive: true });
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => window.__ready);
  const { duration, fps } = await page.evaluate(() => ({ duration: window.__duration, fps: window.__fps }));
  const shot = () => page.screenshot({ type: "jpeg", quality: 96, clip: { x: 0, y: 0, width: 1920, height: 1080 } });

  if (arg("--stills")) {
    for (const t of arg("--stills").split(",").map(Number)) {
      await page.evaluate((t) => window.__seek(t), t);
      await page.screenshot({ path: join(OUT, `still-${t}.jpg`), type: "jpeg", quality: 90 });
      console.log(`still ${t}s`);
    }
  } else {
    const from = Number(arg("--from") ?? 0), to = Number(arg("--to") ?? duration);
    const file = join(OUT, args.includes("--from") || args.includes("--to") ? `slice-${from}-${to}.mp4` : "algolab-demo-master.mp4");
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-movflags", "+faststart", file], { stdio: ["pipe", "inherit", "inherit"] });
    const done = new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error(`ffmpeg exited ${c}`)))));
    const total = Math.round((to - from) * fps);
    const started = Date.now();
    for (let i = 0; i < total; i++) {
      await page.evaluate((t) => window.__seek(t), from + i / fps);
      if (!ff.stdin.write(await shot())) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 150 === 0) console.log(`frame ${i}/${total} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
    }
    ff.stdin.end();
    await done;
    console.log(`wrote ${file}`);
  }
} finally {
  await browser.close();
  server.close();
}
