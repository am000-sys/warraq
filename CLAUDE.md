# CLAUDE.md — دليل المشروع لـ Claude Code

> **اقرأ هذا الملفّ كاملاً قبل أيّ عمل.** إنّه الدليل المرجعيّ لكلّ الجلسات.

---

## ١. ما هو هذا المشروع؟

**وَرَّاق (Warraq)** — منصّة عربيّة احترافيّة لتحويل الكتب المصوَّرة (PDF) إلى نصّ رقميّ دقيق باستخدام Claude Vision API.

**التميّز:** تحفظ ترقيم الصفحات المطبوع داخل الصفحة (وليس ترقيماً متسلسلاً جديداً) — هذا حيوي للمحقّقين والباحثين الذين يحتاجون مرجعيّة دقيقة.

**الجمهور:** محقّقون، باحثون في الدراسات الإسلاميّة، مؤسّسات أرشفة، دور نشر عربيّة.

**الأسواق:** السعوديّة والخليج أوّلاً، ثمّ بقية العالم العربي.

---

## ٢. الحالة الراهنة

### ✅ جاهز ومكتمل
- **قاعدة البيانات** — مخطّط Prisma كامل بـ 14 جدول (`prisma/schema.prisma`)
- **نظام المصادقة** — Auth.js v5 (Email/Password + Google OAuth)
- **تكامل Claude Vision** — `src/lib/claude.ts` بـ 3 نماذج (Haiku/Sonnet/Opus)
- **بوّابتا دفع متكاملتان**:
  - Stripe (دوليّ + Apple Pay + Google Pay) — `src/lib/stripe.ts`
  - Tap Payments (مدى + Apple Pay سعودي + STC Pay) — `src/lib/tap.ts`
- **التخزين** — Cloudflare R2 (`src/lib/storage.ts`)
- **API Routes** كاملة في `src/app/api/`:
  - `auth/*` — تسجيل/دخول/استعادة
  - `jobs/*` — إنشاء/قائمة/معالجة/تصدير
  - `stripe/*` + `tap/*` — checkout + webhooks
  - `orgs/*` — مؤسسات + أعضاء + دعوات
  - `api-keys/*` — مفاتيح للمطوّرين
  - `v1/extract` — API عامّ للمطوّرين
  - `admin/*` — إحصائيات
- **النظام التصميمي** — `src/app/globals.css` + `tailwind.config.js` (مطابق لتصميم المستخدم)
- **شعار** — `src/components/logo.tsx` (مطابق للتصميم)

### 🚧 يحتاج إكمال (مهمّتك الأساسيّة)
1. **استبدال صفحات الواجهة الحاليّة بالتصميم النهائي** (انظر القسم ٤)
2. **حلّ معالجة PDF → صور** (انظر القسم ٧)
3. **اختبار محلّي وإصلاح أخطاء التشغيل**

---

## ٣. النظام التصميمي

**اقرأ أوّلاً:**
- `design-reference/warraq-v3.html` — التصميم المرجعي **النهائي** (1083 سطر، فيه كلّ الصفحات)
- `design-reference/warraq-tokens.css` — النظام التصميمي
- `design-reference/brand-assets/` — الشعار وهويّة العلامة
- `design-reference/screenshots/` — لقطات الشاشة

### الألوان (موجودة في `globals.css` كـ CSS variables)
```
--orange: #f69251     (اللون المميّز - الأزرار، الـ accents)
--carbon: #000000     (النصّ الأساسي)
--midnight: #181825   (للأزرار/الخلفيّات الداكنة)
--fog: #f7f7f7        (خلفيّة الصفحة الأساسيّة)
--snow: #ffffff       (البطاقات والأسطح)
--stone: #636363      (نصّ ثانوي)
--pebble: #949494     (نصّ خافت)
--border: #e8e8e8
```

### الخطوط
- **Tajawal** للعربيّة (300, 400, 500, 700)
- **Inter** للاتيني (400, 500, 600)

### الأشكال
- أزرار: `border-radius: 28px` (شكل دائري ممدّد)
- بطاقات: `border-radius: 24px`
- شارات: `border-radius: 100px`
- Nav bar: `border-radius: 32px` (يَطفو في الأعلى)

