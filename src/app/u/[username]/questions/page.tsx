import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfile } from "@/lib/profiles";
import { getQuestionsByAuthor, getAnswersByAuthor } from "@/lib/questions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return {};
  return { title: `Q&A by ${profile.displayName}` };
}

export default async function ProfileQAPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const [questions, answers] = await Promise.all([
    getQuestionsByAuthor(profile.id),
    getAnswersByAuthor(profile.id),
  ]);

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <Link href={`/u/${profile.username}`} className="text-sm text-muted hover:text-accent">
        &larr; Back to profile
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold tracking-tight">Q&amp;A by {profile.displayName}</h1>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {[
          {
            label: "Questions Asked",
            count: questions.length,
            href: `/u/${profile.username}/questions/asked`,
          },
          {
            label: "Answers Given",
            count: answers.length,
            href: `/u/${profile.username}/questions/answered`,
          },
        ].map((stat) =>
          stat.count > 0 ? (
            <Link
              key={stat.label}
              href={stat.href}
              className="card active:scale-[0.98] active:opacity-90 flex flex-col items-center gap-1 py-6 text-center transition-colors hover:border-accent"
            >
              <span className="font-mono text-2xl font-bold text-accent">{stat.count}</span>
              <span className="text-sm text-muted">{stat.label}</span>
            </Link>
          ) : (
            <div
              key={stat.label}
              className="card flex flex-col items-center gap-1 py-6 text-center opacity-50"
            >
              <span className="font-mono text-2xl font-bold text-muted">0</span>
              <span className="text-sm text-muted">{stat.label}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
