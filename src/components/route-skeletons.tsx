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
 *
 * The exception is a route whose skeleton depends on where it is being opened
 * FROM: an Arabic article reads right-to-left, and its skeleton has to be
 * mirrored too or the page visibly flips sides when it lands. Those routes hold
 * a function of the hints instead — see SkeletonHints.
 */
export type SkeletonDir = "ltr" | "rtl";

/**
 * What the clicked link could tell us about the page it opens, beyond its URL.
 * Everything here is optional: a skeleton rendered without hints (a direct
 * load, an unhinted link) must still be the sensible default.
 */
export type SkeletonHints = { dir?: SkeletonDir };

type Skeleton = ReactElement | ((hints: SkeletonHints) => ReactElement);

const ROUTES: Readonly<Record<string, Skeleton>> = {
  "/": <HomeLoading />,
  "/about": <AboutLoading />,
  "/admin/questions": <AdminQuestionsLoading />,
  "/articles": <ArticlesLoading />,
  "/articles/[slug]": ({ dir }) => <ArticleLoading dir={dir} />,
  "/ask": <AskLoading />,
  "/login": <LoginLoading />,
  "/me": <MeLoading />,
  "/questions": <QuestionsLoading />,
  "/questions/[slug]": ({ dir }) => <QuestionLoading dir={dir} />,
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
 * The skeleton Next.js would show for `pathname`, tailored by whatever `hints`
 * the caller could gather about the destination.
 *
 * Resolution mirrors the App Router's own: the deepest matching route wins,
 * and a path with no route of its own inherits the nearest ancestor's loading
 * boundary — which is also what makes an unrecognised URL fall back to the
 * root skeleton, exactly as a real navigation to a 404 does.
 */
export function skeletonForPath(
  pathname: string,
  hints: SkeletonHints = {},
): ReactElement | null {
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

    if (best !== null) {
      return typeof best.skeleton === "function" ? best.skeleton(hints) : best.skeleton;
    }
  }

  return null;
}
