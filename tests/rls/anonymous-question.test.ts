import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

// ------------------------------------------------------------------------------
// Mandatory test from Linux-site-spec.md §3:
//
//   "اكتب اختباراً يتأكد أن استعلام العامة لسؤال مجهول لا يحتوي على author_id
//    أو أي حقل يكشف الهوية في الـ JSON الراجع من الـ API."
//
// i.e. querying `questions_public` (as an anonymous/public client) for an
// anonymous question must never expose author_id, or any other field that
// could reveal who actually asked it. This must pass before Phase 4 (the
// questions feature) is considered done.
//
// This is an INTEGRATION test — it needs a real Supabase project with the
// migration in supabase/migrations/0001_init.sql already applied. It can't
// run until that manual step (documented in SETUP.md) has happened.
// ------------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

describe.skipIf(!hasCredentials)("questions_public anonymity", () => {
  const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let testUserId = "";
  let testQuestionId = "";
  const testEmail = `rls-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    // A throwaway auth user — the on_auth_user_created trigger auto-creates
    // its profiles row.
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
    });
    if (userError || !userData.user) {
      throw new Error(`Failed to create test user: ${userError?.message}`);
    }
    testUserId = userData.user.id;

    const { data: question, error: questionError } = await admin
      .from("questions")
      .insert({
        author_id: testUserId,
        title: "RLS test question",
        body: "This question exists only to verify the anonymous view.",
        is_anonymous: true,
        status: "published",
      })
      .select("id")
      .single();
    if (questionError || !question) {
      throw new Error(`Failed to create test question: ${questionError?.message}`);
    }
    testQuestionId = question.id;
  });

  afterAll(async () => {
    if (testQuestionId) await admin.from("questions").delete().eq("id", testQuestionId);
    if (testUserId) await admin.auth.admin.deleteUser(testUserId);
  });

  it("never exposes author_id or the real author's identity for an anonymous question", async () => {
    const { data, error } = await anon
      .from("questions_public")
      .select("*")
      .eq("id", testQuestionId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();

    // The core requirement: no identity leak in the JSON returned to the public.
    expect(data!.author_id).toBeNull();
    expect(data!.author_id).not.toBe(testUserId);
    expect(data!.author_avatar).toBeNull();
    expect(data!.author_display).toBe("Anonymous user");

    // Sanity check: the content itself is still visible.
    expect(data!.title).toBe("RLS test question");
  });

  it("hides the same question from a direct (non-view) query as anon", async () => {
    // The public must go through questions_public — the base table grants
    // anon no SELECT policy at all.
    const { data, error } = await anon.from("questions").select("*").eq("id", testQuestionId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
