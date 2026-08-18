"use client";

import Link from "next/link";
import { useNavigationTarget } from "./NavigationPending";

/**
 * The admin area's own tab bar.
 *
 * It is rendered by each admin page AND by each admin `loading.tsx`, rather
 * than hoisted into an `admin/layout.tsx`. A layout would be the obvious home
 * for it, but NavigationSkeleton swaps the entire page area for the
 * destination's skeleton while a navigation is in flight — a layout's tabs
 * would blink out for the length of every admin-to-admin hop and come back.
 * Living inside the skeletons too, they stay on screen and stay clickable, and
 * the tab being opened is already lit (useNavigationTarget) before its page
 * lands.
 */

const TABS = [
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/users", label: "Users" },
] as const;

export default function AdminTabs() {
  const pathname = useNavigationTarget();

  return (
    <nav aria-label="Admin sections" className="mb-6 flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          prefetch={true}
          scroll={false}
          data-active={pathname === tab.href}
          className="btn-ghost"
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
