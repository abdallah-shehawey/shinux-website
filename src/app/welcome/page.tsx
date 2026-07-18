import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import AvatarUploader from "@/components/AvatarUploader";
import DisplayNameForm from "@/components/DisplayNameForm";
import UsernameForm from "@/components/UsernameForm";
import FinishOnboardingButton from "@/components/FinishOnboardingButton";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: rawNext } = await searchParams;
  const next = rawNext && rawNext.startsWith("/") ? rawNext : "/";

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/welcome?next=${next}`)}`);

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, onboarded")
    .eq("id", user.id)
    .single();

  // Already been through this before (or navigated here directly) — nothing to do.
  if (profile?.onboarded) redirect(next);

  const displayName = profile?.display_name || profile?.username || "there";
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Welcome!</h1>
      <p className="mb-8 text-sm text-muted">
        We pulled this from your account. Check it over and change anything you
        like before you continue.
      </p>

      <div className="card flex items-center gap-4">
        <AvatarUploader avatarUrl={profile?.avatar_url ?? null} initial={initial} />
      </div>

      <div className="mt-8 card">
        <h2 className="mb-1 text-lg font-semibold">Display name</h2>
        <DisplayNameForm initialDisplayName={profile?.display_name ?? ""} />
      </div>

      <div className="mt-8 card">
        <h2 className="mb-1 text-lg font-semibold">Username</h2>
        <p className="text-sm text-muted">
          This is how you appear across the site. Must be unique.
        </p>
        <UsernameForm initialUsername={profile?.username ?? ""} />
      </div>

      <div className="mt-8">
        <FinishOnboardingButton next={next} />
      </div>
    </div>
  );
}
