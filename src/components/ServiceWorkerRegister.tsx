"use client";

import { useEffect, useRef, useState } from "react";

// Registers the service worker (production only — `next dev` is skipped to avoid
// caching surprises) and drives two in-app banners:
//
//  1. New app version — when a freshly installed worker is waiting, we ask the
//     user before activating it. Clicking "تحديث الآن" posts SKIP_WAITING to the
//     waiting worker; once it takes control (controllerchange) we reload once.
//  2. New content — every 30 minutes we ask the active worker to re-read the
//     sitemap (CHECK_CONTENT). If it precached newly published pages it replies
//     with NEW_CONTENT, and we show a banner; reloading pulls the fresh content
//     (network-first) which also refreshes the cache.
//  3. Offline-download progress — right after install the worker precaches the
//     whole site and streams PRECACHE_PROGRESS / PRECACHE_DONE; we show a small
//     progress indicator so the user can see the site being saved for offline.
const UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

type Precache = { done: number; total: number; complete: boolean };

export default function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [newContentCount, setNewContentCount] = useState(0);
  const [precache, setPrecache] = useState<Precache | null>(null);
  const precacheHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // True only after the user clicks "تحديث الآن", so controllerchange reloads on
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
    let contentTimer: ReturnType<typeof setInterval> | undefined;
    let contentTimeout: ReturnType<typeof setTimeout> | undefined;

    const promoteIfWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting);
      }
    };

    const checkContent = () => {
      navigator.serviceWorker.controller?.postMessage({ type: "CHECK_CONTENT" });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // A worker may already be waiting from a previous visit.
        promoteIfWaiting(reg);

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

        // Ask for new *content* shortly after load, then every 30 minutes.
        contentTimeout = setTimeout(checkContent, 5000);
        contentTimer = setInterval(checkContent, UPDATE_INTERVAL_MS);
      })
      .catch(() => {
        /* registration failures are non-fatal */
      });

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "NEW_CONTENT") {
        setNewContentCount((c) => c + (data.count || 0));
      } else if (data.type === "PRECACHE_PROGRESS") {
        clearTimeout(precacheHideTimer.current);
        setPrecache({ done: data.done, total: data.total, complete: false });
      } else if (data.type === "PRECACHE_DONE") {
        setPrecache({ done: data.total, total: data.total, complete: true });
        // Keep the "saved for offline ✓" state visible briefly, then hide.
        clearTimeout(precacheHideTimer.current);
        precacheHideTimer.current = setTimeout(() => setPrecache(null), 3000);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    const onControllerChange = () => {
      if (userTriggeredUpdate.current) {
        userTriggeredUpdate.current = false;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      if (updateTimer) clearInterval(updateTimer);
      if (contentTimer) clearInterval(contentTimer);
      if (contentTimeout) clearTimeout(contentTimeout);
      clearTimeout(precacheHideTimer.current);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    if (!waitingWorker) return;
    userTriggeredUpdate.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    setWaitingWorker(null);
  };

  const refreshContent = () => {
    setNewContentCount(0);
    window.location.reload();
  };

  if (!waitingWorker && newContentCount === 0 && !precache) return null;

  const pct = precache && precache.total ? Math.round((precache.done / precache.total) * 100) : 0;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {precache && (
        <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-emerald-400/25 bg-bg/70 px-4 py-3 shadow-[0_10px_40px_-8px_rgba(63,185,80,0.35)] backdrop-blur-xl">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center">
            {precache.complete ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
            ) : (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400/25 border-t-emerald-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-fg">
                {precache.complete ? "Available offline" : "Saving for offline…"}
              </span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg/55">{pct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-fg/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_12px_rgba(63,185,80,0.75)] transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {waitingWorker && (
        <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-fg/10 bg-bg/95 px-4 py-3 shadow-lg backdrop-blur">
          <span className="text-sm text-fg">A new version is available 🎉</span>
          <button
            onClick={applyUpdate}
            className="shrink-0 rounded-lg bg-fg px-3 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Update now
          </button>
        </div>
      )}

      {newContentCount > 0 && (
        <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-fg/10 bg-bg/95 px-4 py-3 shadow-lg backdrop-blur">
          <span className="text-sm text-fg">
            New content was added 🎉 Refresh to load it — it&apos;ll be saved for offline too.
          </span>
          <button
            onClick={refreshContent}
            className="shrink-0 rounded-lg bg-fg px-3 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
