"use client";

import { useEffect } from "react";
import { startAnalytics } from "@/lib/analytics";

/** Starts analytics once the page is idle, so it never competes with the first paint. */
export function AnalyticsLoader() {
  useEffect(() => {
    const start = () => void startAnalytics();
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(start, { timeout: 4000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(start, 2500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
