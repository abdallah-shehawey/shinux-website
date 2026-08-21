"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { resumeTracking, suppressTracking } from "@/lib/scroll-memory";
import { skeletonForPath, type SkeletonDir } from "./route-skeletons";

/**
 * How long a navigation is allowed to take before the UI admits it is loading.
 *
 * Zero would be wrong: a prefetched tab commits in a frame or two, and a
 * skeleton that flashes for 16ms on an already-instant navigation is worse
 * than no skeleton at all. This window is short enough to stay under the
 * ~100ms that reads as "instant", so the fast path shows nothing and the slow
 * path never shows a frozen page.
 */
const SHOW_AFTER_MS = 90;

/**
 * Escape hatch for a navigation that never lands — a dropped connection, a
 * request the router gave up on. The pathname never changes in those cases, so
 * without this the skeleton would sit there forever. Generous enough not to
 * cut off a genuinely slow page on a bad mobile connection.
 */
const GIVE_UP_AFTER_MS = 10_000;

const PendingContext = createContext<string | null>(null);

/** Where an in-flight navigation is heading, or null if none is in flight. */
export function usePendingNavigation(): string | null {
  return useContext(PendingContext);
}

/**
 * The path the whole UI should present as current — the destination of an
 * in-flight navigation if there is one, otherwise where we actually are.
 *
 * The nav bars highlight this rather than the committed pathname so the tab
 * you clicked lights up at the same moment its skeleton appears. Otherwise the
 * header would still be pointing at the page you just left while its content
 * is already gone, which reads as a bug.
 */
export function useNavigationTarget(): string {
  const pathname = usePathname();
  return usePendingNavigation() ?? pathname;
}

type Pending = { from: string; to: string };

/**
 * Which way each page reads, learned from the links that point at it.
 *
 * A URL cannot say whether the article behind it is Arabic, and the skeleton
 * has to know before the page arrives — so the link carries the answer
 * (`data-skeleton-dir`), because whoever rendered it knew the locale. Kept per
 * path so Back and Forward, which have no click to read it from, can replay it.
 */
const dirByPath = new Map<string, SkeletonDir>();

/**
 * Tell the skeletons which way to read.
 *
 * An attribute on <html> rather than a prop, because the skeleton is rendered
 * twice by two different things: once here, and again by Next.js as the route's
 * own loading boundary the moment the URL commits — that second one gets no
 * props, and used to flip an Arabic article's layout to English and back while
 * it was still loading. CSS is the one channel both copies can read. LTR is the
 * default and carries no attribute, so a page with no hint is unaffected.
 */
function applySkeletonDir(dir: SkeletonDir) {
  const root = document.documentElement;
  if (dir === "rtl") root.dataset.skeletonDir = "rtl";
  else delete root.dataset.skeletonDir;
}

/**
 * Tracks the navigation a link click has started but the router hasn't
 * committed yet — the gap this app previously had no way to show.
 *
 * The App Router cannot fill that gap on its own. When a route isn't in the
 * client cache, `navigateToUnknownRoute` awaits the whole server response
 * before it touches the UI (next/dist/client/components/segment-cache/
 * navigation.js) — and the route's `loading.tsx` is *inside* that response. So
 * every skeleton in this app arrived bundled with the content it was written
 * to stand in for, and the visitor got a dead page plus the browser's own
 * spinner instead. The skeletons were invisible on exactly the navigations
 * they existed for.
 *
 * The fix is to stop waiting for the server to say what to draw. A
 * capture-phase click listener knows the destination before the router even
 * starts, and route-skeletons maps that URL to the very same `loading.tsx`
 * component the response would have carried (see NavigationSkeleton).
 *
 * Prefetching (see PrefetchTabs) is still the better outcome where it works: a
 * warm route commits before the timer above fires and no skeleton is shown at
 * all. This is the floor, not the ceiling.
 *
 * Anchors only. The `router.push()` calls elsewhere are all auth redirects off
 * the back of a button that already shows its own busy state.
 */
