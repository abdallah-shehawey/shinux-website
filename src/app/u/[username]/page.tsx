import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/profiles";
import { getQuestionsByAuthor, getAnswersByAuthor } from "@/lib/questions";
import { getArticlesByAuthor } from "@/lib/articles";
import { getLessonsByAuthor } from "@/lib/tutorials";
import { getSocialIcon } from "@/lib/social-icons";
import { getCachedPublicProfileUsernames } from "@/lib/profiles";
import ProfileStats from "@/components/ProfileStats";

// Every profile is public, identical for all viewers, and listed in the
// sitemap — so it is prerendered at build and refreshed by ISR (plus straight
// away whenever the "profiles"/"questions" cache tags are revalidated) instead
// of being rebuilt from scratch on every crawler hit.
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
  const articles = getArticlesByAuthor(profile.contentHandles);
  const lessons = getLessonsByAuthor(profile.contentHandles);

  const initial = profile.displayName.trim().charAt(0).toUpperCase();
  // The site has a single owner: the admin account. Everyone else is a member.
  const isOwner = profile.role === "admin";
  const roleLabel = isOwner ? "Owner" : "Member";

  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-fg">{profile.displayName}</p>
            {isOwner && (
              <span className="inline-flex items-center rounded-full border border-accent bg-accent/10 px-2 py-0.5 font-mono text-xs font-semibold text-accent">
                Owner
              </span>
            )}
          </div>
          <p className="text-sm text-muted">@{profile.username}</p>
          <p className="text-sm text-muted">{roleLabel} since {formatDate(profile.createdAt)}</p>
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

      <ProfileStats
        username={profile.username}
        articlesCount={articles.length}
        tutorialsCount={lessons.length}
        questionsCount={questions.length}
        answersCount={answers.length}
      />
    </div>
  );
}
