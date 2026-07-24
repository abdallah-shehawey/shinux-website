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
//  - Runtime races the network against the cache: the network still wins on
//    any healthy connection (so content is live), but once the cache holds a
//    copy nothing waits longer than NETWORK_TIMEOUT_MS for it. The slow
//    request is left running to refresh the cache for next time. A navigation
//    to a page that was never cached falls back to /offline.
//  - The cache name is versioned; activate() deletes every older cache.
//  - Messages: SKIP_WAITING activates a freshly installed worker on demand;
//    CHECK_CONTENT re-reads the sitemap, precaches any newly published pages,
//    and tells open tabs how many new pages appeared so the app can show a
//    "new content" banner.
//
// Bump VERSION whenever this file or the shell/offline page changes so clients
// pick up a clean cache. (New *content* does not need a bump — CHECK_CONTENT
// and the activate-time sync handle that live.)
const VERSION = "v17";
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

// How long a request may wait on the network before we fall back to the cached
// copy. The whole sitemap is precached, so on a bad connection there is almost
// always a good page sitting one lookup away — waiting out a 10-second response
// to render the very same thing is the worst of both worlds. The network
// request is NOT cancelled when this fires; it keeps running and refreshes the
// cache for next time.
//
// A cached HTML document (or image) is COMPLETE and self-contained, so serving
// it early is only ever a freshness trade — measured off the live site, first
// byte from the CDN ran 2–12s on a weak link while the identical page sat in
// the cache, so this is short.
const NETWORK_TIMEOUT_MS = 600;

// RSC flights get a longer leash on purpose. The stored flight is the whole
// route (cacheRsc fetches it with no Next-Router-State-Tree), while a live soft
// navigation asks for a delta against the tree it is coming from, so handing
// the stored copy back is a heavier substitution than swapping one HTML
// document for another. Prefer the real answer, and only fall back when the
// network is genuinely not delivering.
const RSC_NETWORK_TIMEOUT_MS = 2500;

// Routes whose HTML is specific to the signed-in user or to moderation state.
// These are never written to the cache and never served from it: a stale (or
// worse, a previous session's) copy of these is not an acceptable fallback.
const PRIVATE_ROUTE = /^\/(me|admin|auth|login|welcome)(\/|$)/;

// Fetching ~170 pages while the visitor is still waiting for their FIRST page
// is self-defeating on a weak link — the fill saturates the connection and the
// page they actually asked for crawls in behind it. Hold off briefly so the
// first paint gets the pipe to itself, and pull the concurrency right down when
// the browser tells us the connection is poor.
const PRECACHE_START_DELAY_MS = 3000;

function connectionIsSlow() {
  const c = self.navigator && self.navigator.connection;
  if (!c) return false;
  return c.saveData === true || /(^|-)(2g|slow-2g)$/.test(c.effectiveType || "");
}

function precacheConcurrency() {
  return connectionIsSlow() ? 2 : 6;
}

