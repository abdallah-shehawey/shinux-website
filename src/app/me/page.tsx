import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getOwnQuestions } from "@/lib/questions";
import { getUserNotifications } from "@/lib/notifications";
import SignOutButton from "@/components/SignOutButton";
import ProfileEditor from "@/components/ProfileEditor";
import NotificationsList from "@/components/NotificationsList";

const STATUS_LABEL: Record<string, string> = {
  pending: "Under review",
  published: "Published",
  answered: "Answered",
  rejected: "Not approved",
};

export const metadata: Metadata = { title: "My account" };

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me");

  // All three reads only need user.id, so they go out together. Chaining them
  // (profile, then questions + notifications) cost three sequential Supabase
  // round trips before this page could render its first byte, which on a slow
  // link is most of the wait after clicking the account icon.
  const supabase = await createClient();
  const [{ data: profile }, questions, notifications] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, social_links, role, created_at")
      .eq("id", user.id)
      .single(),
    getOwnQuestions(user.id),
    getUserNotifications(user.id),
  ]);

  const displayName = profile?.display_name || profile?.username || "there";
  const initial = displayName.trim().charAt(0).toUpperCase();
  const isOwner = profile?.role === "admin";
  const roleLabel = isOwner ? "Owner" : "Member";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : null;


  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">My account</h1>

      <ProfileEditor
        avatarUrl={profile?.avatar_url ?? null}
        initial={initial}
        headerName={displayName}
        initialDisplayName={profile?.display_name ?? ""}
        username={profile?.username ?? ""}
        email={user.email ?? ""}
        roleLabel={roleLabel}
        memberSince={memberSince}
        socialLinks={profile?.social_links ?? []}
      />

      <div id="notifications" className="mt-8 scroll-mt-20">
        <h2 className="mb-3 text-lg font-semibold">Notifications</h2>
        <NotificationsList initial={notifications} />
      </div>

      {/* id + scroll-mt: a "your question was not approved" notification links
          straight here, since a rejected question has no page of its own. */}
      <div id="questions" className="mt-8 scroll-mt-20">
        <h2 className="mb-3 text-lg font-semibold">Your questions</h2>
        {questions.length === 0 ? (
          <p className="text-sm text-muted">
            You haven&apos;t asked anything yet.{" "}
            <Link href="/ask" className="text-accent hover:underline">
              Ask a question
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {questions.map((q) => (
              <Link
                key={q.id}
                href={q.slug ? `/questions/${q.slug}` : "#"}
                className={`card flex items-start justify-between gap-3 ${q.slug ? "hover:border-accent" : "pointer-events-none opacity-70"}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg" dir="auto">
                    {q.title} {q.is_anonymous && <span title="Posted anonymously">🕶️</span>}
                  </p>
                  {q.status === "answered" && (
                    <p className="mt-0.5 text-xs text-muted">
                      {q.answer_count} {q.answer_count === 1 ? "answer" : "answers"}
                    </p>
                  )}
                  {/* The one place the asker can read why it was turned down.
                      Until now it was written by the admin, mailed out, and
                      then shown nowhere in the site itself. */}
                  {q.status === "rejected" && q.rejection_reason && (
                    <p className="mt-1.5 text-xs text-fg" dir="auto">
                      <span className="text-muted">Reason: </span>
                      {q.rejection_reason}
                    </p>
                  )}
                </div>
                <span className="tag-chip shrink-0">{STATUS_LABEL[q.status] ?? q.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}
