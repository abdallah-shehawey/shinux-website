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
const VERSION = "v14";
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

// Persist precache progress every N pages. The browser can terminate a service
// worker at any moment, and the sitemap precache is far too long to assume it
// runs to completion — writing the manifest only at the end meant a killed run
// lost all its progress, so the next run started over and never finished,
// leaving an arbitrary subset of the site available offline.
const MANIFEST_FLUSH_EVERY = 8;

// How many pages one sync pass may fetch. The browser terminates a service
// worker whose event runs too long, and the whole sitemap (170+ pages, two
// requests each) never survives a single pass on a real connection — it died
// partway, so only a random slice of the site was ever available offline. Each
// pass is short and durable, and the page asks for the next one (PRECACHE_MORE)
// until the sitemap is fully cached.
const PRECACHE_CHUNK = 24;

// Give up on a single request rather than letting one hung connection block a
// precache worker (and with it the rest of the queue) indefinitely.
const FETCH_TIMEOUT_MS = 15000;

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

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// A client-side (soft) navigation fetches the route's RSC *flight* payload, not
// its HTML — and that request carries a per-navigation `?_rsc=<hash>` cache
// buster we can never precache by exact URL. So we store and look up the flight
// under the bare pathname plus a private marker, ignoring the query entirely.
function rscKey(pathname) {
  return `${pathname}?__sw_rsc=1`;
}

// Does this path point at a navigable page (so it also has an RSC flight worth
// precaching), as opposed to a static asset like /icon.svg, /favicon.ico or
// /manifest.webmanifest? A trailing dot in the last segment ⇒ a file asset.
function looksLikePage(path) {
  if (path.startsWith("/_next/")) return false;
  const last = (path.split("?")[0].split("/").pop()) || "";
  return !last.includes(".");
}

// Precache a page's RSC flight payload alongside its HTML. Without this, an
// OFFLINE soft navigation (which fetches RSC, not HTML) has nothing to serve,
// and the Next.js router shows its "This page couldn't load" error. Requesting
// the page URL with the `RSC: 1` header returns the full flight as
// text/x-component — the same payload a prefetch would fetch.
async function cacheRsc(cache, path) {
  try {
    const res = await fetchWithTimeout(path, { cache: "no-cache", headers: { RSC: "1" } });
    const ct = res.headers.get("content-type") || "";
    if (res.ok && ct.includes("text/x-component")) {
      await cache.put(rscKey(path.split("?")[0]), res.clone());
    }
  } catch {
    /* offline / error — the HTML + 503 hard-nav fallback still applies */
  }
}

