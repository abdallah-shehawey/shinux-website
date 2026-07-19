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

function loadSession(): Promise<SessionInfo> {
  cached ??= (async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return { user: null, isAdmin: false };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    return { user, isAdmin: profile?.role === "admin" };
  })();
  return cached;
}

/** null while resolving, then the session info; live-updates on sign-in/out. */
export function useSession(): SessionInfo | null {
  const [info, setInfo] = useState<SessionInfo | null>(null);

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