### الإيقاع البصري
- Padding: 24px أو 28px داخل البطاقات
- Gap: 8/12/16/24/32/48/64 (مضاعفات 4)
- Shadows ناعمة جدّاً (`rgba(24,24,37,0.10) 0px 2px 8px -2px`)

### الـ classes الجاهزة في `globals.css`
- `.btn-primary` — زرّ برتقالي
- `.btn-ghost` — زرّ أبيض بحدود
- `.badge` — شارة صغيرة
- `.card` — بطاقة بيضاء
- `.field` — حقل إدخال
- `.label` — تسمية حقل
- `.container-warraq` — حاوية بعرض 1160px

---

## ٤. خطّة العمل المطلوبة (بالأولويّة)

### المرحلة ١: استبدال الواجهات بالتصميم النهائي

استعمل `design-reference/warraq-v3.html` كمرجع مباشر. التحويل:
- HTML/JSX inline styles → JSX + Tailwind classes (باستخدام النظام في `globals.css`)
- React (umd) → Next.js components

**ترتيب العمل:**

#### ١.١ المكوّنات المشتركة (`src/components/`)
- [ ] `nav.tsx` — شريط التنقّل العلوي (انظر `function Nav` في v3)
- [ ] `footer.tsx` — التذييل (انظر `function Footer` في v3)
- [ ] `book-mockup.tsx` — الـ animated mockup (انظر `function BookToTextMockup`)
- [ ] `pricing-card.tsx` — بطاقة الخطّة
- [ ] `feature-card.tsx` — بطاقة ميزة

#### ١.٢ الصفحات العامّة (Marketing)
- [ ] `src/app/(marketing)/page.tsx` — الصفحة الرئيسيّة
  - استعمل: `Hero` + `Stats` + `Features` + `HowItWorks` + `Testimonials` + `Pricing` + `CTABand` + `Footer` من v3
- [ ] `src/app/(marketing)/pricing/page.tsx` — الأسعار التفصيليّة
  - استعمل: `function PricingPage` و `function FAQItem` من v3

#### ١.٣ صفحات المصادقة
- [ ] `src/app/(auth)/login/page.tsx`
- [ ] `src/app/(auth)/signup/page.tsx`
  - استعمل: `function AuthPage` من v3 (يدعم mode='login' و mode='register')

#### ١.٤ لوحة المستخدم
- [ ] `src/app/(app)/layout.tsx` — Sidebar + الإطار
- [ ] `src/app/(app)/dashboard/page.tsx`
  - استعمل: `function Dashboard` من v3
- [ ] `src/app/(app)/upload/page.tsx`
  - استعمل: `function UploadSection` من v3 + منطق الرفع الموجود حاليّاً
- [ ] `src/app/(app)/jobs/page.tsx` و `src/app/(app)/jobs/[id]/page.tsx`
  - صمّم بنفس الأسلوب (jobs cards + progress bar للمعالجة)
- [ ] `src/app/(app)/billing/page.tsx`
  - استعمل: `function Pricing` + calculator
- [ ] `src/app/(app)/api-keys/page.tsx`
- [ ] `src/app/(app)/organization/*` و `members/*`
- [ ] `src/app/(app)/settings/page.tsx`

#### ١.٥ لوحة المالك
- [ ] `src/app/(admin)/admin/*` — صمّمها بنفس الأسلوب لكن بسايدبار داكن (midnight)

### المرحلة ٢: حلّ معالجة PDF
انظر القسم ٧ أدناه.

### المرحلة ٣: اختبار التشغيل المحلّي
انظر القسم ٨.

---

## ٥. قواعد الكود

### تقنيات
- **Next.js 15** (App Router)
- **TypeScript** صارم
- **Tailwind CSS** (مع النظام التصميمي في `globals.css`)
- **Prisma** + PostgreSQL
- **Auth.js v5** للمصادقة
- **Lucide React** للأيقونات

### قواعد الكتابة
1. **التعليقات بالعربيّة** للمنطق المهمّ، الكود نفسه إنجليزي
2. **استعمل الـ tokens والـ classes** من `globals.css` بدل القيم المباشرة
3. **Server Components افتراضيّاً**، استخدم `"use client"` فقط عند الحاجة
4. **استورد من `@/...` ** (مُعرَّف في tsconfig)
5. **لا تكسر API routes الموجودة** — هي مُختبرة منطقيّاً
6. **حافظ على الترميز RTL** في `<html dir="rtl">`

