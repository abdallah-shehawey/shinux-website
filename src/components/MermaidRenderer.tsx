"use client";

import { useEffect } from "react";

// A code block is a diagram if Shiki tagged its <code> with the language, or if
// the chrome rehypeCodeChrome() draws around it says so.
function isMermaidBlock(block: HTMLElement): boolean {
  const code = block.querySelector("code");
  if (code?.classList.contains("language-mermaid")) return true;
  const label = block.querySelector(".code-lang");
  return label?.textContent?.trim().toLowerCase() === "mermaid";
}

export default function MermaidRenderer({ containerId }: { containerId: string }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const blocks = Array.from(
      container.querySelectorAll<HTMLElement>("figure.code-block, pre"),
    ).filter(isMermaidBlock);

    // The gate that makes the import below worth deferring: five of the site's
    // ~150 documents carry a diagram, and mermaid drags in cytoscape and katex
    // behind it — ~1.6 MB of JavaScript that the other ~145 pages used to
    // download to render nothing. Checking the DOM first costs a querySelector.
    if (blocks.length === 0) return;

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    void (async () => {
      const { default: mermaid } = await import("mermaid");
      // The reader navigated away while the chunk was in flight.
      if (cancelled) return;

      // Dark is the default and carries no attribute; only `light` opts out.
      const isDark = document.documentElement.getAttribute("data-theme") !== "light";
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        securityLevel: "loose",
        fontFamily: "inherit",
      });

      blocks.forEach((block, idx) => {
        if (block.dataset.mermaidProcessed === "true") return;
        block.dataset.mermaidProcessed = "true";

        const rawCode = block.querySelector("code")?.textContent ?? block.textContent ?? "";
        if (!rawCode.trim()) return;

        const diagramId = `mermaid-svg-${idx}-${Math.random().toString(36).substring(2, 8)}`;
        const wrapper = document.createElement("div");
        wrapper.className = "mermaid-diagram-container my-6 flex flex-col items-center justify-center rounded-xl border border-border bg-card/40 p-6 overflow-x-auto shadow-xs transition-colors hover:border-border/80";

        // Render mermaid diagram to SVG
        mermaid
          .render(diagramId, rawCode.trim())
          .then(({ svg }) => {
            if (cancelled) return;
            wrapper.innerHTML = svg;
            // Replace code block with rendered SVG
            block.parentNode?.replaceChild(wrapper, block);

            cleanups.push(() => {
              wrapper.parentNode?.replaceChild(block, wrapper);
              delete block.dataset.mermaidProcessed;
            });
          })
          .catch((err) => {
            console.error("Mermaid rendering error:", err);
          });
      });
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [containerId]);

  return null;
}
