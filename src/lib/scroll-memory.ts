/**
 * Where the reader was on each page — the store behind ScrollMemory.
 *
 * Two things make this more than a `Map`:
 *
 * 1. It is mirrored into `sessionStorage`. A phone will discard a backgrounded
 *    document to reclaim memory, so pressing Back can hand the reader a page
 *    that is being parsed from scratch — module state and all. An in-memory map
 *    has nothing left to restore from at that point, which is exactly the
 *    "Back always dumps me at the top" symptom on mobile. `sessionStorage` is
 *    per-tab and survives that reload, so the position does too.
 *
 * 2. Tracking can be switched off for a moment, so scrolling the app does on
 *    its own behalf — the scroll-to-top that puts a pending-navigation skeleton
 *    at its start — cannot be mistaken for the reader moving and overwrite the
 *    position we are about to need.
 *
 * Positions are keyed by pathname, deliberately ignoring the query string: the
 * only query strings in the app are the listing tag filters, which re-render the
 * same list in place, and `usePathname` is the one URL signal a client
 * component in the root layout can read without opting every static page out of
 * prerendering.
 */

const STORE_KEY = "scrollMemory:v1";

/** Pages to remember before the least recently used one is dropped. */
const MAX_ENTRIES = 80;

/**
 * Debounce for the `sessionStorage` write. The in-memory map is updated on
 * every scroll event; serialising on each one would be pointless work, and
 * nothing reads the stored copy until the document is replaced.
 */
const FLUSH_MS = 400;

let positions: Map<string, number> | null = null;
let flushTimer = 0;
let suppressed = false;

function store(): Map<string, number> {
  if (positions !== null) return positions;

  const map = new Map<string, number>();
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed !== null && typeof parsed === "object") {
        for (const [path, y] of Object.entries(parsed)) {
          if (typeof y === "number" && Number.isFinite(y) && y > 0) map.set(path, y);
        }
      }
    }
  } catch {
    // Storage blocked in private mode, a quota error, a half-written value:
    // starting from an empty map is a perfectly good fallback. The only cost is
    // that this tab's first Back lands at the top.
  }

  positions = map;
  return map;
}

/** The reader's last position on `path`, or null if we have never seen it. */
export function getScroll(path: string): number | null {
  return store().get(path) ?? null;
}

export function setScroll(path: string, y: number): void {
  const map = store();
  // Delete before setting so iteration order stays oldest-first and the
  // eviction below drops the page the reader is least likely to return to.
  map.delete(path);
  map.set(path, Math.round(y));
  if (map.size > MAX_ENTRIES) {
    const oldest = map.keys().next();
    if (!oldest.done) map.delete(oldest.value);
  }
  if (flushTimer === 0) flushTimer = window.setTimeout(flush, FLUSH_MS);
}

/**
 * Drop the remembered position for `path`, so the next arrival there starts at
 * the top.
 *
 * This is what "take me home" means when it is asked for explicitly — the
 * brand in the header — as opposed to the tab next to it, which is a way back
 * to a page you were reading and keeps your place.
 */
export function forgetScroll(path: string): void {
  const map = store();
  if (!map.delete(path)) return;
  if (flushTimer === 0) flushTimer = window.setTimeout(flush, FLUSH_MS);
}

/**
 * Write the map out now. Called on a debounce, and directly whenever the
 * document may be about to go away — a pending write lost there is the one that
 * mattered most.
 */
export function flush(): void {
  if (flushTimer !== 0) {
    clearTimeout(flushTimer);
    flushTimer = 0;
  }
  if (positions === null) return;
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(positions)));
  } catch {
    // Out of quota or blocked. The in-memory map still serves this document,
    // so soft navigations keep working; only a reload would lose the positions.
  }
}

/**
 * Stop recording scroll positions until the page changes or the reader touches
 * something.
 *
 * Used by the pending-navigation skeleton, which scrolls the window to the top
 * of the page it is covering — while the router still reports the *old*
 * pathname. Recorded, that would overwrite the position of the page being left
 * with 0, and Back would return the reader to the top of it.
 *
 * Both ways out of this state are events we already listen for, on purpose: a
 * navigation that never lands must not leave tracking switched off for the rest
 * of the session.
 */
export function suppressTracking(): void {
  suppressed = true;
}

export function resumeTracking(): void {
  suppressed = false;
}

export function trackingSuppressed(): boolean {
  return suppressed;
}
