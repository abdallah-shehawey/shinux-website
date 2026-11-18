import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import LoginForm from "@/components/LoginForm";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(rawNext);

  const user = await getCurrentUser();
  if (user) redirect(next);

  return (
    <div className="mx-auto max-w-sm px-4 pt-6 pb-12 sm:px-8">
      <h1 className="mb-2 text-center text-2xl font-bold tracking-tight">
        Log in
      </h1>
      <p className="mb-8 text-center text-sm text-muted">
        Sign in to ask a question or track your activity.
      </p>
      {error === "auth" && (
        <p role="alert" className="mb-6 rounded-lg border border-red-400/40 px-3 py-2 text-center text-sm text-red-400">
          That sign-in link didn&apos;t work — it may have expired or already been
          used. Please try again.
        </p>
      )}
      <LoginForm next={next} />
    </div>
  );
}
