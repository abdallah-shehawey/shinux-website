"use client";

import { useEffect } from "react";

const COPY_LABEL = "Copy";
const COPIED_LABEL = "Copied!";

// Wires up the "Copy" button for every code block inside the article body.
// Standalone blocks already ship a server-rendered `.copy-code-btn` inside
// their `.code-block` header (see rehypeCodeChrome in markdown.ts) — this
// just finds it and binds the click handler. `.code-tabs` blocks (still
// unwrapped) get the old create-and-append fallback. Done client-side so the
// same sanitized HTML works whether it's rendered from a file or, later,
// from the database — no server-only DOM APIs involved.
export default function CopyCodeButtons({ containerId }: { containerId: string }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cleanups: Array<() => void> = [];

    const bind = (btn: HTMLButtonElement, pre: HTMLPreElement) => {
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
      cleanups.push(() => btn.removeEventListener("click", onClick));
    };

    container.querySelectorAll<HTMLPreElement>("pre").forEach((pre) => {
      const existing = pre.parentElement?.querySelector<HTMLButtonElement>(
        ":scope > .code-block-header .copy-code-btn",
      );
      if (existing) {
        bind(existing, pre);
        return;
      }
      if (pre.querySelector(".copy-code-btn")) return; // already has one

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-code-btn";
      btn.textContent = COPY_LABEL;
      bind(btn, pre);
      pre.appendChild(btn);
    });

    return () => cleanups.forEach((fn) => fn());
  }, [containerId]);

  return null;
}
