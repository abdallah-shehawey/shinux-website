import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfile } from "@/lib/profiles";
import { getAnswersByAuthor } from "@/lib/questions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return {};
  return { title: `Answers by ${profile.displayName}` };
}

export default async function ProfileAnswersGivenPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const answers = await getAnswersByAuthor(profile.id);

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <Link href={`/u/${profile.username}`} className="text-sm text-muted hover:text-accent">
        &larr; Back to profile
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold tracking-tight">Answers by {profile.displayName}</h1>
      </header>

      {answers.length === 0 ? (
        <p className="text-muted">No public answers yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {answers.map((a) => (
            <Link
              key={a.id}
              href={`/questions/${a.question_slug}`}
              className="card active:scale-[0.98] active:opacity-90 transition-colors hover:border-accent"
            >
              <p className="text-sm font-medium text-fg" dir="auto">
                {a.question_title}
              </p>
              <p className="mt-1 truncate text-xs text-muted" dir="auto">
                {a.body}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
