import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfile, getCachedPublicProfileUsernames } from "@/lib/profiles";
import { getQuestionsByAuthor } from "@/lib/questions";
import QuestionCard from "@/components/QuestionCard";

// Public and viewer-independent, like the profile page it hangs off: rendered
// once and served from the cache, not rebuilt per request. See
// src/app/u/[username]/page.tsx.
export const revalidate = 3600;

export async function generateStaticParams() {
  const usernames = await getCachedPublicProfileUsernames().catch(() => []);
  return usernames.map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return {};
  return { title: `Questions asked by ${profile.displayName}` };
}

export default async function ProfileQuestionsAskedPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const questions = await getQuestionsByAuthor(profile.id);

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
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