export default function NavigationPendingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);
  const timer = useRef<number | null>(null);

  // The router's committed pathname, readable from the click handler. Taken
  // from usePathname rather than location.pathname so the comparison below is
  // against the same string React will hand us on the next render, whatever
  // either side does about encoding. Synced after commit rather than during
  // render — a click can only arrive once the page it belongs to is painted.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Resolved during render, not in an effect: the render where the router
  // commits is the render where the real page is ready, and dropping the
  // skeleton an effect later would leave one committed frame of skeleton
  // covering the page that had already arrived.
  //
  // Keyed on where we came FROM, so any landing clears it — including a
  // redirect that ends up somewhere other than the href that was clicked.
  let current = pending;
  if (current !== null && pathname !== current.from) {
    setPending(null);
    current = null;
  }

  useEffect(() => {
    const cancel = () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };

    const onClick = (event: MouseEvent) => {
      // Anything the browser wouldn't turn into an in-page navigation: a
      // middle or right click, a modifier-click opening a new tab, or an event
      // some other handler has already claimed.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a") : null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

      // Covers hrefless anchors, mailto:, and everything off-site in one
      // check — none of them carry this origin.
      if (anchor.origin !== window.location.origin) return;

      // Same page: an in-page hash link, or a query-string change the page
      // handles for itself (the tag filters). Nothing is being replaced, so
      // covering it with a skeleton would be a lie.
      const to = anchor.pathname;
      if (to === window.location.pathname) return;

      // A link inside rendered Markdown is a plain <a> — the pipeline emits
      // HTML, not next/link — so the browser does a FULL page load and the
      // router never runs. Nothing would ever clear the pending state: the
      // pathname this is keyed on cannot change in a document that is being
      // replaced. What that left behind was a real bug, not just a wasted
      // skeleton. The outgoing article was covered by the destination's
      // skeleton and scrolled to the top; if that document then went into the
      // back/forward cache, Back restored it still showing the skeleton, and
      // stayed that way until the give-up timer above fired seconds later —
      // with the scroll restore having measured its height and given up long
      // before. Leaving these alone also keeps the browser's own scroll
      // offset for the entry honest, which is what makes Back land right
      // without any of this having to intervene.
      if (anchor.closest(".prose")) return;

      if (skeletonForPath(to) === null) return;

      // Before the timer, not after it: the skeleton Next.js paints for itself
      // can beat our 90ms on a warm route, and it reads this too.
      const dir: SkeletonDir = anchor.dataset.skeletonDir === "rtl" ? "rtl" : "ltr";
      dirByPath.set(to, dir);
      applySkeletonDir(dir);

      cancel();
      const from = pathnameRef.current;
      timer.current = window.setTimeout(() => setPending({ from, to }), SHOW_AFTER_MS);
    };

    // Back and Forward reach a page without a click to read the direction from,
    // so replay whatever the link that first opened it said. An unvisited entry
    // falls back to LTR, exactly as it would on a cold load.
    const onPopState = () => {
      applySkeletonDir(dirByPath.get(window.location.pathname) ?? "ltr");
    };

    // Coming BACK to this document out of the back/forward cache. It was
    // frozen mid-navigation, so whatever it was in the middle of showing is
    // still on screen — and the page it was heading for is not where the
    // reader now is. Drop it immediately: the article they pressed Back for is
    // ready underneath, and ScrollMemory needs its real height in this frame to
    // restore their position into.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      cancel();
      setPending(null);
      resumeTracking();
    };

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPageShow);
      cancel();
    };
  }, []);

  useEffect(() => {
    if (pending === null) return;

    // A skeleton picked up mid-scroll would show its own middle, which reads
    // as the old page having jumped rather than a new one having opened. The
    // router still reports the outgoing pathname here, so this has to be hidden
    // from ScrollMemory: recorded, it would overwrite the position the reader
    // left that page at with 0, and Back would land them at the top of it.
    suppressTracking();
    window.scrollTo(0, 0);

    const bail = window.setTimeout(() => {
      setPending(null);
      // Nothing is going to land, so nothing will lift the suppression above.
      resumeTracking();
    }, GIVE_UP_AFTER_MS);
    return () => clearTimeout(bail);
  }, [pending]);

  return (
    <PendingContext.Provider value={current === null ? null : current.to}>
      {children}
    </PendingContext.Provider>
  );
}
