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
      <Link href="/me" className="btn-ghost">
        My account
      </Link>
    </>
  ) : (
    <Link href="/login" className="btn-ghost">
      Log in
    </Link>
  );
}
