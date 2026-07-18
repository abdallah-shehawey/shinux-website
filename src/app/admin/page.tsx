import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/questions" className="card transition-colors hover:border-accent">
          <h2 className="mb-1 text-lg font-semibold">Review questions</h2>
          <p className="text-sm text-muted">Publish or reject pending questions.</p>
        </Link>
        <Link href="/admin/articles" className="card transition-colors hover:border-accent">
          <h2 className="mb-1 text-lg font-semibold">Reorder articles</h2>
          <p className="text-sm text-muted">Pin articles in the order you want them shown.</p>
        </Link>
      </div>
    </div>
  );
}
