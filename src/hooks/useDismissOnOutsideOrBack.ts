"use client";

import { useCallback, useEffect, useRef } from "react";

// Closes an open dropdown/drawer on an outside click, Escape, or the
// browser/hardware back button. Back-button support works by pushing a
// same-URL history entry while open, so pressing back pops that entry
// (closing the UI) instead of navigating to the previous page.
//
// Returns `dismiss`: call it from any in-panel link/button that itself
// navigates (e.g. a next/link `onClick`). Popping the trapped entry with
// `history.back()` there would race the link's own `pushState` — since both
// run in the same click — and can silently swallow the navigation. `dismiss`
// neutralizes the trapped entry synchronously with `replaceState` instead,
// which can't race, before the link's handler gets to push the new URL.
export function useDismissOnOutsideOrBack(
  open: boolean,
  onClose: () => void,
  ref: React.RefObject<HTMLElement | null>,
) {
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const dismiss = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      history.replaceState(null, "");
    }
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!open) return;

    history.pushState({ dismissable: true }, "");
    pushedRef.current = true;

    // Outside click / Escape: nothing else navigates at the same time, so
    // popping the trapped entry with `back()` is safe and leaves no residue.
    function closeAndPop() {
      pushedRef.current = false;
      history.back();
      onCloseRef.current();
    }

    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closeAndPop();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAndPop();
    }
    function onPopState() {
      // The back button already popped the entry itself.
      pushedRef.current = false;
      onCloseRef.current();
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
      // Reached when `open` flipped to false through some path other than
      // the handlers above (e.g. a caller that closes without calling
      // `dismiss()`). Neutralize rather than `back()` — safe even if this
      // runs alongside another navigation.
      if (pushedRef.current) {
        pushedRef.current = false;
        history.replaceState(null, "");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return dismiss;
}
