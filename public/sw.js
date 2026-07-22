// Service worker for the PWA.
//
// Strategy overview:
//  - install() stays FAST: it precaches only the core pages ("/" and
//    "/offline") and then takes control. The full sitemap precache is NOT done
//    here — doing 170+ fetches during install delays the worker from
//    controlling the page, and a user who goes offline right after install
//    would get the browser's native error page instead of /offline.
//  - activate() takes control immediately (clients.claim) and THEN, in the
//    background (the worker is kept alive by waitUntil, but control is already
//    granted), precaches every page URL from /sitemap.xml so the whole site is
//    available offline even for pages never opened. Images/media are left to
//    runtime caching only, to keep the on-device footprint light.
//  - Runtime is network-first: try the network, cache a fresh copy on success,
//    fall back to the cached copy when offline. A navigation to a page that was
//    never cached falls back to /offline.
//  - The cache name is versioned; activate() deletes every older cache.
//  - Messages: SKIP_WAITING activates a freshly installed worker on demand;
//    CHECK_CONTENT re-reads the sitemap, precaches any newly published pages,
//    and tells open tabs how many new pages appeared so the app can show a
//    "new content" banner.
//
// Bump VERSION whenever this file or the shell/offline page changes so clients
// pick up a clean cache. (New *content* does not need a bump — CHECK_CONTENT
// and the activate-time sync handle that live.)
const VERSION = "v6";
const CACHE = `linux-blog-${VERSION}`;

// Pages and essential shell assets we always want available offline.
const CORE_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
];

// A synthetic cache key that stores the list of page paths we have precached,
// so content syncs can diff a fresh sitemap against it without scanning every
// asset in the cache.
const MANIFEST_URL = "/__sw_precache_manifest";

// ---- helpers --------------------------------------------------------------

// Pull the <loc> URLs out of the sitemap and reduce them to same-origin paths
// (the sitemap emits absolute canonical URLs; we cache them by path so it works
// no matter which host the SW is served from).
async function fetchSitemapPaths() {
  const res = await fetch("/sitemap.xml", { cache: "no-cache" });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);
  const xml = await res.text();
  const paths = new Set();
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) {
    try {
      const u = new URL(m[1], self.location.origin);
      const rawPath = u.pathname + u.search;
      paths.add(rawPath);
      paths.add(decodeURIComponent(rawPath));
    } catch {
      /* skip malformed <loc> */
    }
  }
  return [...paths];
}

async function postToClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) client.postMessage(message);
}

