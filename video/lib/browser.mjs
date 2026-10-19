// Shared browser launcher for the video scripts. Uses the system Google Chrome through
// playwright-core — no extra dependencies: set PLAYWRIGHT_CORE to a playwright-core folder,
// or let it pick the newest stable copy from the npx cache.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function findPlaywrightCore() {
  if (process.env.PLAYWRIGHT_CORE) return process.env.PLAYWRIGHT_CORE;
  const root = join(homedir(), ".npm/_npx");
  const found = [];
  for (const dir of existsSync(root) ? readdirSync(root) : []) {
    const pkg = join(root, dir, "node_modules/playwright-core");
    if (!existsSync(join(pkg, "package.json"))) continue;
    const { version } = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8"));
    if (!version.includes("-")) found.push({ pkg, version });
  }
  const cmp = (a, b) => a.split(".").map(Number).reduce((d, n, i) => d || n - Number(b.split(".")[i] ?? 0), 0);
  found.sort((a, b) => cmp(b.version, a.version));
  if (!found.length) throw new Error("playwright-core not found — set PLAYWRIGHT_CORE");
  return found[0].pkg;
}

export async function launch() {
  const pw = await import(pathToFileURL(join(findPlaywrightCore(), "index.mjs")).href);
  const chromium = pw.chromium ?? pw.default.chromium;
  return chromium.launch({
    executablePath: process.env.CHROME ?? "/usr/bin/google-chrome",
    headless: true,
    args: ["--hide-scrollbars", "--force-color-profile=srgb", "--disable-features=Translate"],
  });
}
