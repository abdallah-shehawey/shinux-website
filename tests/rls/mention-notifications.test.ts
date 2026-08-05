import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { extractMentions } from "../../src/lib/mentions";

// ------------------------------------------------------------------------------
// Who gets notified about what — the contract in
// supabase/migrations/0018_mentions_and_thread_notifications.sql.
//
// An INTEGRATION test, like tests/rls/anonymous-question.test.ts: triggers can't
// be mocked, so it runs against the real project. Every account it creates is a
// throwaway, and it deliberately never publishes a question — approving one
// broadcasts to EVERY profile, which on a live project means notifying (and
// emailing) real members.
// ------------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const admin: SupabaseClient | null = hasCredentials
  ? createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// 0018 is applied by hand in the Supabase SQL Editor (no CLI in this
// environment), so the suite has to cope with running before that happened —
// and say why it skipped rather than quietly passing.
async function migrationApplied(): Promise<boolean> {
  if (!admin) return false;
  const { error } = await admin.rpc("extract_mentions", { body: "@someone" });
  if (error) {
    console.warn(
      "\n[mention-notifications] SKIPPED — supabase/migrations/" +
        "0018_mentions_and_thread_notifications.sql is not applied to this project yet.\n",
    );
    return false;
  }
  return true;
}

const ready = await migrationApplied();

describe.skipIf(!ready)("mention & thread notifications", () => {
  const db = admin!;
  const stamp = Date.now();

  // asker / answerer / bystander — named for the role each plays below.
  const people: Record<"asker" | "answerer" | "bystander", { id: string; handle: string }> = {
    asker: { id: "", handle: `mt-asker-${stamp}`.slice(0, 30) },
    answerer: { id: "", handle: `mt-answerer-${stamp}`.slice(0, 30) },
    bystander: { id: "", handle: `mt-bystander-${stamp}`.slice(0, 30) },
  };

  let questionId = "";
  let answerId = "";
  let bystanderAnswerId = "";

  /** Notification types a person received, for the ids created by this test. */
  async function typesFor(userId: string): Promise<string[]> {
    const { data } = await db
      .from("notifications")
      .select("type, payload")
      .eq("user_id", userId);
    return (data ?? [])
      .filter((n) => (n.payload as { question_id?: string }).question_id === questionId)
      .map((n) => n.type as string);
  }

  beforeAll(async () => {
    for (const person of Object.values(people)) {
      const { data, error } = await db.auth.admin.createUser({
        email: `${person.handle}@example.com`,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
      person.id = data.user.id;
      // The auth trigger seeds a profile; give it the handle this test mentions.
      const { error: renameError } = await db
        .from("profiles")
        .update({ username: person.handle, display_name: person.handle })
        .eq("id", person.id);
      if (renameError) throw new Error(`profile rename failed: ${renameError.message}`);
    }

    // Inserted already-published (service_role is exempt from the 0016 guard).
    // Going through 'pending' -> 'published' instead would fire the broadcast.
    const { data: question, error } = await db
      .from("questions")
      .insert({
        author_id: people.asker.id,
        title: "Mention notification test",
        body: "Body with no mentions.",
        status: "published",
        slug: `mention-test-${stamp}`,
      })
      .select("id")
      .single();
    if (error || !question) throw new Error(`question insert failed: ${error?.message}`);
    questionId = question.id;
  });

  afterAll(async () => {
    if (questionId) await db.from("questions").delete().eq("id", questionId);
    for (const person of Object.values(people)) {
      if (person.id) {
        await db.from("notifications").delete().eq("user_id", person.id);
        await db.auth.admin.deleteUser(person.id);
      }
    }
  });

  it("parses handles in Postgres exactly like the TypeScript side does", async () => {
    const body = [
      "hi @alpha-one and @beta_two",
      "not a mention: someone@example.com, @@doubled, https://x.dev/@handle",
      "`@in-code` is still text to the parser, the renderer skips code nodes",
    ].join("\n");

    const { data, error } = await db.rpc("extract_mentions", { body });
    expect(error).toBeNull();
    expect([...(data as string[])].sort()).toEqual(extractMentions(body).sort());
  });

  it("notifies the asker, and mentions win over the generic notice", async () => {
    const { data: answer, error } = await db
      .from("answers")
      .insert({
        question_id: questionId,
        author_id: people.answerer.id,
        body: `Try this, @${people.bystander.handle}`,
      })
      .select("id")
      .single();
    if (error || !answer) throw new Error(`answer insert failed: ${error?.message}`);
    answerId = answer.id;

    expect(await typesFor(people.asker.id)).toEqual(["question_answered"]);
    expect(await typesFor(people.bystander.id)).toEqual(["mention"]);
    expect(await typesFor(people.answerer.id)).toEqual([]); // never yourself
  });

  it("tells everyone already answering that another answer landed", async () => {
    const { data: answer, error } = await db
      .from("answers")
      .insert({
        question_id: questionId,
        author_id: people.bystander.id,
        body: "A second answer, mentioning nobody.",
      })
      .select("id")
      .single();
    if (error || !answer) throw new Error(`answer insert failed: ${error?.message}`);
    bystanderAnswerId = answer.id;

    expect(await typesFor(people.answerer.id)).toEqual(["thread_answer"]);
    expect((await typesFor(people.asker.id)).sort()).toEqual([
      "question_answered",
      "question_answered",
    ]);
  });

  it("notifies the answer's author on a reply, and anyone named in it", async () => {
    const { error } = await db.from("answer_replies").insert({
      answer_id: answerId,
      author_id: people.asker.id,
      body: `Thanks! @${people.bystander.handle} does this work for you too?`,
    });
    expect(error).toBeNull();

    expect((await typesFor(people.answerer.id)).sort()).toEqual([
      "answer_reply",
      "thread_answer",
    ]);
    // Mentioned again — and still exactly one notification for this reply.
    expect((await typesFor(people.bystander.id)).sort()).toEqual(["mention", "mention"]);
  });

  it("tells earlier repliers that the conversation continued", async () => {
    const { error } = await db.from("answer_replies").insert({
      answer_id: answerId,
      author_id: people.bystander.id,
      body: "Yes, worked here.",
    });
    expect(error).toBeNull();

    // The asker replied under this answer earlier, so they hear about this one.
    expect((await typesFor(people.asker.id)).sort()).toEqual([
      "question_answered",
      "question_answered",
      "thread_reply",
    ]);
  });

  it("only pings handles an edit newly added", async () => {
    // The edit names someone the previous body did not → one mention.
    await db
      .from("answers")
      .update({ body: `Edited: @${people.answerer.handle}` })
      .eq("id", bystanderAnswerId);
    expect((await typesFor(people.answerer.id)).filter((t) => t === "mention")).toHaveLength(1);

    // Re-saving with the same handle in it → still one. A typo fix must not
    // re-notify everyone the answer already named.
    await db
      .from("answers")
      .update({ body: `Edited again: @${people.answerer.handle}` })
      .eq("id", bystanderAnswerId);
    expect((await typesFor(people.answerer.id)).filter((t) => t === "mention")).toHaveLength(1);
  });
});
