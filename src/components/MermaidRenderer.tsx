"use client";

import { useEffect } from "react";
import mermaid from "mermaid";

export default function MermaidRenderer({ containerId }: { containerId: string }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Find all figure.code-block or pre containing code.language-mermaid
    const selector = "figure.code-block, pre";
    const blocks = Array.from(container.querySelectorAll<HTMLElement>(selector));

    const cleanups: Array<() => void> = [];

    const isDark = document.documentElement.classList.contains("dark");
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: "inherit",
    });

    blocks.forEach((block, idx) => {
      const codeEl = block.querySelector("code");
      const langSpan = block.querySelector(".code-lang");

      const isMermaidClass = codeEl?.classList.contains("language-mermaid");
      const isMermaidLang = langSpan?.textContent?.trim().toLowerCase() === "mermaid";

      if (!isMermaidClass && !isMermaidLang) return;
      if (block.dataset.mermaidProcessed === "true") return;

      block.dataset.mermaidProcessed = "true";

      const rawCode = codeEl?.textContent ?? block.textContent ?? "";
      if (!rawCode.trim()) return;

      const diagramId = `mermaid-svg-${idx}-${Math.random().toString(36).substring(2, 8)}`;
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-diagram-container my-6 flex flex-col items-center justify-center rounded-xl border border-border bg-card/40 p-6 overflow-x-auto shadow-xs transition-colors hover:border-border/80";

      // Render mermaid diagram to SVG
      mermaid
        .render(diagramId, rawCode.trim())
        .then(({ svg }) => {
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

    return () => cleanups.forEach((fn) => fn());
  }, [containerId]);

  return null;
}
