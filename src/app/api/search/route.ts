import { NextResponse } from "next/server";
import { searchArticles } from "@/lib/articles";
import { searchLessons } from "@/lib/tutorials";
import { getPublicQuestions } from "@/lib/questions";

// Full-text search lives here instead of inside the listing pages.
//
// Reading `searchParams` in a page opts that whole route into dynamic
// rendering — even for the visitors who never search. /articles, /tutorials
// and /questions are the site's main tabs, so that one `q` param meant every
// tab click paid for a server render (plus its auth + profile round trips)
// instead of being served straight from the CDN. Moving the query here lets
// those pages be prerendered while search keeps matching full article and
// lesson bodies, which no client-side filter could do without shipping every
// body to the browser.
//
// Responses are identifiers only: the listing pages already hold the full
// items, so the browser just reorders what it has.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("in");
  const q = (searchParams.get("q") || "").trim();

  if (!q) return NextResponse.json({ slugs: [], lessons: [], ids: [] });

  switch (scope) {
    case "articles":
      return NextResponse.json({ slugs: searchArticles(q).map((a) => a.slug) });

    case "lessons":
      // Lessons are returned whole: unlike articles, the tutorials page holds
      // tracks rather than lessons, so it has nothing to match ids against.
      return NextResponse.json({ lessons: searchLessons(q) });

    case "questions":
      return NextResponse.json({
        ids: (await getPublicQuestions({ search: q })).map((question) => question.id),
      });

    default:
      return NextResponse.json({ error: "unknown search scope" }, { status: 400 });
  }
}
