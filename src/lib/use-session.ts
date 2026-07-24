"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type SessionInfo = { user: User | null; isAdmin: boolean };

// Module-level cache so the header islands (AdminNavLink + HeaderAuth) share
// ONE session read + ONE role query per page load instead of each paying
// their own. The header moved to client-side auth so the root layout never
// touches cookies() — that single call was forcing every route dynamic.
let cached: Promise<SessionInfo> | null = null;

// The last resolved value, readable SYNCHRONOUSLY. Without this, every mount
// started at null and only learned the answer a microtask later — so on each
// client-side navigation an admin's page painted once without the "Reorder"
// toolbar and again with it, shifting the grid down ~60px. ScrollMemory
// restores the saved scroll in a layout effect, i.e. in between those two
// paints, so a restored position landed on the pre-shift layout and the page
// ended up in the wrong place. It also made the header's auth corner flicker
// on every navigation.
//
// Left null during hydration on the first load (nothing has resolved yet), so
// the client's first render still matches the prerendered HTML.
let snapshot: SessionInfo | null = null;

// The admin role costs a Supabase round trip, and everything gated on it (the
// Admin tab, the "Reorder" toolbars) stays hidden until it lands — on a slow
// link that is a second or more of the admin's own UI missing on every page.
// Remember the answer for the tab's lifetime so it comes back in a frame, and
// revalidate underneath. This is a rendering hint ONLY: every privileged read
// and write is enforced by RLS on the server, so a tampered value buys nothing
// but a broken-looking page for whoever tampered with it.
const ROLE_HINT_KEY = "sb-role-hint";

function readRoleHint(userId: string): boolean | null {
  try {
    const raw = sessionStorage.getItem(ROLE_HINT_KEY);
    if (!raw) return null;
    const hint = JSON.parse(raw) as { id?: string; isAdmin?: boolean };
    return hint.id === userId ? !!hint.isAdmin : null;
  } catch {
    return null;
  }
}

function writeRoleHint(userId: string, isAdmin: boolean) {
  try {
    sessionStorage.setItem(ROLE_HINT_KEY, JSON.stringify({ id: userId, isAdmin }));
  } catch {
    /* private mode / storage full — the round trip below still resolves it */
  }
}

function loadSession(): Promise<SessionInfo> {
  cached ??= (async () => {
    const supabase = createClient();
    // Reads the persisted session locally; no network.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) {
      try {
        sessionStorage.removeItem(ROLE_HINT_KEY);
      } catch {
        /* nothing to clear */
      }
      snapshot = { user: null, isAdmin: false };
      return snapshot;
    }

    const hint = readRoleHint(user.id);
    if (hint !== null) {
      // Publish the remembered answer now, then confirm it against the server.
      snapshot = { user, isAdmin: hint };
      void supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          const isAdmin = data?.role === "admin";
          writeRoleHint(user.id, isAdmin);
          if (isAdmin !== hint) {
            // The hint was wrong (role changed, or it was tampered with):
            // drop the memoised promise so the next read re-resolves.
            cached = null;
            snapshot = { user, isAdmin };
          }
        });
      return snapshot;
    }

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin = data?.role === "admin";
    writeRoleHint(user.id, isAdmin);
    snapshot = { user, isAdmin };
    return snapshot;
  })();
  return cached;
}

/** null while resolving, then the session info; live-updates on sign-in/out. */
export function useSession(): SessionInfo | null {
  const [info, setInfo] = useState<SessionInfo | null>(snapshot);

  useEffect(() => {
    let alive = true;
    loadSession().then((s) => {
      if (alive) setInfo(s);
    });

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        cached = null;
        snapshot = null;
        if (event === "SIGNED_OUT") {
          try {
            sessionStorage.removeItem(ROLE_HINT_KEY);
          } catch {
            /* nothing to clear */
          }
        }
        loadSession().then((s) => {
          if (alive) setInfo(s);
        });
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  return info;
}
