import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const user = await getCurrentUser();
  if (user) redirect(next ?? "/");

  return (
    <div className="mx-auto max-w-sm px-4 pt-6 pb-12 sm:px-8">
      <h1 className="mb-2 text-center text-2xl font-bold tracking-tight">
        Log in
      </h1>
      <p className="mb-8 text-center text-sm text-muted">
        Sign in to ask a question or track your activity.
      </p>
      <LoginForm next={next ?? "/"} />
    </div>
  );
}
