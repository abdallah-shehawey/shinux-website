import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const [questions, notifications] = await Promise.all([
    getOwnQuestions(user.id),
    getUserNotifications(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">My account</h1>

      <ProfileEditor
        avatarUrl={profile?.avatar_url ?? null}
        initial={initial}
        headerName={displayName}
        initialDisplayName={profile?.display_name ?? ""}
        username={profile?.username ?? ""}
        email={user.email ?? ""}
        memberSince={memberSince}
        socialLinks={profile?.social_links ?? []}
      />

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Notifications</h2>
        <NotificationsList initial={notifications} />
      </div>

      <div className="mt-8">
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
                className={`card flex items-center justify-between gap-3 ${q.slug ? "hover:border-accent" : "pointer-events-none opacity-70"}`}
              >
                <div>
                  <p className="text-sm font-medium text-fg">
                    {q.title} {q.is_anonymous && <span title="Posted anonymously">🕶️</span>}
                  </p>
                  {q.status === "answered" && (
                    <p className="mt-0.5 text-xs text-muted">
                      {q.answer_count} {q.answer_count === 1 ? "answer" : "answers"}
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
