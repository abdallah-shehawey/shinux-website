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

function loadSession(): Promise<SessionInfo> {
  cached ??= (async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    const info: SessionInfo = user
      ? {
          user,
          isAdmin:
            (
              await supabase.from("profiles").select("role").eq("id", user.id).single()
            ).data?.role === "admin",
        }
      : { user: null, isAdmin: false };
    snapshot = info;
    return info;
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
