"use client";

import { useEffect, useRef, type RefObject } from "react";

/** A ref that always holds the latest committed value — for callbacks that run later (agent tools). */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