// Distinguishes "the timeout won the race" from "the request failed" — a
// rejected fetch resolves to null, so null alone cannot tell the two apart.
const TIMED_OUT = Symbol("timed-out");

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
async function precachePaths(cache, paths, { concurrency, withRsc = false, onCached } = {}) {
  concurrency = concurrency || precacheConcurrency();
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

// Find a usable cached copy of a page request. RSC flights carry a per-
// navigation `?_rsc=` buster, so an exact match almost never hits for them —
// fall back to the query-independent key, then to encoded/decoded spellings of
// the pathname (non-ASCII slugs get written both ways).
async function findCachedPage(cache, request, url, isRsc) {
  const exact = await cache.match(request);
  if (exact) return exact;

  if (isRsc) {
    const rsc =
      (await cache.match(rscKey(url.pathname))) ||
      (await cache.match(rscKey(decodeURIComponent(url.pathname))));
    if (rsc) return rsc;
  }

  const cached =
    (await cache.match(url.pathname)) ||
    (await cache.match(decodeURIComponent(url.pathname))) ||
    (await cache.match(encodeURI(url.pathname)));
  if (!cached) return null;

  // Handing HTML back for an RSC request crashes the Next router. A 503 makes
  // it give up on the soft navigation and do a hard one, which comes back
  // through here as a normal navigation and gets this very HTML.
  if (isRsc && (cached.headers.get("content-type") || "").includes("text/html")) {
    return new Response("RSC payload unavailable offline", {
      status: 503,
      statusText: "Offline RSC Fallback",
    });
  }
  return cached;
}

// The one strategy every managed request uses: whichever of network-or-timeout
// comes first, with the cache as the safety net. On a healthy connection the
// network always wins and the visitor sees live content. On a weak one they
// get the cached copy within the budget below instead of waiting out the
// request, and the response that eventually lands still refreshes the cache.
//
// Assets go through this too, not just pages. A single image on an unbounded
// network-first fetch held a fully-rendered page's `load` event for fifteen
// seconds with an identical copy sitting in the cache — the page was readable
// but never finished, which is its own kind of "stuck".
async function respondRacingCache(event, request, url, { isRsc = false, isNavigation = false } = {}) {
  const cache = await caches.open(CACHE);

  const network = fetch(request)
    .then((response) => {
      // RSC replies are deliberately NOT cached here. Next 16's segment cache
      // makes every one of them partial: a live navigation's payload is scoped
      // to the `Next-Router-State-Tree` it was requested from, and a segment
      // prefetch asks for one slice (`/_tree`, `/_head`, `/x/__PAGE__`).
      // Filing any of those under the bare pathname would hand a later, unrelated
      // navigation a fragment of a page it never asked for. The flights this
      // worker serves come from cacheRsc(), which fetches with `RSC: 1` and no
      // state tree and therefore gets the whole thing.
      if (response && response.ok && response.type === "basic" && !isRsc) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  const cached = await findCachedPage(cache, request, url, isRsc);

  if (cached) {
    // `null` here means "the timer won", not "the network failed" — a rejected
    // fetch resolves to null too, so tell them apart with a sentinel.
    const budget = isRsc ? RSC_NETWORK_TIMEOUT_MS : NETWORK_TIMEOUT_MS;
    const timeout = new Promise((resolve) => setTimeout(() => resolve(TIMED_OUT), budget));
    const winner = await Promise.race([network, timeout]);
    if (winner && winner !== TIMED_OUT) return winner;
    // Serve the cached copy now; let the slow request finish and update the
    // cache so the next visit is current.
    event.waitUntil(network);
    return cached;
  }

  const response = await network;
  if (response) return response;

  if (isNavigation) {
    const offline = await cache.match("/offline");
    if (offline) return offline;
  }
  return new Response("You are offline and this is not cached.", {
    status: 503,
    statusText: "Offline",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
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
      //
      // The pause matters on a weak connection: this fires on the visitor's
      // very first page load, and ~170 pages of fill competing with the page
      // they are actually waiting for is why that first load dragged.
      await new Promise((r) => setTimeout(r, PRECACHE_START_DELAY_MS));
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

  // Personalised routes: straight to the network, never cached, never served
  // stale. If the network is down these simply fail, which is correct — there
  // is no such thing as an offline copy of "your" page.
  if (PRIVATE_ROUTE.test(url.pathname)) return;

  // Link prefetches are speculative, and under Next 16's segment cache they
  // are partial by design — one slice of a route (`/_tree`, `/_head`,
  // `/x/__PAGE__`) rather than the page. Serving a stored slice to a later
  // navigation leaves the router holding a fragment it cannot finish
  // rendering: a click that hangs. Reading from the cache is no use to them
  // either — a prefetch that fails costs nothing, and the navigation it was
  // warming still gets the full treatment below.
  if (request.headers.get("Next-Router-Prefetch") === "1") return;

  // Pages, RSC flights, images, icons, the manifest, the sitemap: all race the
  // network against the cache instead of waiting the network out. This used to
  // await `fetch` with no timeout and only consult the cache once the request
  // REJECTED — so a connection that was slow rather than dead never used the
  // precached site at all, and every request cost a full round trip no matter
  // how bad the link was.
  event.respondWith(respondRacingCache(event, request, url, { isRsc, isNavigation }));
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
