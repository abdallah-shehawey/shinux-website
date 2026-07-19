import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfile } from "@/lib/profiles";
import { getQuestionsByAuthor, getAnswersByAuthor } from "@/lib/questions";
import { getArticlesByAuthor } from "@/lib/articles";
import { getLessonsByAuthor } from "@/lib/tutorials";
import { getSocialIcon } from "@/lib/social-icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return {};
  return { title: profile.displayName };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

export default async function PublicProfilePage({
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
  const articles = getArticlesByAuthor(profile.username);
  const lessons = getLessonsByAuthor(profile.username);

  const initial = profile.displayName.trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full px-4 py-12 sm:px-8 lg:px-12">
      <div className="card flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-mono text-2xl font-bold text-accent-fg">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-fg">{profile.displayName}</p>
          <p className="text-sm text-muted">@{profile.username}</p>
          <p className="text-sm text-muted">Member since {formatDate(profile.createdAt)}</p>
        </div>
      </div>

      {profile.socialLinks.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {profile.socialLinks.map((s) => {
            const Icon = getSocialIcon(s.platform);
            return (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost inline-flex items-center gap-1.5"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {s.label || s.platform}
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Articles", count: articles.length, href: `/u/${profile.username}/articles` },
          { label: "Tutorials", count: lessons.length, href: `/u/${profile.username}/tutorials` },
          {
            label: "Questions Asked",
            count: questions.length,
            href: `/u/${profile.username}/questions`,
          },
          {
            label: "Answers Given",
            count: answers.length,
            href: `/u/${profile.username}/answers`,
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
