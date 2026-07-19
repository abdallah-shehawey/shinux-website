"use client";

import { useEffect } from "react";

// Turns the inert div.code-tabs wrappers emitted by remarkCodeTabs (see
// src/lib/markdown.ts) into interactive tab groups: a tab strip with one
// button per fence, one visible <pre> at a time. Client-side for the same
// reason as CopyCodeButtons — the sanitized server HTML stays plain, and
// without JavaScript the code blocks simply stack.
export default function CodeTabs({ containerId }: { containerId: string }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const groups = container.querySelectorAll<HTMLElement>(".code-tabs");
    const cleanups: Array<() => void> = [];

    groups.forEach((group) => {
      if (group.querySelector(".code-tabs-bar")) return; // already enhanced

      let titles: string[] = [];
      try {
        titles = JSON.parse(group.dataset.tabTitles ?? "[]");
      } catch {
        return;
      }
      const panes = Array.from(group.querySelectorAll<HTMLPreElement>(":scope > pre"));
      if (panes.length < 2 || titles.length !== panes.length) return;

      const bar = document.createElement("div");
      bar.className = "code-tabs-bar";
      bar.setAttribute("role", "tablist");

      const buttons: HTMLButtonElement[] = [];
      const select = (active: number) => {
        panes.forEach((pane, i) => {
          pane.hidden = i !== active;
        });
        buttons.forEach((b, i) => {
          b.setAttribute("aria-selected", String(i === active));
          b.classList.toggle("is-active", i === active);
        });
      };

      titles.forEach((title, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "code-tabs-tab";
        btn.setAttribute("role", "tab");
        btn.textContent = title;
        const onClick = () => select(idx);
        btn.addEventListener("click", onClick);
        cleanups.push(() => btn.removeEventListener("click", onClick));
        buttons.push(btn);
        bar.appendChild(btn);
      });

      group.prepend(bar);
      select(0);
      cleanups.push(() => {
        bar.remove();
        panes.forEach((pane) => {
          pane.hidden = false;
        });
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [containerId]);

  return null;
}
