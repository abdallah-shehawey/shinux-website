# خطة تنفيذ موقع لينكس الشخصي (مدونة + Q&A)

> هذا الملف هو المرجع الرئيسي للمشروع (Spec). اتبعه بالترتيب المذكور في قسم "مراحل التنفيذ".
> اللغة الأساسية للواجهة: العربية (RTL) مع دعم كامل للإنجليزية (LTR).

---

## 1. فكرة المشروع باختصار

مدونة شخصية عن لينكس تحتوي على:

1. **مقالات** بالعربية والإنجليزية يكتبها صاحب الموقع فقط (توزيعات، حلول مشاكل، شروحات أوامر).
2. **قسم أسئلة وأجوبة (Q&A)**: أرشيف أسئلة موجودة مسبقاً + إمكانية أن يسأل أي مستخدم مسجّل سؤالاً جديداً، ويجيب عليه صاحب الموقع.
3. **نظام السؤال المجهول**: المستخدم يسجّل دخول، ويمكنه اختيار أن يظهر سؤاله للعامة كـ"مجهول"، مع بقاء هويته الحقيقية مرئية للأدمن فقط، ومرئية له هو في صفحة حسابه معلّمة بأنها مجهولة.
4. **لوحة تحكم أدمن** لمراجعة الأسئلة والإجابة عليها.

---

## 2. الـ Tech Stack (قرار نهائي)

| الطبقة | الاختيار | السبب |
|---|---|---|
| Framework | **Next.js 14+ (App Router, TypeScript)** | SSR للـ SEO، دعم i18n ممتاز |
| Database + Auth | **Supabase** (Postgres + Auth + RLS) | Auth جاهز مع GitHub/Google OAuth، وRow Level Security لفرض منطق "المجهول" على مستوى قاعدة البيانات نفسها |
| Styling | **Tailwind CSS** بـ logical properties (`ms-`, `me-`, `ps-`, `pe-`) | دعم RTL/LTR معاً بدون ملفين CSS |
| المقالات | ملفات **Markdown عادية (`.md`) أو MDX (`.mdx`)** داخل الريبو (`/content/articles/{ar,en}/`) — النظام يقرأ الامتدادين | الكاتب هو صاحب الموقع فقط، يكتب Markdown عادي بأي محرر (vim, VS Code...) ويعمل commit، والمراجعة بـ Git |
| Syntax Highlighting | **Shiki** (theme: `one-dark-pro` أو `catppuccin`) | جودة عالية لأوامر الطرفية والأكواد |
| البحث | Postgres Full-Text Search للأسئلة + بحث client-side للمقالات (فهرس JSON يُولَّد وقت الـ build) | بدون خدمات خارجية |
| Deployment | **Vercel + Supabase Cloud** أولاً، وملف docker-compose لاحقاً للـ self-hosting | البدء بالأسهل |

**قاعدة عامة:** أي عملية قراءة/كتابة حساسة تتم عبر Server Components / Route Handlers وليس من المتصفح مباشرة، حتى مع وجود RLS.

---

## 3. تصميم قاعدة البيانات (Supabase / Postgres)

```sql
-- امتداد لجدول auth.users الخاص بـ Supabase
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  title text not null,
  body text not null,
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  is_anonymous boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'published', 'answered', 'rejected')),
  slug text unique,           -- يُولَّد عند النشر
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null references public.profiles(id), -- الأدمن
  body text not null,
  is_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,          -- 'question_answered', 'question_published', ...
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- زرار "نفس السؤال عندي"
create table public.question_upvotes (
  question_id uuid references public.questions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (question_id, user_id)
);
```

### الـ View العامة (جوهر منطق المجهول)

**قاعدة ذهبية: العامة لا يصلهم `author_id` إطلاقاً لو السؤال مجهول.** الإخفاء يتم في قاعدة البيانات، وليس في الواجهة.

