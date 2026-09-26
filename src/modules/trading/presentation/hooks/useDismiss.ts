"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Closes a hand-rolled dropdown when the user presses outside every element in `refs` (the
 * trigger and the panel, so the trigger's own toggle still works) or presses Escape.
 * The reference's dropdowns only close from their trigger or an item; this adds the usual
 * dismissal on top.
 */
export function useDismiss(refs: readonly RefObject<HTMLElement | null>[], open: boolean, onClose: () => void) {
  const targets = useRef(refs);
  // Latest refs and onClose without re-subscribing when the caller passes a new closure each render.
  const close = useRef(onClose);
  useEffect(() => {
    targets.current = refs;
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!targets.current.some((ref) => ref.current?.contains(target))) close.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
}
