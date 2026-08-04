"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The control that owns the site's offline copy.
//
// Downloading the whole site used to happen by itself, on every visitor's first
// load. It walks the sitemap and fetches each page twice (document + RSC
// flight), so a single reader who only wanted one article triggered hundreds of
// server-side requests — and every service-worker VERSION bump made every
// returning reader do it again. It is opt-in now: this button posts
// START_OFFLINE_DOWNLOAD and the worker does the fill only for whoever asked.
// Ordinary browsing still caches the pages you actually open, so the site keeps
// working on a flaky connection either way.

type Status =
  | { kind: "unknown" }
  | { kind: "idle" }
  | { kind: "downloading"; done: number; total: number }
  | { kind: "done"; pages: number };

export default function OfflineDownload() {
  const [status, setStatus] = useState<Status>({ kind: "unknown" });
  // Set the moment the button is pressed, so the UI switches to "preparing"
  // before the worker has read the sitemap and can report a real total.
  const starting = useRef(false);

  const post = useCallback((message: Record<string, unknown>) => {
    navigator.serviceWorker?.controller?.postMessage(message);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const ask = () => post({ type: "OFFLINE_STATUS" });

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "OFFLINE_STATUS") {
        if (data.starting) starting.current = true;
        if (data.cleared) starting.current = false;
        if (!data.optIn) {
          starting.current = false;
          setStatus({ kind: "idle" });
        } else if (data.complete) {
          starting.current = false;
          setStatus({ kind: "done", pages: data.pages ?? 0 });
        } else {
          setStatus({ kind: "downloading", done: data.pages ?? 0, total: 0 });
        }
        return;
      }

      // The worker reports fill progress against the whole sitemap; PRECACHE_MORE
      // is one bounded chunk finishing, not the end of the download.
      if (data.type === "PRECACHE_PROGRESS" || data.type === "PRECACHE_MORE") {
        starting.current = false;
        setStatus({ kind: "downloading", done: data.done ?? 0, total: data.total ?? 0 });
        return;
      }

      if (data.type === "PRECACHE_DONE") {
        starting.current = false;
        setStatus({ kind: "done", pages: data.total ?? 0 });
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    // A worker that has not claimed this page yet cannot be messaged; ask again
    // as soon as it does.
    navigator.serviceWorker.addEventListener("controllerchange", ask);
    navigator.serviceWorker.ready.then(ask).catch(() => {});
    ask();

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      navigator.serviceWorker.removeEventListener("controllerchange", ask);
    };
  }, [post]);

  const download = () => {
    starting.current = true;
    setStatus({ kind: "downloading", done: 0, total: 0 });
    post({ type: "START_OFFLINE_DOWNLOAD" });
  };

  const clear = () => {
    starting.current = false;
    setStatus({ kind: "idle" });
    post({ type: "CLEAR_OFFLINE_DOWNLOAD" });
  };

  // No service worker (or it has not taken control yet) ⇒ nothing to offer.
  if (status.kind === "unknown") return null;

  const pct =
    status.kind === "downloading" && status.total
      ? Math.min(100, Math.round((status.done / status.total) * 100))
      : 0;

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">Read offline</p>
        <p className="mt-0.5 text-xs text-muted">
          {status.kind === "done"
            ? `The whole site is saved on this device — ${status.pages} pages.`
            : status.kind === "downloading"
              ? status.total
                ? `Saving ${status.done} of ${status.total} pages…`
                : "Preparing the download…"
              : "Save every article, tutorial and question to this device."}
        </p>

        {status.kind === "downloading" && (
          <div
            className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-fg/10"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Saving the site for offline reading"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${status.total ? pct : 8}%` }}
            />
          </div>
        )}
      </div>

      <div className="shrink-0">
        {status.kind === "done" ? (
          <button
            onClick={clear}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-fg transition-colors hover:bg-fg/5"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={download}
            disabled={status.kind === "downloading"}
            className="rounded-lg bg-fg px-3 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status.kind === "downloading" ? `Saving… ${pct}%` : "Save for offline"}
          </button>
        )}
      </div>
    </div>
  );
}
