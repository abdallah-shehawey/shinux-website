// One-off / re-runnable seed script: publishes the owner's recurring-question
// FAQ notes (drafted before Phase 4 existed) as real, already-answered
// questions tagged "faq", authored by the admin account. Idempotent — skips
// any title whose slug already exists, so it's safe to run again later if
// more FAQ items are added to the list below.
//
// Usage: node scripts/seed-faq.mjs   (needs .env.local with SUPABASE_SERVICE_ROLE_KEY)

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

function slugify(input) {
  const base = input
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "question";
}

const FAQ_ITEMS = [
  {
    title: "هل ينفع أسطب لينكس جنب ويندوز؟",
    answer: "أيوه ينفع عادي جدًا.",
  },
  {
    title: "إزاي أسطب لينكس جنب ويندوز؟",
    answer:
      "في حاجة اسمها Dual Boot. بتعمل بارتشن لكل نظام تشغيل، ولما تفتح الجهاز هيظهرلك حاجة اسمها GRUB تختار منها النظام اللي عايز تفتحه. وممكن تسطب أكتر من نظام تشغيل عادي جدًا، ومفيش حد هيمنعك. وفيه توتوريال كتير جدًا على يوتيوب تشرح الخطوات بالتفصيل.",
  },
  {
    title: "طب إيه التوزيعة المناسبة ليا كمبتدئ لسه؟",
    answer: "أشهر 3 توزيعات مناسبة للمبتدئين: Ubuntu، Linux Mint، Zorin OS. كلهم مناسبين جدًا كبداية.",
  },
  {
    title: "طب كده أنا احترت أكتر... أنزل إيه؟",
    answer:
      "ممكن تدخل على موقع DistroSea وتجرب التوزيعات من المتصفح قبل ما تنزلها وتشوف أنهي واحدة ترتاح معاها أكتر، وبعدها نزّلها.",
  },
  {
    title: "هل أقدر أشوف ملفات ويندوز وأنا فاتح لينكس؟",
    answer:
      "أيوه. كل الـ Partitions بتكون متاحة للقراءة من لينكس. لكن العكس مش بيحصل لأن ويندوز مش بيدعم قراءة ext4 filesystem ومش هتقدر تشوف البارتشن اللي متسطب عليه لينكس.",
  },
  {
    title:
      "عجبني الـ GUI بتاع Ubuntu بس سمعت إن فيه توزيعات أحسن، ينفع آخد نفس الواجهة وأحطها على توزيعة تانية؟",
    answer:
      "أيوه ينفع لأن اللي بيحدد شكل النظام هو Desktop Environment مش التوزيعة نفسها. من أشهر الواجهات: GNOME، KDE، XFCE، Cinnamon. وممكن تثبت أكتر من واجهة على نفس التوزيعة وتختار بينهم في الـ login screen.",
  },
  {
    title: "أذاكر لينكس منين عشان اعرف استخدمه؟",
    answer:
      "لو هتستخدمه كيوزر عادي، مش محتاج تذاكر حاجة كبيرة، استخدم الـ GUI عادي زي ويندوز. لكن لو عايز تتعلمه بجد كـ System Administrator، يبدأ بفيديو \"البطريق العضاض\" للمهندس أحمد سامي على قناة Big Data بالعربي. لينكس عالم كبير ومفيش كورس واحد بيغطيه كله.",
  },
  {
    title:
      "سطبت fedora وفيه برامج مش موجودة في مستودعاتها بس موجودة في مستودعات arch، وعايز أعمل ايه من غير ما اغير التوزيعة؟",
    answer:
      "استخدم distrobox ونزّل التوزيعة اللي عايزها كـ container ونزّل منها البرنامج، وهيشتغل بنفس الكفاءة اكنك مسطبها من توزيعتك عادي.",
  },
  {
    title: "ذاكرت Ubuntu وعايز أروح لتوزيعة تانية، هل هحتاج أذاكر التوزيعة الجديدة من الأول؟",
    answer:
      "لأ. لينكس في الأساس Kernel واحد وكل التوزيعات مبنية عليه، فمعظم الأوامر بتكون نفسها. الاختلاف الأساسي بيكون في الـ Package Manager وبعض الأدوات/المسميات الخاصة بالتوزيعة.",
  },
  {
    title: "إيه أفضل توزيعة للـ Gaming؟",
    answer:
      "حسب اتفاق أغلب مجتمع لينكس: CachyOS و Nobara (Nobara بيطورها نفس الشخص اللي بيطور نواة proton). ده كلام نظري لأن الكاتب مجربهمش بنفسه.",
  },
  {
    title: "نصيحة أخيرة قبل ما تحول لينكس بالكامل",
    answer:
      "لو هدفك الأساسي إنك تروح لينكس ومعاك كل برامج ويندوز اللي عندك، خليك في ويندوز أحسن لأن مش كل البرامج موجودة وهتعتمد أكتر على الـ open source. لكن كـ developer هتلاقي معظم الـ tools المطلوبة لمعظم التراكات موجودة.",
  },
];

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminProfile, error: adminError } = await admin
    .from("profiles")
    .select("id, username")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (adminError || !adminProfile) {
    console.error("Could not find an admin profile — self-promote first (see SETUP.md).", adminError);
    process.exit(1);
  }

  console.log(`Seeding FAQ as admin @${adminProfile.username} (${adminProfile.id})`);

  for (const item of FAQ_ITEMS) {
    const slug = slugify(item.title);

    const { data: existing } = await admin
      .from("questions")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      console.log(`skip  (already exists): ${item.title}`);
      continue;
    }

    const { data: question, error: questionError } = await admin
      .from("questions")
      .insert({
        author_id: adminProfile.id,
        title: item.title,
        body: item.title,
        locale: "ar",
        is_anonymous: false,
        status: "published",
        slug,
        tags: ["faq"],
      })
      .select("id")
      .single();

    if (questionError || !question) {
      console.error(`FAILED (question): ${item.title}`, questionError);
      continue;
    }

    const { error: answerError } = await admin.from("answers").insert({
      question_id: question.id,
      author_id: adminProfile.id,
      body: item.answer,
    });

    if (answerError) {
      console.error(`FAILED (answer): ${item.title}`, answerError);
      continue;
    }

    console.log(`added : ${item.title}`);
  }

  console.log("Done.");
}

main();