### تحويل من v3.html → Next.js
عند نسخ مكوّن من v3.html إلى مكوّن Next.js:
1. حوّل `style={{}}` inline → Tailwind classes حيث أمكن
2. للقيم المخصّصة، استعمل `style={{}}` مع CSS vars (`rgb(var(--orange))`)
3. حوّل `useState/useEffect` كما هي
4. حوّل `function Logo` → استعمل `<Logo />` من `@/components/logo`
5. حوّل `onNavigate('login')` → `<Link href="/login">`

---

## ٦. هيكل المشروع

```
warraq-app/
├── prisma/
│   ├── schema.prisma        # 14 جدول
│   └── seed.ts              # تهيئة الخطط + المالك
├── src/
│   ├── app/
│   │   ├── (marketing)/     # صفحات عامّة
│   │   ├── (auth)/          # دخول/تسجيل
│   │   ├── (app)/           # لوحة المستخدم (محميّة)
│   │   ├── (admin)/         # لوحة المالك (System Admin فقط)
│   │   ├── api/             # كلّ الـ API endpoints
│   │   ├── invitations/     # قبول دعوات المؤسسات
│   │   ├── layout.tsx       # Root layout مع الخطوط
│   │   └── globals.css      # النظام التصميمي
│   ├── components/
│   │   └── logo.tsx         # موجود
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── claude.ts        # Claude Vision OCR
│   │   ├── stripe.ts
│   │   ├── tap.ts
│   │   ├── storage.ts       # R2
│   │   ├── pdf.ts           # ⚠️ stub - يحتاج إكمال
│   │   └── email.ts
│   └── middleware.ts
├── design-reference/        # ⭐ مرجع التصميم النهائي
│   ├── warraq-v3.html       # المرجع الأساسي
│   ├── warraq-tokens.css
│   ├── brand-assets/        # الشعار والهويّة
│   └── screenshots/
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── .env.example
├── README.md
├── SETUP_GUIDE_AR.md        # دليل التشغيل بالعربيّة
└── CLAUDE.md                # هذا الملفّ
```

---

## ٧. حلّ معالجة PDF (مهمّ جدّاً)

**المشكلة:** `src/lib/pdf.ts` يحوي دالّة `pdfToImages` كـ stub. تحويل PDF لصور في Node.js صعب لأنّه يحتاج binaries خارجيّة (poppler-utils).

**الحلّ الموصى به:** استخدام **Inngest** أو **Trigger.dev** لتشغيل المعالجة في خدمة منفصلة.

### الخطوات المقترحة
1. ثبّت `pdf-poppler` (يحتاج `poppler-utils` على النظام):
   ```bash
   # على Mac:
   brew install poppler

   # على Linux/Vercel:
   apt-get install poppler-utils

   npm install pdf-poppler
   ```

2. حدّث `src/lib/pdf.ts`:
   ```typescript
   import { convert } from "pdf-poppler";

   export async function pdfToImages(pdfPath: string, dpi: number = 200) {
     const opts = {
       format: 'png',
       out_dir: '/tmp',
       out_prefix: 'page',
       page: null, // كل الصفحات
       scale: Math.round(dpi / 72 * 100), // pdf-poppler يستخدم scale
     };
     await convert(pdfPath, opts);
     // ثمّ اقرأ الصور من /tmp
   }
   ```

3. **بديل أفضل للإنتاج:** استخدم Inngest:
   - أنشئ حساب على https://inngest.com
   - حرّك المعالجة من API route إلى Inngest function
   - شغّل MEDIA TASKS في حاوية Docker مخصّصة

**الأولوية:** ابدأ بـ pdf-poppler للتطوير المحلّي. اِنتقل لـ Inngest قبل النشر للإنتاج.

---

## ٨. التشغيل المحلّي

### المتطلّبات
- Node.js 20+
- PostgreSQL (محلّي أو Supabase/Neon)
- حسابات: Anthropic, Stripe, Tap, Cloudflare R2, Resend (لاحقاً)

### الخطوات
```bash
# ١. التثبيت
npm install

# ٢. إعداد .env.local (انسخ من .env.example وعبّ القيم)
cp .env.example .env.local
# عدّل: DATABASE_URL, ANTHROPIC_API_KEY, AUTH_SECRET, SEED_ADMIN_*

# ٣. قاعدة البيانات
npx prisma generate
npx prisma db push
npm run db:seed

# ٤. تشغيل
npm run dev
# افتح http://localhost:3000
```

