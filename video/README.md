# AlgoLab tour video

The 50-second product tour on the home page (`public/video/algolab-tour.*`) is built from code:
real footage of the live site, composed in HTML/CSS and rendered frame by frame — the same idea as
[HyperFrames](https://github.com/heygen-com/hyperframes) (HTML → headless Chrome → FFmpeg), with no
extra dependencies. Needs Node 22+, FFmpeg and Google Chrome; `playwright-core` is picked up from the
npx cache (or set `PLAYWRIGHT_CORE`).

```bash
node video/record.mjs          # 1. record each shot from the live site → video/footage/*.mp4
node video/build-frames.mjs    # 2. cut the frames each scene needs     → video/build/frames/
node video/render.mjs --stills 4.6,21,34,49.5   # spot-check frames     → video/out/still-*.jpg
node video/render.mjs          # 3. render the master                  → video/out/algolab-demo-master.mp4
```

Open `video/composition/` through any static server to preview the timeline live (`?t=12.5` freezes
one moment). Scene timing, copy and zooms live in `composition/scenes.js`; everything else in
`composition/main.js` is a pure function of time (`renderAt(t)`), so renders are deterministic.

Web encodes (run from the repo root after a render) — AV1 1080p first, H.264 720p as the fallback:

```bash
M=video/out/algolab-demo-master.mp4
ffmpeg -y -i $M -c:v libsvtav1 -preset 6 -crf 40 -g 240 -pix_fmt yuv420p -movflags +faststart -an public/video/algolab-tour-vN-av1.mp4
ffmpeg -y -i $M -vf scale=1280:720:flags=lanczos -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart -an public/video/algolab-tour-vN.mp4
ffmpeg -y -ss 4.9 -i $M -frames:v 1 -vf scale=1280:-1 -q:v 3 public/video/algolab-tour-vN-poster.jpg
```

Replace `vN` with the cut number and point `src/config/tour.ts` at it. `footage/`, `build/` and `out/` are git-ignored; keep `TOUR` in `src/config/tour.ts` in sync with the
duration in `scenes.js`.
