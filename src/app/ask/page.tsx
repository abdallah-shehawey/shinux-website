import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { ThreadViewer } from "@/lib/viewer";
import AskForm from "@/components/AskForm";

export const metadata: Metadata = { title: "Ask a question" };

export default async function AskPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/ask");

  // The composer shows you posting as yourself, so it needs the same name and
  // avatar the question will carry once it is published.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", user.id)
    .single();

  const viewer: ThreadViewer = {
    id: user.id,
    displayName: profile?.display_name || profile?.username || "You",
    username: profile?.username ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-16 sm:px-6">
      <h1 className="mb-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Ask a question</h1>
      <p className="mb-6 text-sm text-muted">
        An admin reviews every question before it goes live. Once it&apos;s published, anyone
        signed in can answer it.
      </p>
      <AskForm viewer={viewer} />
    </div>
  );
}
