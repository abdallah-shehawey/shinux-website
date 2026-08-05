import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/markdown";
import { resolveMentionHandles } from "@/lib/mention-lookup";

// Backs the Markdown preview tab on the ask/answer forms. Requires sign-in
// purely to bound abuse of the Shiki highlighting pipeline — it never touches
// the database.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body } = (await request.json().catch(() => ({}))) as { body?: unknown };
  if (typeof body !== "string" || body.length === 0 || body.length > 20_000) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Resolved here too, so the preview shows exactly which @handles will end up
  // as real links (and therefore who is actually going to be notified).
  const mentions = await resolveMentionHandles([body]);
  const { html } = await renderMarkdown(body, { mentions });
  return NextResponse.json({ html });
}
