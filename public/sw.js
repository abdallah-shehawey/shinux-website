// Service worker for the PWA.
//
// Strategy overview:
//  - On install we pull every page URL out of /sitemap.xml and precache it, so
//    the whole site (articles, tutorials, questions, public profiles) is
//    available offline even for pages the user never opened. HTML pages are
//    small; images and other media are intentionally NOT precached — they are
//    cached opportunistically at runtime only when actually requested, so the
//    on-device footprint stays light on both laptop and phone.
//  - At runtime we use network-first: try the network, cache a fresh copy on
//    success, fall back to the cached copy when offline. A navigation to a page
//    that was never cached falls back to /offline.
//  - The cache name is versioned; activate() deletes every cache from an older
//    version.
//  - Messages: SKIP_WAITING activates a freshly installed worker on demand;
//    CHECK_CONTENT re-reads the sitemap, precaches any newly published pages in
//    the background, and tells open tabs how many new pages appeared so the app
//    can show a "new content" banner.
//
// Bump VERSION whenever this file or the shell/offline page changes so clients
// pick up a clean cache. (New *content* does not need a bump — CHECK_CONTENT
// handles that live.)
const VERSION = "v2";
const CACHE = `linux-blog-${VERSION}`;

// Pages we always want available offline regardless of the sitemap.
const CORE_URLS = ["/", "/offline"];

// A synthetic cache key that stores the list of page paths we have precached,
// so CHECK_CONTENT can diff a fresh sitemap against it without scanning every
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
      paths.add(u.pathname + u.search);
    } catch {
      /* skip malformed <loc> */
    }
  }
  return [...paths];
}

// Fetch and cache a batch of paths with bounded concurrency so install/refresh
// does not fire hundreds of requests at once. Failures are ignored per-URL so
// one bad page never aborts the whole precache.
async function precachePaths(cache, paths, concurrency = 6) {
  const queue = paths.slice();
  const worker = async () => {
    while (queue.length) {
      const path = queue.shift();
      try {
        const res = await fetch(path, { cache: "no-cache" });
        if (res && res.ok) await cache.put(path, res.clone());
      } catch {
        /* offline / 404 — skip this one */
      }
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

// Build the full precache set from the sitemap (plus the core pages), cache it
// all, and persist the manifest. On sitemap failure we still guarantee the core
// pages so the app is at least usable offline from the home page.
async function precacheEverything(cache) {
  let paths;
  try {
    const sitemapPaths = await fetchSitemapPaths();
    paths = [...new Set([...CORE_URLS, ...sitemapPaths])];
  } catch {
    paths = [...CORE_URLS];
  }
  await precachePaths(cache, paths);
  await writeManifest(cache, paths);
  return paths;
}

// ---- lifecycle ------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await precacheEverything(cache);
      // Do NOT skipWaiting automatically — the page shows an update banner and
      // only skips waiting when the user clicks "Update now".
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// ---- fetch ----------------------------------------------------------------

function isSameOrigin(url) {
  return url.startsWith(self.location.origin);
}

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
        // Offline: serve whatever we have; ignore the query string for pages so
        // a cached "/articles/foo" still answers "/articles/foo?_rsc=…".
        const cached =
          (await cache.match(request)) ||
          (await cache.match(url.pathname)) ||
          (await caches.match(request));
        if (cached) return cached;
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
        let sitemapPaths;
        try {
          sitemapPaths = await fetchSitemapPaths();
        } catch {
          return; // still offline / sitemap down — nothing to do
        }
        const known = new Set(await readManifest(cache));
        const newPaths = sitemapPaths.filter((p) => !known.has(p));
        if (newPaths.length === 0) return;

        // Precache the new pages in the background, then update the manifest.
        await precachePaths(cache, newPaths);
        await writeManifest(cache, [...new Set([...known, ...sitemapPaths])]);

        // Tell every open tab so it can surface the "new content" banner.
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: "NEW_CONTENT", count: newPaths.length });
        }
      })(),
    );
  }
});
