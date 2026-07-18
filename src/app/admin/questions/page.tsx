import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getPendingQuestions } from "@/lib/questions";
import AdminQuestionsQueue from "@/components/AdminQuestionsQueue";

export const metadata: Metadata = { title: "Admin · Questions" };

export default async function AdminQuestionsPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") notFound();

  const pending = await getPendingQuestions();

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Review questions</h1>
      <p className="mb-8 text-muted">
        {pending.length} pending. Publishing makes a question visible to everyone (and
        respects its anonymity setting); rejecting keeps it hidden but never deletes it.
      </p>
      <AdminQuestionsQueue initial={pending} />
    </div>
  );
}
