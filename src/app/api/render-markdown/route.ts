import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/markdown";

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

  const { html } = await renderMarkdown(body);
  return NextResponse.json({ html });
}
