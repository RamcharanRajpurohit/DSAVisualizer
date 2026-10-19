// Cuts the footage each scene needs into still frames (already re-timed to each part's rate),
// so the renderer can show exact frames instead of seeking <video> elements. Also copies the
// click logs written by record.mjs into the manifest the composition reads.
//
//   node video/build-frames.mjs
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FOOTAGE, FPS, TAIL } from "./composition/scenes.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const partKey = (s, k) => (s.parts.length > 1 ? `${s.id}-${k}` : s.id);

const counts = {};
const clicks = {};
for (const s of FOOTAGE) {
  s.parts.forEach((part, k) => {
    const key = partKey(s, k);
    const out = join(HERE, "build/frames", key);
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    const srcLen = Math.min(part.len ?? Infinity, (s.dur + TAIL) * part.rate);
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error",
      "-ss", String(part.src), "-t", String(srcLen),
      "-i", join(HERE, "footage", `${s.clip}.mp4`),
      "-vf", `setpts=PTS/${part.rate},fps=${FPS}`,
      "-q:v", "2", join(out, "%05d.jpg"),
    ]);
    counts[key] = readdirSync(out).length;
    console.log(`${key}: ${counts[key]} frames`);
  });
  const log = join(HERE, "footage", `${s.clip}.clicks.json`);
  if (existsSync(log)) clicks[s.clip] = JSON.parse(readFileSync(log, "utf8"));
}
writeFileSync(
  join(HERE, "build/frames/manifest.js"),
  `export const COUNTS = ${JSON.stringify(counts)};\nexport const CLICKS = ${JSON.stringify(clicks)};\n`,
);