// Fetch and cache a batch of paths with bounded concurrency so install/refresh
// does not fire hundreds of requests at once. Failures are ignored per-URL so
// one bad page never aborts the whole precache. onCached(path) fires for each
// path that actually landed, so the caller can persist progress as it goes.
async function precachePaths(cache, paths, { concurrency = 6, withRsc = false, onCached } = {}) {
  const queue = paths.slice();
  const worker = async () => {
    while (queue.length) {
      const path = queue.shift();
      try {
        const res = await fetchWithTimeout(path, { cache: "no-cache" });
        if (res && res.ok) {
          await cache.put(path, res.clone());
          // Also precache the RSC flight so offline soft navigations work.
          if (withRsc && looksLikePage(path)) await cacheRsc(cache, path);
          if (onCached) await onCached(path);
        }
      } catch {
        /* offline / 404 — skip this one */
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
}

// The manifest records which paths are cached AND whether the fill ever
// finished. `complete` is what tells a genuine content update apart from a
// first fill still in progress, so a half-filled cache never announces the
// whole site as "new content".
async function readManifest(cache) {
  try {
    const res = await cache.match(MANIFEST_URL);
    if (!res) return { paths: [], complete: false };
    const data = await res.json();
    if (Array.isArray(data)) return { paths: data, complete: false }; // older format
    return { paths: data.paths || [], complete: !!data.complete };
  } catch {
    return { paths: [], complete: false };
  }
}

async function writeManifest(cache, paths, complete = false) {
  const body = JSON.stringify({ paths, complete });
  await cache.put(
    MANIFEST_URL,
    new Response(body, { headers: { "Content-Type": "application/json" } }),
  );
}

// Extract the same-origin build assets (global CSS, self-hosted fonts, JS
// chunks) referenced by a rendered HTML document. next/font self-hosts the
// fonts under /_next/static/media with hashed names, so parsing the shell HTML
// is how the SW discovers the exact font/CSS URLs it must cache to render the
// site faithfully offline.
function staticAssetsFromHtml(html) {
  const urls = new Set();
  const re = /(?:href|src)="(\/_next\/static\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) urls.add(m[1]);
  return [...urls];
}

// Precache the shell's critical build assets — the global CSS plus the three
// self-hosted fonts (Inter / IBM Plex Arabic / JetBrains Mono) and the shell
// JS. Without this the first OFFLINE paint has no fonts and falls back to
// system fonts, which reads as a thin, "faded" render. Every page loads the
// same root-layout fonts and global stylesheet, so parsing "/" alone covers
// the whole site's typography.
async function precacheShellAssets(cache) {
  try {
    const res = await fetch("/", { cache: "no-cache" });
    if (!res || !res.ok) return;
    const html = await res.clone().text();
    await cache.put("/", res);
    // The home page is reachable via a soft navigation too (e.g. the logo), so
    // give it an RSC flight as well.
    await cacheRsc(cache, "/");
    await precachePaths(cache, staticAssetsFromHtml(html));
  } catch {
    /* offline — these get cached at runtime on the next online load instead */
  }
}

// Cache-first for immutable, content-hashed build assets (/_next/static/*).
// Because a new build changes the hash (and therefore the URL), a cached asset
// can never be stale — so this is both the fastest online path and a reliable
// offline one, and it is what guarantees the fonts/CSS survive offline.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok && res.type === "basic") cache.put(request, res.clone());
    return res;
  } catch {
    return new Response("", { status: 504, statusText: "Offline asset unavailable" });
  }
}

// Read the sitemap and precache ONE bounded chunk of the pages still missing,
// reporting progress against the whole site. If pages remain, PRECACHE_MORE
// asks the page to call straight back so the next chunk runs in a fresh event —
// that is what lets a 170-page fill finish without the browser killing the
// worker mid-run. NEW_CONTENT is only raised once the site was already complete.
async function syncContent(cache, { notify, reportProgress }) {
  let sitemapPaths;
  try {
    sitemapPaths = await fetchSitemapPaths();
  } catch {
    return; // offline / sitemap down — nothing to do
  }
  const all = [...new Set([...CORE_URLS, ...sitemapPaths])];
  const prev = await readManifest(cache);
  const cached = new Set(prev.paths);
  const remaining = all.filter((p) => !cached.has(p));

  if (remaining.length === 0) {
    if (!prev.complete) await writeManifest(cache, [...cached], true);
    return;
  }

  const showProgress = reportProgress && (!prev.complete || remaining.length >= 4);
  // Progress is measured against the whole sitemap, not this chunk, so the
  // indicator reads as one continuous fill instead of restarting each pass.
  const post = (type, extra) =>
    postToClients({ type, done: cached.size, total: all.length, ...extra });

  if (showProgress) await post("PRECACHE_PROGRESS");

  // Record every page as it lands and flush periodically, so a worker the
  // browser kills mid-chunk leaves durable progress to resume from. Only pages
  // that actually cached are recorded, so failures are retried on a later pass.
  let sinceFlush = 0;
  const onCached = async (path) => {
    cached.add(path);
    if (++sinceFlush >= MANIFEST_FLUSH_EVERY) {
      sinceFlush = 0;
      await writeManifest(cache, [...cached], false);
    }
    if (showProgress && cached.size % 3 === 0) await post("PRECACHE_PROGRESS");
  };

  await precachePaths(cache, remaining.slice(0, PRECACHE_CHUNK), { withRsc: true, onCached });

  const complete = all.every((p) => cached.has(p));
  await writeManifest(cache, [...cached], complete);

  if (!complete) {
    // Still pages to go: ask for another pass rather than pushing on in this
    // event, which is what used to get the worker killed.
    if (showProgress) await post("PRECACHE_MORE");
    return;
  }

  if (showProgress) await post("PRECACHE_DONE");
  if (notify && prev.complete) {
    await post("NEW_CONTENT", { count: cached.size - prev.paths.length });
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
      // Cache the shell's fonts + global CSS FIRST so an immediate offline load
      // paints with the real typography (missing fonts fall back to system
      // fonts, which reads as a "faded" render), then fill the rest of the site.
      await precacheShellAssets(cache);
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

  // Immutable, content-hashed build assets (JS/CSS/self-hosted fonts) live under
  // /_next/static: serve them cache-first. A new build changes the hash (and the
  // URL), so a cached copy can never be stale — this is the fastest online path
  // and, crucially, keeps the real fonts + styles available offline.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

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
          // RSC responses are keyed above by their exact URL, whose `_rsc`
          // cache buster changes every navigation — useless offline. Store a
          // second copy under the query-independent key so an offline soft
          // navigation to a page visited while online can still find it.
          if (isRsc && (response.headers.get("content-type") || "").includes("text/x-component")) {
            cache.put(rscKey(url.pathname), response.clone());
          }
        }
        return response;
      } catch {
        // 1. Try exact match (matches exact URL including query strings or RSC cache if available)
        let cached = await cache.match(request);
        if (cached) return cached;

        // 1b. Offline soft navigation: serve the precached RSC flight for this
        // pathname (its `_rsc` query varies every time, so match the normalized
        // key). This is what lets a never-visited page open offline without the
        // router's "This page couldn't load" error.
        if (isRsc) {
          const rsc =
            (await cache.match(rscKey(url.pathname))) ||
            (await cache.match(rscKey(decodeURIComponent(url.pathname))));
          if (rsc) return rsc;
        }

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
