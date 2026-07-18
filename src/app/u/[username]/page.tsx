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

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">
          Articles {articles.length > 0 && `(${articles.length})`}
        </h2>
        {articles.length === 0 ? (
          <p className="text-sm text-muted">No public articles yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/articles/${a.slug}`}
                className="card hover:border-accent"
              >
                <p className="text-sm font-medium text-fg" dir="auto">
                  {a.title}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">
          Tutorials {lessons.length > 0 && `(${lessons.length})`}
        </h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-muted">No public tutorials yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {lessons.map((l) => (
              <Link
                key={`${l.track}/${l.slug}`}
                href={`/tutorials/${l.track}/${l.slug}`}
                className="card flex items-center justify-between gap-3 hover:border-accent"
              >
                <span className="text-sm font-medium text-fg">{l.title}</span>
                <span className="tag-chip shrink-0">{l.trackTitle}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">
          Questions asked {questions.length > 0 && `(${questions.length})`}
        </h2>
        {questions.length === 0 ? (
          <p className="text-sm text-muted">No public questions yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {questions.map((q) => (
              <Link
                key={q.id}
                href={`/questions/${q.slug}`}
                className="card flex items-center justify-between gap-3 hover:border-accent"
              >
                <span className="text-sm font-medium text-fg" dir="auto">
                  {q.title}
                </span>
                <span className="tag-chip shrink-0">
                  {q.answer_count} {q.answer_count === 1 ? "answer" : "answers"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">
          Answers given {answers.length > 0 && `(${answers.length})`}
        </h2>
        {answers.length === 0 ? (
          <p className="text-sm text-muted">No public answers yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {answers.map((a) => (
              <Link
                key={a.id}
                href={`/questions/${a.question_slug}`}
                className="card hover:border-accent"
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
    </div>
  );
}
