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
      "في حاجة اسمها Dual Boot.\nبتعمل بارتشن لكل نظام تشغيل، ولما تفتح الجهاز هيظهرلك حاجة اسمها GRUB تختار منها النظام اللي عايز تفتحه.\nوممكن تسطب أكتر من نظام تشغيل عادي جدًا، ومفيش حد هيمنعك 😄\nوفيه توتوريال كتير جدًا على يوتيوب تشرح الخطوات بالتفصيل، لدرجة إنك ممكن تلاقي حد عامل الشرح على نفس اللاب بتاعك.",
  },
  {
    title: "طب إيه التوزيعة المناسبة ليا كمبتدئ لسه؟",
    answer:
      "أشهر 3 توزيعات مناسبة للمبتدئين:\n• Ubuntu\n• Linux Mint\n• Zorin OS\nكلهم مناسبين جدًا كبداية.",
  },
  {
    title: "طب كده أنا احتارت أكتر... أنزل إيه؟",
    answer:
      "ممكن تدخل على موقع DistroSea (عملتله بوست) وتجرب التوزيعات من المتصفح قبل ما تنزلها وتشوف أنهي واحدة ترتاح معاها أكتر، وبعدها نزّلها.",
  },
  {
    title: "هل أقدر أشوف ملفات ويندوز وأنا فاتح لينكس؟",
    answer:
      "أيوه.\nكل الـ Partitions بتكون متاحة للقراءة من لينكس، وهتقدر تفتح ملفات ويندوز عادي حتى الملفات اللي على C هتقدر تشوفها من لينكس.\nلكن العكس مش بيحصل لأن ويندوز مش بيدعم قراءة ext4 filesystem (وهو النظام اللي لينكس بيستخدمه غالبًا) ومش هتقدر تشوف البارتشن اللي متسطب عليه لينكس اللي هو زي ال C في الـ windows .",
  },
  {
    title:
      "أنا عجبني ال GUI بتاع Ubuntu، بس سمعت إن فيه توزيعات أحسن ينفع آخد نفس الواجهة وأحطها على توزيعة تانية عشان مش عايز انقل بسبب الواجهه مش عايز اغيرها؟",
    answer:
      "أيوه ينفع لان اللي بيحدد شكل النظام هو Desktop Environment مش التوزيعة نفسها ومن أشهر الواجهات:\n• GNOME\n• KDE\n• XFCE\n• Cinnamon\nوممكن تثبت أكتر من واجهة على نفس التوزيعة، وتختار بينهم في ال login screen.",
  },
  {
    title: "أذاكر لينكس منين عشان اعرف استخدمه ؟",
    answer:
      "لو هتستخدمه كيوزر عادي فأنت مش محتاج تذاكر حاجة كبيرة، استخدم الـGUI عادي جدًا زي ويندوز .\nلكن لو عايز تتعلمه بجد وتفهمه كـ System Administrator فمحتاج تذاكر شوية حلوين وأرشحلك تبدأ بفيديو :\n\"البطريق العضاض\" للمهندس أحمد سامي على قناة Big Data بالعربي وهتسمعله اكنك بتسمع لقصه قبل النوم لان الفيديو ممتع وشرح الباشمهندس ممتع اكتر (ادعوله ربنا يهديه ويرده للإسلام ردًا جميلًا ويثبته على الحق).\nولو حبيت تتعمق أكتر بعد كده هتلاقي مصادر كتير جدًا وهتسمع بقي عشوائي من كل حته لأن لينكس عالم كبير ومش بيخلص وعمرك ما تلاقي كورس بيشرح لينكس كده كـ package كله علي بعضه لان حتى Linus Torvalds نفسه (اللي عمل لينكس لو متعرفهوش) مستحيل يكون عارف كل حاجة موجودة في الـ Kernel.",
  },
  {
    title:
      "طب انا سطبت fedora وفيه برامج مش موجوده في المستودعات بتاعتها بس موجوده في مستودعات arch مثلا ومش عايز اغير عشان السبب دا اعمل ايه؟",
    answer:
      "هتستخدم distrobox وتنزل التوزيعه اللي انت عايزها ك container وتنزل منها البرنامج اللي انت عايزه ومتقلقش هتشتغل بنفس الكفائه اكنك مسطبها من توزيعتك عادي (عملتله بوست).",
  },
  {
    title:
      "ذاكرت Ubuntu وعايز أروح لتوزيعة تانية، هل هحتاج أذاكر التوزيعة الجديدة من الأول ؟",
    answer:
      "لا، مش هتحتاج تعمل كده.\nلينكس في الأساس عبارة عن Kernel واحد، وكل التوزيعات مبنية عليه، لذلك معظم الأوامر بتكون نفسها عادي لكن الاختلاف الأساسي بيكون في :\nالـ Package Manager اللي بتنزل منه البرامج و بعض الأدوات أو المسميات الخاصة بالتوزيعة .\nلكن الأساسيات هتكون نفسها.",
  },
  {
    title: "إيه أفضل توزيعة للـ Gaming؟",
    answer:
      "أنا شخصيًا مش مهتم بالـ Gaming فمدورتش ومبحبش أقول معلومة بناءً على كلام الناس من غير ما أجرب بنفسي .\nلكن حسب اتفاق أغلب community لينكس، التوزيعات المشهورة في ال Gaming حاليًا هي CachyOS و Nobara ( وللعلم Nobara اللي عاملها هو نفسه الشخص اللي بيطور في نواة proton المسؤولة عن تشغيل الالعاب علي لينكس ودي اللي جربتها وحاسسها كويسه)لكن ده كلام نظري بالنسبة لي لأني مجربتهمش بنفسي .",
  },
  {
    title: "نصيحة أخيرة لمن يريد الانتقال إلى لينكس",
    answer:
      "لو هدفك الاساسي تروح لينكس ومعاك كل برامج ويندوز اللي موجوده حاليا فخليك في ويندوز احسن لان مش كل البرامج موجوده وهتبدأ تعتمد علي البرامج ال open source اكتر بس كـ developer هتلاقي معظم ال tools المطلوبه لمعظم التراكات موجوده ان شاء الله .",
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
        body: "",
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
