"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * Tiny preference store: an in-memory cache backed by localStorage (when available).
 * Server render and the first client render see "unknown", so nothing mismatches during
 * hydration; the stored value arrives on the next render.
 */
const PREFIX = "dsaviz:";
const SERVER = "\u0000ssr";
const mem = new Map<string, string | null>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  if (mem.has(key)) return mem.get(key) ?? null;
  let v: string | null = null;
  try {
    v = window.localStorage.getItem(PREFIX + key);
  } catch {
    v = null;
  }
  mem.set(key, v);
  return v;
}

function write(key: string, value: string) {
  mem.set(key, value);
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    /* private mode / blocked storage: keep it in memory only */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) {
      mem.delete(e.key.slice(PREFIX.length));
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * A persisted, JSON-serialisable preference.
 * Returns [value, setValue, known] — `known` is false until the client has read storage.
 */
export function usePreference<T extends string | number | boolean>(key: string, fallback: T) {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => SERVER);
  const known = raw !== SERVER;
  let value = fallback;
  if (known && raw != null) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === typeof fallback) value = parsed as T;
    } catch {
      /* ignore corrupt values */
    }
  }
  const set = useCallback((v: T) => write(key, JSON.stringify(v)), [key]);
  return [value, set, known] as const;
}
