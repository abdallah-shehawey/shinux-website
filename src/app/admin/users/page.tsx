import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getRegisteredUsers } from "@/lib/admin-users";
import AdminTabs from "@/components/AdminTabs";
import Avatar from "@/components/Avatar";

export const metadata: Metadata = { title: "Admin · Users" };

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  // Role check and the roster read fire together rather than one after the
  // other, same as the questions queue: the list is RLS-gated to admins
  // anyway, so a non-admin only ever sees their own row before the notFound()
  // below throws it away.
  const supabase = await createClient();
  const [{ data: profile }, users] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    getRegisteredUsers(),
  ]);
  if (profile?.role !== "admin") notFound();

  const admins = users.filter((u) => u.role === "admin").length;
  const members = users.length - admins;

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <AdminTabs />

      <h1 className="mb-2 text-3xl font-bold tracking-tight">Registered users</h1>
      <p className="mb-8 text-muted">
        {users.length} {users.length === 1 ? "account" : "accounts"} — {admins}{" "}
        {admins === 1 ? "admin" : "admins"} and {members}{" "}
        {members === 1 ? "member" : "members"}. Newest first. Open a name for the public
        profile with everything that account has posted.
      </p>

      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent"
          >
            <Avatar name={u.displayName} avatar={u.avatarUrl} username={u.username} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/u/${u.username}`}
                  prefetch={false}
                  className="truncate font-semibold text-fg transition-colors hover:text-accent"
                >
                  {u.displayName}
                </Link>
                {u.role === "admin" && (
                  <span className="tag-chip" data-active="true">
                    Admin
                  </span>
                )}
              </div>
              {/* Handle and join date share a line so a long display name never
                  squeezes the date off the side of a phone. */}
              <p className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted">
                <span className="truncate">@{u.username}</span>
                <span aria-hidden>&middot;</span>
                <span>Joined {formatJoined(u.createdAt)}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