// Fetch and cache a batch of paths with bounded concurrency so install/refresh
// does not fire hundreds of requests at once. Failures are ignored per-URL so
// one bad page never aborts the whole precache. onEach(done, total) reports
// progress so the app can show a "saving for offline" indicator.
async function precachePaths(cache, paths, { concurrency = 6, onEach } = {}) {
  const queue = paths.slice();
  const total = paths.length;
  let done = 0;
  const worker = async () => {
    while (queue.length) {
      const path = queue.shift();
      try {
        const res = await fetch(path, { cache: "no-cache" });
        if (res && res.ok) await cache.put(path, res.clone());
      } catch {
        /* offline / 404 — skip this one */
      }
      done += 1;
      if (onEach) await onEach(done, total);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function readManifest(cache) {
  try {
    const res = await cache.match(MANIFEST_URL);
    if (!res) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function writeManifest(cache, paths) {
  const body = JSON.stringify(paths);
  await cache.put(
    MANIFEST_URL,
    new Response(body, { headers: { "Content-Type": "application/json" } }),
  );
}

// Read the sitemap, precache any pages not already in the manifest, and update
// the manifest. When notify is true and new pages appeared, tell open tabs so
// the app can show a "new content" banner. On the first run (manifest = core
// only) notify is false, so filling the whole site does NOT spam the banner.
async function syncContent(cache, { notify, reportProgress }) {
  let sitemapPaths;
  try {
    sitemapPaths = await fetchSitemapPaths();
  } catch {
    return; // offline / sitemap down — nothing to do
  }
  const all = [...new Set([...CORE_URLS, ...sitemapPaths])];
  const known = new Set(await readManifest(cache));
  const newPaths = all.filter((p) => !known.has(p));
  if (newPaths.length === 0) return;

  // Report progress only for a batch big enough to be worth a UI indicator
  // (the first-run full precache), not a one-off new article.
  const showProgress = reportProgress && newPaths.length >= 4;
  const onEach = showProgress
    ? async (doneCount, total) => {
        // Throttle: every few pages and on the final one.
        if (doneCount % 3 === 0 || doneCount === total) {
          await postToClients({ type: "PRECACHE_PROGRESS", done: doneCount, total });
        }
      }
    : undefined;

  if (showProgress) {
    await postToClients({ type: "PRECACHE_PROGRESS", done: 0, total: newPaths.length });
  }
  await precachePaths(cache, newPaths, { onEach });
  await writeManifest(cache, all);
  if (showProgress) await postToClients({ type: "PRECACHE_DONE", total: newPaths.length });

  if (notify) {
    await postToClients({ type: "NEW_CONTENT", count: newPaths.length });
  }
}

// ---- lifecycle ------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Fast path only: core pages + a baseline manifest, so the worker can
      // activate and control navigations almost immediately.
      await precachePaths(cache, CORE_URLS);
      await writeManifest(cache, CORE_URLS);
      // On the very FIRST install (no existing controller) take over right
      // away. For an update we do NOT skip waiting — the page shows an update
      // banner and only skips waiting when the user clicks "Update now".
      if (!self.registration.active) {
        await self.skipWaiting();
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      const cache = await caches.open(CACHE);
      // Take control of open pages NOW so /offline works on the very next
      // navigation, even if the user goes offline immediately.
      await self.clients.claim();
      // Only then precache the whole sitemap in the background. Control is
      // already granted above; this keeps the worker alive until it finishes
      // without ever blocking navigation. notify:false ⇒ no first-run banner,
      // but reportProgress ⇒ the app shows a "saving for offline" indicator.
      await syncContent(cache, { notify: false, reportProgress: true });
    })(),
  );
});

// ---- fetch ----------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only manage same-origin GETs; let the browser handle cross-origin
  // (analytics, Supabase, fonts) untouched.
  if (url.origin !== self.location.origin) return;

  // API responses are dynamic and user-specific: pass through, never cache.
  if (url.pathname.startsWith("/api/")) return;

  const isNavigation =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  const isRsc =
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    (request.headers.get("accept") || "").includes("text/x-component");

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        // Cache successful same-origin GETs (pages and static assets alike) so
        // they are there when the network drops.
        if (response && response.ok && response.type === "basic") {
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        // 1. Try exact match (matches exact URL including query strings or RSC cache if available)
        let cached = await cache.match(request);
        if (cached) return cached;

        // 2. Try pathname variations (decoded and encoded)
        const decPath = decodeURIComponent(url.pathname);
        const encPath = encodeURI(url.pathname);
        cached =
          (await cache.match(url.pathname)) ||
          (await cache.match(decPath)) ||
          (await cache.match(encPath));

        if (cached) {
          // If Next.js made an RSC request for a soft navigation while offline and we only
          // have the full HTML cached, returning HTML for RSC would crash Next.js client router.
          // Returning a 503 error forces Next.js to perform a hard browser navigation to url.pathname,
          // which then triggers a normal navigate fetch that successfully gets this cached HTML!
          const isHtmlResponse = cached.headers.get("content-type")?.includes("text/html");
          if (isRsc && isHtmlResponse) {
            return new Response("RSC payload unavailable offline", {
              status: 503,
              statusText: "Offline RSC Fallback",
            });
          }
          return cached;
        }

        if (isNavigation) {
          const offline = await cache.match("/offline");
          if (offline) return offline;
        }

        return new Response("You are offline and this page is not cached.", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })(),
  );
});

// ---- messages -------------------------------------------------------------

self.addEventListener("message", (event) => {
  const data = event.data;
  const type = typeof data === "string" ? data : data && data.type;

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (type === "CHECK_CONTENT") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        await syncContent(cache, { notify: true, reportProgress: true });
      })(),
    );
  }
});
