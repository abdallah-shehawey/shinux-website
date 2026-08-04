"use client";

import { useEffect, useRef, useState } from "react";
import { warmMermaidCache } from "@/lib/warm-mermaid";

// Registers the service worker (production only — `next dev` is skipped to avoid
// caching surprises) and drives the one banner that is left:
//
//   New app version — when a freshly installed worker is waiting, we ask before
//   activating it. Clicking "Update now" posts SKIP_WAITING to the waiting
//   worker; once it takes control (controllerchange) we reload once.
//
// There used to be a "new content" banner and an offline-download progress pill
// as well. Both existed to narrate a background job that walked the whole
// sitemap and precached every page — that job is gone (see public/sw.js), so
// there is nothing to announce: pages are cached as they are read, which needs
// no ceremony.
const UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const AUTO_DISMISS_BANNER_MS = 10 * 1000; // 10 seconds (auto hide if ignored)

export default function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  // True only after the user clicks "Update now", so controllerchange reloads on
  // demand and never on the first-ever install (which also fires it).
  const userTriggeredUpdate = useRef(false);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let updateTimer: ReturnType<typeof setInterval> | undefined;

    const promoteIfWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting);
      }
    };

    // Once the SW is in control and we're online, pull Mermaid's lazily-loaded
    // diagram chunks into the cache (idle-deferred so it never competes with
    // the page). Those chunks aren't referenced by any page HTML, so nothing
    // else would ever cache them — without this, diagrams render online but
    // fall back to a raw code block offline. They are hashed build assets, so
    // this costs a handful of CDN requests once per version. See
    // lib/warm-mermaid.ts.
    const warmMermaid = () => {
      if (!navigator.onLine || !navigator.serviceWorker.controller) return;
      const run = () => warmMermaidCache();
      if ("requestIdleCallback" in window) {
        (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
          .requestIdleCallback(run, { timeout: 5000 });
      } else {
        setTimeout(run, 3000);
      }
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // A worker may already be waiting from a previous visit.
        promoteIfWaiting(reg);

        // If a controller is already active (returning visitor), warm now.
        warmMermaid();

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // "installed" while a controller exists ⇒ an update is ready.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(reg.waiting ?? installing);
            }
          });
        });

        // Poll for a new *version* every 30 minutes.
        updateTimer = setInterval(() => reg.update().catch(() => {}), UPDATE_INTERVAL_MS);
      })
      .catch(() => {
        /* registration failures are non-fatal */
      });

    const onControllerChange = () => {
      if (userTriggeredUpdate.current) {
        userTriggeredUpdate.current = false;
        window.location.reload();
        return;
      }
      // First-ever install just took control of this page — warm Mermaid now
      // that our SW can cache the chunks it fetches.
      warmMermaid();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      if (updateTimer) clearInterval(updateTimer);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  // Automatically dismiss the "New version available" banner after 10 seconds if ignored
  useEffect(() => {
    if (!waitingWorker) return;
    const timer = setTimeout(() => {
      setWaitingWorker(null);
    }, AUTO_DISMISS_BANNER_MS);
    return () => clearTimeout(timer);
  }, [waitingWorker]);

  const applyUpdate = () => {
    if (!waitingWorker) return;
    userTriggeredUpdate.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    setWaitingWorker(null);
  };

  if (!waitingWorker) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-fg/10 bg-bg/95 px-4 py-3 shadow-lg backdrop-blur">
        <span className="text-sm text-fg">A new version is available 🎉</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={applyUpdate}
            className="rounded-lg bg-fg px-3 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Update now
          </button>
          <button
            onClick={() => setWaitingWorker(null)}
            className="rounded-lg p-1.5 text-fg/60 hover:bg-fg/10 hover:text-fg transition-colors"
            title="Dismiss"
            aria-label="Dismiss notification"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
