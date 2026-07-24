// Warm Mermaid's lazily-loaded diagram chunks into the service-worker cache
// while the reader is still ONLINE, so diagrams keep rendering OFFLINE.
//
// Why this is needed: Mermaid v11 code-splits every diagram type (flowchart,
// sequence, class, state, …) into its own JS chunk and dynamically `import()`s
// it the first time a diagram of that type is rendered. Those chunks are
// therefore NOT referenced by any page's HTML, so the service worker's
// full-sitemap precache (which only fetches page HTML + the shell's build
// assets) never captures them. They land in the cache only as a side effect of
// rendering a matching diagram while online. A reader who saved the whole site
// for offline but never actually opened a given diagram page online would then
// see the raw ```mermaid code block instead of the diagram.
//
// The fix: proactively render one throwaway diagram of each type here, on any
// page, while online. Each render makes the browser fetch the diagram's chunk
// through the SW's cache-first `/_next/static/` handler, which caches it — so
// every Mermaid chunk is available offline afterwards, regardless of which
// pages the reader happened to open.
//
// Note: Mermaid loads a type's chunk during its text-detection step (keyed off
// the first keyword), BEFORE the full parse/layout. So a deliberately minimal
// sample still warms the chunk even if the render itself throws — every call is
// defensively wrapped, and sample correctness is not required for caching.

// One sample per diagram type used across the site's docs, plus the other common
// types so newly added docs keep working offline without touching this file.
// Only the first keyword matters for chunk loading; the bodies are kept minimal.
const SAMPLES = [
  "flowchart LR\n a --> b", // covers `flowchart` and `graph`
  "sequenceDiagram\n a ->> b: x",
  "classDiagram\n class A",
  "stateDiagram-v2\n [*] --> A",
  "erDiagram\n A ||--o{ B : has",
  "journey\n title x\n section s\n t: 5: Me",
  "gantt\n title x\n section s\n a: 2024-01-01, 1d",
  'pie\n "a": 1',
  "gitGraph\n commit",
  "mindmap\n root",
];

let warmed = false;

export async function warmMermaidCache(): Promise<void> {
  // Guard: run at most once per page session. Re-runs would be cheap anyway
  // (the SW serves the chunks cache-first without hitting the network), but
  // there is no reason to repeat the work on every soft navigation.
  if (warmed || typeof window === "undefined") return;
  warmed = true;

  // Render off-screen so nothing flashes on the page. Mermaid needs the host in
  // the DOM to measure text, so it is positioned far off-viewport, then removed.
  //
  // The host must have a REAL width: Mermaid sizes diagrams against its
  // container, and a 0-width one makes it emit negative geometry
  // (`<rect width="-37.5">`), which the browser rejects and logs as a console
  // error on every page load. Height stays auto for the same reason. Kept fully
  // off-screen to the left, so it never flashes and never adds scrollable area.
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:absolute;left:-99999px;top:0;width:1200px;overflow:hidden;visibility:hidden;pointer-events:none;";
  document.body.appendChild(host);

  try {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
    for (let i = 0; i < SAMPLES.length; i++) {
      try {
        // Unique id per render so the temporary nodes never collide.
        const id = `warm-${i}-${Math.random().toString(36).slice(2)}`;
        await mermaid.render(id, SAMPLES[i], host);
      } catch {
        // A bad sample is harmless: the diagram's chunk is already fetched (and
        // cached by the SW) during type detection, before this could throw.
      }
    }
  } catch {
    // Offline, or Mermaid failed to load — nothing to warm this time. It will
    // be retried on the next online page load.
  } finally {
    host.remove();
  }
}
