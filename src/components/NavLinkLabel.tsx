"use client";

import { useLinkStatus } from "next/link";

// The label inside a header <Link>, which acknowledges the click IMMEDIATELY.
//
// Why this exists: a tab click starts a React transition, and React deliberately
// keeps the OLD page on screen until the new route's RSC payload arrives. The
// route's loading.tsx skeleton travels inside that same payload, so on a slow
// link there is a window — measured at ~1.5s here, and far longer on a bad
// connection — where the click produces NO visible change at all and the tab
// reads as broken.
//
// useLinkStatus is scoped to the enclosing Link, so only the tab that was
// actually clicked lights up. That is the honest signal ("your click landed,
// this one is loading"), as opposed to a site-wide progress bar across the top,
// which was tried and removed for reading as fake.
//
// The indicator is absolutely positioned: a pending tab must never change the
// width of the nav row, or every click would shove the other tabs sideways.
export default function NavLinkLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      className={`relative inline-block transition-colors ${pending ? "text-accent" : ""}`}
      data-pending={pending || undefined}
    >
      {label}
      {pending && <span className="nav-pending-bar" aria-hidden />}
    </span>
  );
}