```sql
create view public.questions_public
with (security_invoker = off) as
select
  q.id, q.title, q.body, q.locale, q.status, q.slug, q.tags, q.created_at,
  q.is_anonymous,
  case when q.is_anonymous then null else q.author_id end as author_id,
  case when q.is_anonymous then 'مستخدم مجهول' else p.display_name end as author_display,
  case when q.is_anonymous then null else p.avatar_url end as author_avatar
from public.questions q
join public.profiles p on p.id = q.author_id
where q.status in ('published', 'answered');
```

### سياسات RLS (ملخص المطلوب)

- `questions`: تفعيل RLS.
  - **select**: الأدمن يرى كل شيء. المستخدم يرى أسئلته هو فقط (`author_id = auth.uid()`). العامة تقرأ من الـ view فقط، وليس من الجدول مباشرة.
  - **insert**: أي مستخدم مسجّل، مع فرض `author_id = auth.uid()`.
  - **update/delete**: الأدمن فقط (المستخدم يمكنه حذف سؤاله طالما `status = 'pending'`).
- `answers`: قراءة عامة للأسئلة المنشورة، كتابة للأدمن فقط.
- `profiles`: كل مستخدم يعدّل ملفه فقط؛ حقل `role` لا يُعدَّل إلا يدوياً من الأدمن/SQL.
- `notifications`: كل مستخدم يقرأ ويحدّث إشعاراته فقط.

### اختبار إلزامي بعد التنفيذ

اكتب اختباراً يتأكد أن استعلام العامة لسؤال مجهول **لا يحتوي** على `author_id` أو أي حقل يكشف الهوية في الـ JSON الراجع من الـ API. هذا الاختبار يجب أن ينجح قبل اعتبار الميزة مكتملة.

---

## 4. الصفحات والمسارات (Routes)

```
/                         الرئيسية: أحدث المقالات + أحدث الأسئلة المجابة
/articles                 قائمة المقالات مع فلتر لغة (ar/en) وفلتر تصنيفات
/articles/[slug]          صفحة المقال (MDX)
/questions                أرشيف الأسئلة المنشورة + بحث + فلاتر
/questions/[slug]         صفحة السؤال + الإجابات
/ask                      نموذج طرح سؤال (يتطلب تسجيل دخول)
/login                    تسجيل الدخول (GitHub + Google + Email)
/me                       حساب المستخدم: أسئلته (مع badge "مجهول") + إشعاراته
/about                    صفحة تعريفية عنك أنت: نبذة + روابطك (GitHub وغيرها)
/admin                    لوحة الأدمن (محمية بـ role = 'admin' على السيرفر)
/admin/questions          مراجعة الأسئلة الجديدة: نشر / رفض / إجابة — مع إظهار الهوية الحقيقية دائماً
/rss.xml                  خلاصة RSS للمقالات والأسئلة المجابة
/sitemap.xml + robots.txt
```

### مواصفات ملف المقال (Frontmatter)

كل مقال ملف `.md` أو `.mdx` يبدأ بـ frontmatter بهذا الشكل، والنظام يتعامل معه:

```yaml
---
title: "حل مشكلة الصوت في Arch Linux"
description: "ملخص قصير يظهر في القوائم ونتائج البحث"
date: 2026-07-17
tags: [arch, audio, pipewire]
locale: ar            # ar أو en
draft: false          # true = لا يظهر في الموقع المنشور
cover: /images/audio-fix.png   # اختياري
---
```

- المقالات ذات `draft: true` تظهر في وضع التطوير فقط ولا تُبنى في الإنتاج.
- الـ slug يُشتق من اسم الملف تلقائياً.
- تُعرض في صفحة المقال: تاريخ النشر + **وقت القراءة المحسوب تلقائياً** + التصنيفات، وفي آخر المقال روابط "المقال السابق / التالي" و"مقالات ذات صلة" (حسب تطابق التصنيفات).

### سلوك نموذج "اسأل سؤال" (/ask)

