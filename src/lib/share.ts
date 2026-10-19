"use client";

import { useMemo, useSyncExternalStore } from "react";

export type ShareParams = Record<string, string | number | boolean | undefined | null>;

const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};

/**
 * The page's query parameters, or null during the server render / first hydration pass.
 * Pages read this once to restore a shared link (e.g. /sorting?algo=quick&a=5,3,8).
 */
export function useUrlParams(): URLSearchParams | null {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => null);
  return useMemo(() => (search == null ? null : new URLSearchParams(search)), [search]);
}

/** Absolute URL of the current page with `params` as its query string. */
export function buildShareUrl(params: ShareParams): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, String(v));
  }
  const qs = q.toString();
  return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
}

/** Comma list helpers for query values. */
export const listParam = (values: readonly (string | number)[]) => values.join(",");
export const parseListParam = (v: string | null | undefined, { min = 0, max = 999, limit = 40 } = {}) =>
  (v ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => /^-?\d+$/.test(x))
    .map(Number)
    .filter((n) => n >= min && n <= max)
    .slice(0, limit);
