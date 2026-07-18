import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import ProfileEditor from "@/components/ProfileEditor";

export const metadata: Metadata = { title: "My account" };

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/me");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, social_links, created_at")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || profile?.username || "there";
  const initial = displayName.trim().charAt(0).toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">My account</h1>

      <div className="card flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-mono text-xl font-bold text-accent-fg">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-fg">{displayName}</p>
          <p className="text-sm text-muted">@{profile?.username ?? "—"}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>

      {memberSince && (
        <p className="mt-4 text-sm text-muted">Member since {memberSince}</p>
      )}

      <div className="mt-6">
        <ProfileEditor
          avatarUrl={profile?.avatar_url ?? null}
          initial={initial}
          displayName={profile?.display_name ?? ""}
          username={profile?.username ?? ""}
          socialLinks={profile?.social_links ?? []}
        />
      </div>

      <div className="mt-8 card">
        <h2 className="mb-2 text-lg font-semibold">Your questions</h2>
        <p className="text-sm text-muted">
          Coming in the next phase — you&apos;ll see all your questions here,
          with a badge on any you posted anonymously.
        </p>
      </div>

      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}
