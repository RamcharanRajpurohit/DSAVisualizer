"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal focus handling: while `active`, focus moves into the box (unless something inside already has
 * it), Tab and Shift+Tab cycle inside it, and focus returns to whatever had it before on close.
 * `trap: false` (non-modal panels) only moves focus in and back.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active = true, trap = true) {
  useEffect(() => {
    const box = ref.current;
    if (!active || !box) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const items = () => [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
    if (!box.contains(document.activeElement)) (items()[0] ?? box).focus();

    const onKey = (e: KeyboardEvent) => {
      if (!trap || e.key !== "Tab") return;
      const list = items();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    box.addEventListener("keydown", onKey);
    return () => {
      box.removeEventListener("keydown", onKey);
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, [ref, active, trap]);
}
