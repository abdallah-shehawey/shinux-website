"use client";

import Link from "next/link";
import NotificationsBell from "./NotificationsBell";
import { useSession } from "@/lib/use-session";

// The auth-dependent corner of the header. Client-side on purpose: resolving
// the user server-side would put cookies() in the root layout and force every
// page dynamic. Anonymous visitors resolve instantly from local cookie state.
export default function HeaderAuth() {
  const session = useSession();

  if (session === null) {
    // Auth state still resolving — hold the slot so the header doesn't shift.
    return (
      <span aria-hidden className="btn-ghost invisible">
        Log in
      </span>
    );
  }

  return session.user ? (
    <>
      <NotificationsBell initial={[]} userId={session.user.id} />
      {/* Mobile: a compact profile icon so it doesn't crowd the header. */}
      <Link
        href="/me"
        aria-label="My account"
        title="My account"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted transition hover:border-accent hover:text-fg active:scale-90 sm:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </Link>
      {/* Desktop: the full labelled button. */}
      <Link href="/me" className="btn-ghost hidden sm:inline-flex">
        My account
      </Link>
    </>
  ) : (
    <Link href="/login" className="btn-ghost">
      Log in
    </Link>
  );
}
