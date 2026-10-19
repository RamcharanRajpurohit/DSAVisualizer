"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TOUR } from "@/config/tour";

/**
 * Product tour. Nothing downloads until it scrolls into view (preload="none"), then it plays
 * muted on a loop (browsers only autoplay muted video); "Sound on" unmutes it. It pauses
 * off-screen, never autoplays for reduced-motion users, and a pause from the visitor sticks.
 */
export function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!reduced && !userPaused.current) v.play().catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => {});
    } else {
      userPaused.current = true;
      v.pause();
    }
  };

  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) {
      userPaused.current = false;
      v.play().catch(() => {});
    }
  };

  return (
    <figure className="m-0">
      <div className="group relative overflow-hidden rounded-2xl border border-line bg-bg-elev shadow-[0_24px_60px_-34px_rgba(40,28,12,0.45)]">
        <video
          ref={ref}
          className="block aspect-video h-auto w-full cursor-pointer"
          width={TOUR.width}
          height={TOUR.height}
          poster={TOUR.poster}
          preload="none"
          muted
          loop
          playsInline
          disablePictureInPicture
          onClick={toggle}
          aria-label={`${TOUR.title} — ${TOUR.description}`}
        >
          {TOUR.sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
        <button
          type="button"
          onClick={toggle}
          className="absolute bottom-3 left-3 flex h-10 items-center gap-2 rounded-full border border-line-strong bg-bg-elev/90 px-4 text-sm font-medium text-fg shadow-[0_1px_2px_rgba(0,0,0,0.08)] backdrop-blur transition hover:bg-bg-elev"
          aria-label={playing ? "Pause the tour video" : "Play the tour video"}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
          {playing ? "Pause" : "Play tour"}
        </button>
        {TOUR.hasAudio && (
          <button
            type="button"
            onClick={toggleSound}
            className="absolute bottom-3 right-3 flex h-10 items-center gap-2 rounded-full border border-line-strong bg-bg-elev/90 px-4 text-sm font-medium text-fg shadow-[0_1px_2px_rgba(0,0,0,0.08)] backdrop-blur transition hover:bg-bg-elev"
            aria-label={muted ? "Turn the tour video's sound on" : "Mute the tour video"}
            aria-pressed={!muted}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            {muted ? "Sound on" : "Mute"}
          </button>
        )}
      </div>
      <figcaption className="mt-3 text-sm text-fg-faint">{TOUR.description}</figcaption>
    </figure>
  );
}