1. غير المسجّل يُوجَّه لـ `/login` مع العودة بعدها لـ `/ask`.
2. الحقول: العنوان، التفاصيل (textarea مع معاينة Markdown)، اللغة، التصنيفات، وcheckbox: **"انشر سؤالي كمجهول"**.
3. تحت الـ checkbox نص توضيحي ثابت إلزامي: *"لن يظهر اسمك للزوار، لكن إدارة الموقع تستطيع معرفة صاحب السؤال."*
4. بعد الإرسال: `status = 'pending'` ورسالة "سؤالك قيد المراجعة".
5. عند نشر الأدمن أو إجابته: إشعار لصاحب السؤال.

### صفحة /me

- المستخدم يرى كل أسئلته بأي حالة، وكل سؤال مجهول عليه badge واضح: 🕶️ "منشور كمجهول".

---

## 5. اللغتان و RTL/LTR

- مكتبة **next-intl** مع مسارات `/(ar|en)/...` — العربية هي الافتراضية.
- `<html lang dir>` يتغيّران حسب اللغة. المقال الإنجليزي يعرض LTR حتى داخل الواجهة العربية.
- كل الـ spacing بـ logical properties (`ms/me/ps/pe`) وليس (`ml/mr/pl/pr`).
- الخطوط: **IBM Plex Sans Arabic** للعربية، **Inter** للإنجليزية، **JetBrains Mono** للأكواد.
- بلوكات الكود دائماً `dir="ltr"` بغض النظر عن لغة الصفحة، مع زر نسخ (Copy).

## 6. هوية التصميم

- **Dark mode هو الافتراضي** مع مفتاح تبديل، والتفضيل يُحفظ في cookie لتجنب الـ flash.
- مظهر مستوحى من الطرفية بدون مبالغة: خلفية داكنة هادئة، لون تمييز واحد (أخضر terminal أو أزرق)، بدون زخارف زائدة.
- لمسات اختيارية: prompt شكل `$` في مربع البحث، وASCII art صغير في الـ footer.
- الأداء أولوية: JS خفيف والموقع سريع على أي جهاز.

## 7. الـ SEO

- Metadata ديناميكية لكل مقال وسؤال (title, description, OpenGraph, `og:locale`).
- Structured Data: `Article` للمقالات و `QAPage` للأسئلة المجابة (يحسّن الظهور في جوجل بشكل ملحوظ).
- توليد صور OG تلقائياً بـ `@vercel/og`.

---

## 8. مراحل التنفيذ (نفّذها بالترتيب، مرحلة واحدة في كل جلسة)

### المرحلة 1 — الأساس
مشروع Next.js + TypeScript + Tailwind، إعداد next-intl والـ RTL، الـ Layout العام (Header/Footer)، dark/light mode بدون flash، الخطوط. **معيار النجاح:** صفحة رئيسية تعمل بالعربية RTL والإنجليزية LTR مع تبديل الثيم.

### المرحلة 2 — المدونة
نظام قراءة المقالات من `/content/articles/{ar,en}/` بالامتدادين `.md` و`.mdx` مع الـ frontmatter الموصوف في القسم 4، صفحة القائمة مع الفلاتر، صفحة المقال (Shiki + زر نسخ الكود + جدول محتويات + وقت القراءة + السابق/التالي + مقالات ذات صلة)، دعم `draft`, صفحة `/about`، وRSS. أضف 2-3 مقالات تجريبية بالعربية والإنجليزية. **معيار النجاح:** مقال `.md` عادي بدون أي JSX ينعرض صح، ومقال عربي فيه بلوك كود ينعرض صح (النص RTL والكود LTR).

### المرحلة 3 — Supabase والمصادقة
إعداد مشروع Supabase، تنفيذ الـ schema والـ view وسياسات RLS من القسم 3 كاملة كملف migration، تسجيل الدخول بـ GitHub وGoogle وEmail، إنشاء profile تلقائياً عند أول تسجيل (trigger)، وصفحة `/me` الأساسية.

