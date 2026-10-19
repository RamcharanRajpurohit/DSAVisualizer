// Cuts the footage each scene needs into still frames (already re-timed to the scene's rate),
// so the renderer can show exact frames instead of seeking <video> elements.
//
//   node video/build-frames.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FOOTAGE, FPS, WIPE } from "./composition/scenes.js";

const HERE = dirname(fileURLToPath(import.meta.url));

const counts = {};
for (const s of FOOTAGE) {
  const out = join(HERE, "build/frames", s.id);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const outDur = s.dur + WIPE + 0.2;
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-ss", String(s.src), "-t", String(outDur * s.rate),
    "-i", join(HERE, "footage", `${s.clip}.mp4`),
    "-vf", `setpts=PTS/${s.rate},fps=${FPS}`,
    "-q:v", "2", join(out, "%05d.jpg"),
  ]);
  counts[s.id] = readdirSync(out).length;
  console.log(`${s.id}: ${counts[s.id]} frames`);
}
writeFileSync(join(HERE, "build/frames/manifest.js"), `export const COUNTS = ${JSON.stringify(counts)};\n`);
