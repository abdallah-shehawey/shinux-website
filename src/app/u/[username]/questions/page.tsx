import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfile } from "@/lib/profiles";
import { getQuestionsByAuthor } from "@/lib/questions";
import QuestionCard from "@/components/QuestionCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return {};
  // Thrown here (not just in the page) so the response is a real 404 —
  // metadata resolves before streaming starts, the page body after.
  if (profile.role === "admin") notFound();
  return { title: `Questions asked by ${profile.displayName}` };
}

export default async function ProfileQuestionsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();
  // Mirrors the hidden "Questions Asked" tile on the admin's profile page.
  if (profile.role === "admin") notFound();

  const questions = await getQuestionsByAuthor(profile.id);

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <Link href={`/u/${profile.username}`} className="text-sm text-muted hover:text-accent">
        &larr; Back to profile
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Questions asked by {profile.displayName}
        </h1>
      </header>

      {questions.length === 0 ? (
        <p className="text-muted">No public questions yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      )}
    </div>
  );
}
