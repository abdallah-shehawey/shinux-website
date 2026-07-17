"use client";

import { useEffect } from "react";

const COPY_LABEL = "Copy";
const COPIED_LABEL = "Copied!";

// Injects a "Copy" button into every <pre> code block inside the article body.
// Done client-side (rather than in the Markdown pipeline) so the same
// sanitized HTML works whether it's rendered from a file or, later, from the
// database — no server-only DOM APIs involved.
export default function CopyCodeButtons({ containerId }: { containerId: string }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const blocks = container.querySelectorAll<HTMLPreElement>("pre");
    const cleanups: Array<() => void> = [];

    blocks.forEach((pre) => {
      if (pre.querySelector(".copy-code-btn")) return; // already has one

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-code-btn";
      btn.textContent = COPY_LABEL;

      const onClick = async () => {
        const code = pre.querySelector("code")?.textContent ?? "";
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = COPIED_LABEL;
          setTimeout(() => {
            btn.textContent = COPY_LABEL;
          }, 1500);
        } catch {
          /* clipboard unavailable — silently ignore */
        }
      };

      btn.addEventListener("click", onClick);
      pre.appendChild(btn);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [containerId]);

  return null;
}
