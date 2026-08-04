// Tombstone service worker.
//
// This site no longer has a service worker, offline support or any kind of
// precaching. This file is NOT a feature — it is the demolition crew, and it
// has to keep being served for a while.
//
// Deleting sw.js outright would not have worked: when a browser re-checks a
// registered worker's script and the request 404s, the update is aborted and
// the OLD worker stays installed and in control. Every visitor who had ever
// loaded the site would have kept a worker that intercepts fetches and answers
// them from a cache we no longer maintain — pinned to whatever version of the
// site they last saw, indefinitely.
//
// So the script stays at the same URL and does exactly one thing: takes
// control, deletes every cache it can find, and unregisters itself. Once it
// has run, the browser has no worker for this origin and requests go straight
// to the network like any ordinary site.
//
// Keep this file for a release cycle or two, until installs from the old
// worker have realistically all updated. After that it can be deleted.

self.addEventListener("install", () => {
  // No waiting: there is nothing for a user to accept, and nothing to lose.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      // Reload the pages this worker still controls, so they finish loading
      // from the network rather than from a cache that no longer exists.
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url).catch(() => {});
      }
    })(),
  );
});

// Deliberately no fetch handler: with none registered, the browser bypasses
// the worker entirely for every request.
