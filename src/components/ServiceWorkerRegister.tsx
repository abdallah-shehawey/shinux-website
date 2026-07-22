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
const UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export default function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [newContentCount, setNewContentCount] = useState(0);
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
      if (event.data && event.data.type === "NEW_CONTENT") {
        setNewContentCount((c) => c + (event.data.count || 0));
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

  if (!waitingWorker && newContentCount === 0) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {waitingWorker && (
        <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-fg/10 bg-bg/95 px-4 py-3 shadow-lg backdrop-blur">
          <span className="text-sm text-fg">فيه تحديث جديد 🎉</span>
          <button
            onClick={applyUpdate}
            className="shrink-0 rounded-lg bg-fg px-3 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            تحديث الآن
          </button>
        </div>
      )}

      {newContentCount > 0 && (
        <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-fg/10 bg-bg/95 px-4 py-3 shadow-lg backdrop-blur">
          <span className="text-sm text-fg">
            فيه محتوى جديد اتضاف 🎉 حدّث الصفحة عشان تجيبه ويتحفظ عندك
          </span>
          <button
            onClick={refreshContent}
            className="shrink-0 rounded-lg bg-fg px-3 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            تحديث
          </button>
        </div>
      )}
    </div>
  );
}