### تسجيل دخول كمالك
- بريد المالك: من `SEED_ADMIN_EMAIL` في `.env.local`
- كلمة المرور: من `SEED_ADMIN_PASSWORD`
- بعد الدخول، اذهب إلى `/admin`

### تسجيل كمستخدم عادي
- اذهب إلى `/signup` وسجّل ببريد مختلف
- تحصل على ١٠ صفحات مجانيّة

---

## ٩. كيف تعمل (لـ Claude Code)

### عند بداية كلّ مهمّة
1. اقرأ `CLAUDE.md` (هذا الملفّ) بالكامل
2. اقرأ الملفّ المحدَّد المطلوب تعديله
3. لو كان تصميم واجهة، **اقرأ `design-reference/warraq-v3.html` أوّلاً** لتجد المكوّن المقابل
4. لا تنسَ: اللغة عربيّة (RTL) — تحقّق من اتّجاه النصّ

### عند تحويل مكوّن من v3.html
1. ابحث في `warraq-v3.html` عن `function ComponentName`
2. انسخ المنطق
3. حوّل styles لـ Tailwind/CSS classes
4. استبدل `onNavigate(...)` بـ `<Link href="...">` من `next/link`
5. استبدل `<Logo />` المحلّيّة بـ `import { Logo } from "@/components/logo"`
6. أضف `"use client"` لو فيه `useState/useEffect`

### عند إضافة API endpoint جديد
1. اقرأ endpoint مشابه موجود لتفهم النمط
2. استعمل `auth()` للمصادقة
3. استعمل `db` (Prisma) من `@/lib/db`
4. تحقّق من الصلاحيّات (`requireOrgRole`, `requireAdmin`)
5. أعد JSON بصيغة `{ data }` أو `{ error }`

### عند مواجهة خطأ
1. لا تخفي الخطأ — أصلحه أو اعرض المشكلة
2. لو الخطأ في schema، شغّل `npx prisma db push`
3. لو الخطأ في types، شغّل `npx prisma generate`

---

## ١٠. ما يجب ألّا تفعله

- ❌ **لا تغيّر** schema قاعدة البيانات بدون إذن صريح
- ❌ **لا تكسر** API routes الموجودة
- ❌ **لا تستعمل** ألواناً خارج النظام التصميمي
- ❌ **لا تستعمل** خطوطاً غير Tajawal و Inter
- ❌ **لا تنشئ** صفحات لا توجد في خطّة المرحلة ١
- ❌ **لا تختلق** نقولات أو محتوى عربي تراثي — اطلب من المستخدم لو احتجت أمثلة

---

## ١٠.٥ خدمات Claude الإضافيّة (Add-on مدفوع)

- **الأساسي:** OCR (التفريغ النصّي) عبر **Mistral** (`src/lib/mistral.ts`، نداء واحد للمستند) — متاح للجميع حسب الرصيد/الخطّة. يرجع إلى Claude إن لم يُضبط `MISTRAL_API_KEY`.
- **الإضافي المدفوع (مساعد المستند الذكي):** `تحسين الدقّة والتنسيق` (تصحيح القراءة + تنسيق Markdown + فصل الحواشي + رقم الصفحة) و`Generate Report`/تلخيص و`Ask Document` — **مدعومة بـ Mistral chat (سريعة)**، مع Claude كبديل. ليست ضمن الباقة الأساسيّة، وتُستدعى عند طلب المستخدم فقط.
- **المنطق المركزيّ:** `src/lib/claude-addon.ts` (`getClaudeAccess`, `canUseClaudeFeatures`, `trackClaudeUsage`).
- **الأهليّة:** عبر الخطّة (الخطط في `claude_addon_included_plans`) أو رصيد الاستخدام (`pagesBalance`)، حسب `claude_addon_mode`.
- **التحكّم:** كلّه في `SystemSetting` بمفاتيح `claude_addon_*` (تفعيل/سعر/طريقة الاحتساب/الحدّ الشهريّ) — **بلا جداول جديدة**.
- **التتبّع:** في `AuditLog` (action: `claude.*`). الخصم في وضع usage من `pagesBalance`.
- **الواجهة:** `src/components/claude-panel.tsx` على صفحة المستند — مفتوح للمؤهّل، مقفل مع upsell لغيره.
- **ملاحظة:** التفريغ الأساسي عبر Mistral؛ وخدمات Claude (Ask/Report) مستقلّة عنه كـ add-on مدفوع.