### المرحلة 4 — نظام الأسئلة
نموذج `/ask` بكل سلوكه الموصوف، صفحات `/questions` و`/questions/[slug]`، منطق المجهول عبر الـ view، البحث والفلاتر، وزر "نفس السؤال عندي". **معيار النجاح:** الاختبار الإلزامي في القسم 3 ينجح.

### المرحلة 5 — لوحة الأدمن والإشعارات
لوحة `/admin/questions` (نشر/رفض/إجابة مع إظهار الهوية الحقيقية)، محرر إجابات بـ Markdown، نظام الإشعارات، وحماية كل مسارات وAPIs الأدمن بالتحقق من `role` على السيرفر.

### المرحلة 6 — التلميع والإطلاق
الـ SEO كاملاً (Structured Data + OG images + sitemap)، صفحات 404/الخطأ، rate limiting على إنشاء الأسئلة (5 أسئلة/ساعة/مستخدم)، إحصائيات زوار **محترمة للخصوصية** (Vercel Analytics أو Umami — بدون Google Analytics، جمهور لينكس حساس لهذه النقطة ويستخدم adblockers)، فحص Lighthouse (الهدف 90+)، مراجعة أمان أخيرة بقائمة القسم 9، ثم النشر على Vercel وربط الدومين حسب دليل القسم 11.

---

## 9. ملاحظات أمان إلزامية

1. لا يُبنى أي استعلام عام على جدول `questions` مباشرة — الـ view فقط.
2. التحقق من صلاحية الأدمن يتم على السيرفر في كل route handler، وليس بإخفاء الأزرار فقط.
3. تعقيم (sanitize) أي Markdown قادم من المستخدمين قبل عرضه (**rehype-sanitize**) — لا HTML خام ولا iframes.
4. مفاتيح Supabase الـ service role لا تُستخدم إلا في السيرفر ولا تظهر في أي كود client.
5. الأسئلة المرفوضة تبقى محفوظة (soft delete) ولا تُحذف نهائياً.

---

## 10. تعليمات إضافية لمنفّذ المشروع (Claude Code)

1. **بعد إنهاء كل مرحلة**، حدّث ملف `SETUP.md` في جذر المشروع: ملف بالعربية موجّه لصاحب الموقع (خلفيته البرمجية بسيطة) فيه بالتفصيل أي خطوات يدوية مطلوبة منه هو — أي حساب يعمله، أي رابط يفتحه، أي مفتاح ينسخه ويحطه فين بالظبط، وكيف يشغّل المشروع محلياً (`npm install`, `npm run dev`). لا تفترض معرفة مسبقة.
2. أنشئ ملف `.env.example` فيه كل متغيرات البيئة المطلوبة مع تعليق يشرح كل واحد ومن أين يُجلب.
3. في نهاية كل مرحلة، اذكر لصاحب الموقع باختصار: ما الذي تم، وكيف يجرّبه بنفسه، وما الخطوات اليدوية المطلوبة منه (إن وُجدت) قبل المرحلة التالية.
4. وثّق في `README.md` كيفية إضافة مقال جديد (مكان الملف + الـ frontmatter) بحيث يستطيع صاحب الموقع النشر بنفسه بدون مساعدة.

---

## 11. دليل الإعداد: خطوات يقوم بها صاحب الموقع بنفسه

> هذه الخطوات لا يستطيع الـ AI عملها نيابةً عنك لأنها حسابات ومفاتيح خاصة بك. نفّذها عندما تطلبها منك كل مرحلة، وسيكون التفصيل الدقيق دائماً في `SETUP.md`.

**قبل البدء (مرة واحدة):**
1. تأكد أن عندك **Node.js 20+** و **git** على جهازك، وحساب على **GitHub**.
2. أنشئ ريبو جديد على GitHub للمشروع (يمكن أن يكون private).

