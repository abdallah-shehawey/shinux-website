import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getPendingQuestions } from "@/lib/questions";
import AdminQuestionsQueue from "@/components/AdminQuestionsQueue";

export const metadata: Metadata = { title: "Admin · Questions" };

export default async function AdminQuestionsPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  // Role check and the pending-questions read fire together instead of one
  // after the other — the queue is RLS-gated to admins anyway, so a non-admin
  // just gets an empty list before the notFound() below. One fewer round trip
  // on the site's only always-dynamic tab.
  const supabase = await createClient();
  const [{ data: profile }, pending] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    getPendingQuestions(),
  ]);
  if (profile?.role !== "admin") notFound();

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Review questions</h1>
      <p className="mb-8 text-muted">
        {pending.length} pending. Publishing makes a question visible to everyone (and
        respects its anonymity setting); rejecting keeps it hidden but never deletes it.
      </p>
      <AdminQuestionsQueue initial={pending} />
    </div>
  );
}