---

## ١٠.٦ تصحيح الآيات + تلميحات الفشل (محليّ، بلا تكلفة)

- **تصحيح الآيات القرآنيّة:** `src/lib/quran-correct.ts` يصحّح الآيات المقتبسة بين قوسي
  الزخرفة ﴿ ﴾ مقابل نصّ الرسم العثمانيّ المرجعيّ. مطابقة نصّيّة خالصة (بلا نداء API ولا
  تكلفة) تعمل **تلقائيّاً** ضمن التفريغ عبر `formatOcrPage` (وأيضاً في مساري Claude
  البديلين ومسار «تحسين الدقّة»). **استبدال فقط** بلا مرجع، وبعتبة ثقة عالية فلا تمسّ نصّاً
  غير قرآنيّ، وأيّ خطأ يُعيد النصّ كما هو.
  - **مصدر النصّ:** `src/data/quran-uthmani.json` (الرسم العثمانيّ، رواية حفص — موثّق
    داخل الملفّ في `_source`/`_attribution`). **قابل للاستبدال** بأيّ مصدر معتمَد بنفس
    البنية `surahs[].ayat[]` دون أيّ تغيير في الكود. **لا تكتب نصّاً قرآنيّاً يدويّاً.**
  - **ترقية المصدر إلى المعتمَد (مركز تفسير):** `scripts/build-quran-from-tafsir-db.py`
    يُعيد توليد الملفّ من قاعدة بيانات **tafsir-mcp** (الرسم العثمانيّ من جدول
    `word_content_rasm`، نفس منطق `reconstruct_ayah`). شغّله: `npm run quran:build -- /path/to/quran.db`
    أو `TAFSIR_DB_PATH=... npm run quran:build`. يتحقّق من ١١٤ سورة و٦٢٣٦ آية قبل الكتابة.
    **النسبة إلزاميّة (CC BY 4.0):** «مركز تفسير للدراسات القرآنيّة» — مُضمَّنة في رأس الملفّ.
  - **خادم MCP للتطوير:** `.mcp.json` يسجّل `tafsir-mcp` لجلسات Claude Code (تحقّق من
    الآيات/التفسير أثناء التطوير فقط — ليس وقت التشغيل، فالتصحيح يبقى محلّيّاً سريعاً).
- **تلميحات الفشل:** `src/lib/failure-hints.ts` + `src/components/failure-hint.tsx` —
  تلميح عمليّ عند فشل المعالجة (يتصدّره **ضغط الملفّ**) يظهر في صفحة المستند وصفحة الرفع،
  مع **تنبيه استباقيّ** عند اختيار ملفّ كبير قبل المعالجة.

---

## ١١. روابط مرجعيّة

- وثائق Anthropic: https://docs.anthropic.com
- وثائق Next.js 15: https://nextjs.org/docs
- وثائق Prisma: https://www.prisma.io/docs
- وثائق Tap Payments: https://developers.tap.company
- وثائق Stripe: https://stripe.com/docs
- Lucide React Icons: https://lucide.dev

---

## ١٢. أسئلة المستخدم الشائعة

### "كيف أنشئ حساب مالك؟"
الإجابة: ضع بريدك في `.env.local` كـ `SEED_ADMIN_EMAIL`، ثمّ شغّل `npm run db:seed`.

### "كيف أُغيّر كلمة مرور المالك؟"
الإجابة: غيّر `SEED_ADMIN_PASSWORD` في `.env.local` ثمّ أعد `npm run db:seed` (السكربت يحدّث كلمة المرور).

### "كيف أُعاين الواجهات؟"
الإجابة: 
- التصميم المرجعي: افتح `design-reference/warraq-v3.html` في المتصفّح
- التطبيق الحقيقي: `npm run dev` ثمّ http://localhost:3000

### "متى يُنشر المشروع؟"
الإجابة: بعد إكمال المرحلة ١ (الواجهات) + المرحلة ٢ (PDF) + اختبار شامل.

---

تمّ. ابدأ بقراءة `design-reference/warraq-v3.html` ثمّ نفّذ المرحلة ١ بالترتيب.
