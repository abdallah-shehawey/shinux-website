import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AskForm from "@/components/AskForm";

export const metadata: Metadata = { title: "Ask a question" };

export default async function AskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/ask");

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Ask a question</h1>
      <p className="mb-8 text-muted">
        An admin reviews every question before it goes live. Once it&apos;s published, anyone
        signed in can answer it.
      </p>
      <AskForm />
    </div>
  );
}
