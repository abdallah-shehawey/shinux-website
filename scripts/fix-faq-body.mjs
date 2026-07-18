// One-off repair script: scripts/seed-faq.mjs used to insert `body: item.title`,
// so every FAQ question it created shows its title twice on the detail page
// (once as the H1, once as the rendered body). Clears body back to "" for
// exactly the rows that bug affected. Safe to re-run — a no-op once fixed.
//
// Usage: node scripts/fix-faq-body.mjs   (needs .env.local with SUPABASE_SERVICE_ROLE_KEY)

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: affected, error: selectError } = await admin
    .from("questions")
    .select("id, title, body")
    .contains("tags", ["faq"]);

  if (selectError) {
    console.error("Select failed:", selectError);
    process.exit(1);
  }

  const toFix = (affected ?? []).filter((q) => q.body === q.title);

  if (toFix.length === 0) {
    console.log("Nothing to fix — no faq-tagged question has body === title.");
    return;
  }

  console.log(`Fixing ${toFix.length} question(s):`);
  for (const q of toFix) console.log(`  - ${q.title}`);

  for (const q of toFix) {
    const { error } = await admin.from("questions").update({ body: "" }).eq("id", q.id);
    if (error) console.error(`FAILED: ${q.title}`, error);
  }

  console.log("Done.");
}

main();
