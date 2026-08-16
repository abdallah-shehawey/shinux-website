import type { ReactElement } from "react";

import HomeLoading from "@/app/loading";
import AboutLoading from "@/app/about/loading";
import AdminQuestionsLoading from "@/app/admin/questions/loading";
import ArticlesLoading from "@/app/articles/loading";
import ArticleLoading from "@/app/articles/[slug]/loading";
import AskLoading from "@/app/ask/loading";
import LoginLoading from "@/app/login/loading";
import MeLoading from "@/app/me/loading";
import QuestionsLoading from "@/app/questions/loading";
import QuestionLoading from "@/app/questions/[slug]/loading";
import TutorialsLoading from "@/app/tutorials/loading";
import TrackLoading from "@/app/tutorials/[track]/loading";
import LessonLoading from "@/app/tutorials/[track]/[lesson]/loading";
import WelcomeLoading from "@/app/welcome/loading";
import ProfileLoading from "@/app/u/[username]/loading";
import ProfileArticlesLoading from "@/app/u/[username]/articles/loading";
import ProfileTutorialsLoading from "@/app/u/[username]/tutorials/loading";
import ProfileTrackLoading from "@/app/u/[username]/tutorials/[track]/loading";
import ProfileAskedLoading from "@/app/u/[username]/questions/asked/loading";
import ProfileAnsweredLoading from "@/app/u/[username]/questions/answered/loading";

/**
 * Which skeleton belongs to which URL — the lookup table behind the instant
 * loading state in NavigationSkeleton.
 *
 * The components here ARE the routes' own `loading.tsx` files, imported
 * directly rather than copied. Whatever Next.js would eventually stream in as
 * the loading boundary is byte-for-byte what gets painted the moment the link
 * is clicked, so the two can never drift out of sync — editing a skeleton is
 * still a one-file job.
 *
 * They are safe to pull into the client bundle: every one of them is pure
 * presentational JSX with no imports at all, server-only or otherwise.
 *
 * Patterns are written exactly as the `app/` directory spells them, `[param]`
 * included; a bracketed segment matches any single path segment.
 *
 * Stored as elements rather than component types, built once at module load.
 * They take no props and hold no state, so a single frozen element per route
 * is all anyone ever needs — and it keeps the lookup below from handing a
 * component back to a caller that would have to instantiate it mid-render.
 * That includes the two skeletons that mirror for an Arabic page: they read
 * their direction from an attribute on <html>, not from a prop, so that the
 * copy Next.js renders for itself agrees with this one (see NavigationPending).
 */
export type SkeletonDir = "ltr" | "rtl";

const ROUTES: Readonly<Record<string, ReactElement>> = {
  "/": <HomeLoading />,
  "/about": <AboutLoading />,
  "/admin/questions": <AdminQuestionsLoading />,
  "/articles": <ArticlesLoading />,
  "/articles/[slug]": <ArticleLoading />,
  "/ask": <AskLoading />,
  "/login": <LoginLoading />,
  "/me": <MeLoading />,
  "/questions": <QuestionsLoading />,
  "/questions/[slug]": <QuestionLoading />,
  "/tutorials": <TutorialsLoading />,
  "/tutorials/[track]": <TrackLoading />,
  "/tutorials/[track]/[lesson]": <LessonLoading />,
  "/welcome": <WelcomeLoading />,
  "/u/[username]": <ProfileLoading />,
  "/u/[username]/articles": <ProfileArticlesLoading />,
  "/u/[username]/tutorials": <ProfileTutorialsLoading />,
  "/u/[username]/tutorials/[track]": <ProfileTrackLoading />,
  "/u/[username]/questions/asked": <ProfileAskedLoading />,
  "/u/[username]/questions/answered": <ProfileAnsweredLoading />,
};

const TABLE = Object.entries(ROUTES).map(([pattern, skeleton]) => ({
  segments: splitPath(pattern),
  skeleton,
  // Literal (non-`[param]`) segments make a pattern more specific than a
  // wildcard one of the same depth — see the tie-break in skeletonForPath.
  literals: splitPath(pattern).filter((s) => !s.startsWith("[")).length,
}));

function splitPath(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

/**
 * The skeleton Next.js would show for `pathname`.
 *
 * Resolution mirrors the App Router's own: the deepest matching route wins,
 * and a path with no route of its own inherits the nearest ancestor's loading
 * boundary — which is also what makes an unrecognised URL fall back to the
 * root skeleton, exactly as a real navigation to a 404 does.
 */
export function skeletonForPath(pathname: string): ReactElement | null {
  const segments = splitPath(pathname);

  for (let depth = segments.length; depth >= 0; depth--) {
    const target = segments.slice(0, depth);
    let best: (typeof TABLE)[number] | null = null;

    for (const route of TABLE) {
      if (route.segments.length !== depth) continue;
      const matches = route.segments.every(
        (seg, i) => seg.startsWith("[") || seg === target[i],
      );
      if (matches && (best === null || route.literals > best.literals)) best = route;
    }

    if (best !== null) return best.skeleton;
  }

  return null;
}