**عند المرحلة 3 (Supabase):**
3. ادخل **supabase.com** → سجّل بحساب GitHub → **New Project** (اختر أقرب region مثل Frankfurt) → احفظ كلمة سر قاعدة البيانات في مكان آمن.
4. من **Project Settings → API** انسخ ثلاث قيم: `Project URL` و `anon public key` و `service_role key`، وضعها في ملف `.env.local` حسب `.env.example` (ملف `.env.local` لا يُرفع على GitHub أبداً).
5. **تفعيل دخول GitHub:** في Supabase افتح **Authentication → Providers → GitHub** وانسخ الـ Callback URL الظاهر. ثم اذهب لـ **github.com → Settings → Developer settings → OAuth Apps → New OAuth App**، الصق الـ Callback URL، وخذ الـ `Client ID` و`Client Secret` وارجع ضعهما في صفحة GitHub Provider في Supabase وفعّله.
6. **تفعيل دخول Google:** ادخل **console.cloud.google.com** → مشروع جديد → **APIs & Services → OAuth consent screen** (External) → ثم **Credentials → Create Credentials → OAuth client ID → Web application**، وضع نفس الـ Callback URL من Supabase في Authorized redirect URIs، وانسخ الـ Client ID والـ Secret إلى صفحة Google Provider في Supabase.
7. **اجعل حسابك أدمن:** بعد أول تسجيل دخول لك في الموقع، افتح **SQL Editor** في Supabase ونفّذ:
   `update public.profiles set role = 'admin' where username = 'اسم_المستخدم_بتاعك';`

**عند المرحلة 6 (النشر):**
8. ادخل **vercel.com** → سجّل بحساب GitHub → **Add New Project** → اختر الريبو → قبل الضغط على Deploy أضف نفس متغيرات البيئة من `.env.local` في خانة Environment Variables → Deploy.
9. **الدومين:** اشترِ دومين (Cloudflare Registrar أو Namecheap) → في Vercel: **Project Settings → Domains** → أضف الدومين واتبع تعليمات DNS الظاهرة.
10. ارجع لـ Supabase: **Authentication → URL Configuration** وغيّر الـ Site URL لدومينك النهائي (وإلا ستتعطل روابط تسجيل الدخول)، وحدّث Callback URLs في GitHub وGoogle OAuth لو لزم.
11. فعّل **Vercel Analytics** من تبويب Analytics في مشروعك على Vercel (ضغطة زر).

**بعد الإطلاق (صيانة دورية):**
- إضافة مقال جديد = ملف `.md` جديد في `/content/articles/` + `git push`، وVercel ينشر تلقائياً.
- افحص `/admin/questions` دورياً للأسئلة الجديدة.
- الخطة المجانية في Supabase **توقف المشروع مؤقتاً بعد أسبوع بدون نشاط** — الدخول للموقع واستخدامه يكفي لإبقائه نشطاً، ولو كبر الموقع فكّر في خطة Pro.

---

## 12. توسعات مستقبلية (لا تُنفَّذ الآن — لكن لا تتخذ قرارات تمنعها لاحقاً)

قد يتحول الموقع مستقبلاً لمنصة مجتمع كاملة: مقالات يكتبها الأعضاء بمراجعة الأدمن، وبروفايلات عامة `/u/[username]` بروابط اجتماعية. أفكار أخرى واردة: تعليقات على المقالات عبر **giscus** (تعتمد GitHub Discussions — مناسبة جداً لجمهور لينكس وبدون قاعدة بيانات إضافية)، ونشرة بريدية. لذلك:

- اجعل pipeline رندر الـ Markdown (Shiki + sanitize + جدول المحتويات) **موديول مستقلاً قابلاً لإعادة الاستخدام**، حتى يعمل مستقبلاً مع محتوى من قاعدة البيانات وليس ملفات فقط.
- مكوّن "كارت الكاتب" في صفحة المقال اجعله مكوناً عاماً يستقبل بيانات الكاتب كـ props.
- لا تربط منطق عرض المقالات بافتراض أن الكاتب واحد دائماً.