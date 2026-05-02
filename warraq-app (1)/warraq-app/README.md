# وَرَّاق · Warraq

> منصّة احترافية لتحويل الكتب العربية المصوّرة إلى نصوص بدقّة عالية باستخدام Claude Vision.

## 📦 ما الذي بُني هنا

هذا مشروع Next.js 15 كامل (Backend + Frontend + DB) جاهز للنشر على Vercel.

### ✅ مكتمل وجاهز للإنتاج

**قاعدة البيانات** (`prisma/schema.prisma`)
- 14 جدول يغطّي: مستخدمين، مؤسسات، خطط، اشتراكات، وظائف OCR، صفحات، معاملات مالية، مفاتيح API، سجلّات نشاط
- علاقات Multi-tenancy كاملة
- Enums للحالات والأدوار

**نظام المصادقة** (`src/lib/auth.ts`)
- Auth.js v5 (NextAuth)
- Email/Password + Google OAuth (اختياري)
- ٣ مستويات أدوار: USER / ORG_OWNER+ADMIN+MEMBER / SYSTEM_ADMIN
- نسيت كلمة المرور + إعادة تعيين

**تكامل Claude API** (`src/lib/claude.ts`)
- ٣ نماذج: Haiku / Sonnet / Opus
- برومبت محسَّن للعربية
- إعادة محاولة تلقائية مع تراجع أسّي
- استخراج رقم الصفحة المطبوع

**الدفع — بوّابتان متكاملتان**
- **Stripe** (`src/lib/stripe.ts`): بطاقات دولية + Apple Pay + Google Pay (تلقائياً)
- **Tap Payments** (`src/lib/tap.ts`): mada + Apple Pay سعودي + STC Pay + Visa + KNET
- اشتراكات شهرية + دفع لمرّة واحدة (PAYG)
- Webhooks لكلتيهما

**التخزين** (`src/lib/storage.ts`)
- Cloudflare R2 (متوافق S3، أرخص بكثير)
- روابط رفع موقّعة (Direct Upload من المتصفّح)
- روابط تحميل موقّعة

**API Routes** (`src/app/api/`)
- `auth/*` — تسجيل/دخول/استعادة
- `upload` — توقيع رابط الرفع
- `jobs` — إنشاء وإدارة وظائف OCR
- `jobs/[id]/process` — معالج الخلفية
- `stripe/checkout` + `stripe/webhook`
- `tap/checkout` + `tap/webhook`
- `orgs` + `orgs/[id]/members` — إدارة المؤسسات والدعوات
- `api-keys` — مفاتيح API للمطوّرين
- `v1/extract` — **API عامّة للمطوّرين** (بمصادقة Bearer)
- `admin/*` — إحصائيات المالك

**صفحات الواجهة** (`src/app/(*)`)
- (marketing): الرئيسية + الأسعار
- (auth): دخول، تسجيل، نسيان كلمة المرور
- (app): لوحة التحكم، رفع، وظائف، فوترة، إعدادات، مفاتيح API، المؤسسات، الأعضاء
- (admin): لوحة المالك، المستخدمون، الوظائف، الإيرادات، النظام

> ⚠️ صفحات الواجهة **هياكل بسيطة عاملة**. ستستبدلها لاحقاً بتصميمك النهائي. كل المنطق (Forms, API calls, State) مكتوب وجاهز.

---

## 🚀 خطوات التشغيل

### 1. متطلّبات
- Node.js 20+
- PostgreSQL (محلّي أو Supabase/Neon)
- حسابات: Anthropic, Stripe, Tap Payments, Cloudflare R2, Resend

### 2. التثبيت
```bash
cd warraq-app
npm install
cp .env.example .env.local
# املأ .env.local بالقيم الفعلية
```

### 3. قاعدة البيانات
```bash
# توليد عميل Prisma
npx prisma generate

# دفع المخطّط لقاعدة البيانات
npx prisma db push

# تهيئة بيانات أوّلية (خطط + حساب المالك)
npm run db:seed
```

### 4. التشغيل المحلّي
```bash
npm run dev
# افتح: http://localhost:3000
```

### 5. النشر على Vercel
1. ادفع المشروع إلى GitHub
2. اربطه بـ Vercel
3. أضف متغيّرات البيئة في إعدادات Vercel
4. النشر تلقائي

---

## 🔧 ما يحتاج تطوير إضافي قبل الإطلاق

### 🔴 حرج (يجب قبل الإطلاق)
1. **معالجة PDF → صور** (`src/lib/pdf.ts`):
   - الكود الحالي placeholder
   - الحلّ الموصى به: استخدام Inngest أو Trigger.dev مع Docker container فيها `poppler-utils` + `sharp`
   - أو خدمة مدفوعة مثل CloudConvert

2. **تصدير الملفات** (TXT/MD/DOCX/JSON/PDF):
   - يحتاج إنشاء `/api/jobs/[id]/export` endpoint
   - يستخدم نتائج `JobPage` ويبني الملف

3. **نظام الطوابير**:
   - الكود الحالي يطلق المعالجة كـ fire-and-forget من API route
   - يحتاج Inngest أو BullMQ في الإنتاج

### 🟡 مهمّ (قبل النموّ)
1. تصميم الواجهات النهائي (الذي تجهّزه أنت)
2. اختبارات (Vitest + Playwright)
3. صفحة قبول دعوات المؤسسات (`/invitations/[token]`)
4. صفحة إنشاء مؤسسة (`/organization/new`)
5. صفحة تأكيد الدفع (`/billing/return`)
6. مراقبة (Sentry)

### 🟢 إضافات لاحقاً
1. ترجمة آلية للنصوص
2. مراجعة بنموذجين (Quality boost)
3. تطبيق Mobile (React Native)
4. تكامل مع Zotero/Mendeley للمحقّقين

---

## 📁 هيكل المشروع

```
warraq-app/
├── prisma/
│   ├── schema.prisma         # مخطّط قاعدة البيانات
│   └── seed.ts               # بيانات أوّلية
├── src/
│   ├── app/
│   │   ├── (marketing)/      # الصفحات العامّة
│   │   ├── (auth)/           # تسجيل الدخول/الإنشاء
│   │   ├── (app)/            # لوحة المستخدم (محميّة)
│   │   ├── (admin)/          # لوحة المالك (System Admin فقط)
│   │   └── api/              # كل الـ API endpoints
│   ├── lib/
│   │   ├── db.ts             # Prisma client
│   │   ├── auth.ts           # NextAuth
│   │   ├── claude.ts         # Claude Vision OCR
│   │   ├── stripe.ts         # Stripe
│   │   ├── tap.ts            # Tap Payments
│   │   ├── storage.ts        # R2 / S3
│   │   ├── pdf.ts            # PDF utilities
│   │   └── email.ts          # Resend
│   └── middleware.ts         # حماية المسارات
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
└── .env.example
```

---

## 💰 التكاليف الشهرية المتوقّعة

| الخدمة | التكلفة | ملاحظات |
|---|---|---|
| Vercel Pro | $20 | الاستضافة |
| Supabase Pro | $25 | قاعدة البيانات |
| Cloudflare R2 | $5-15 | حسب الاستخدام |
| Inngest / Trigger | $20 | الطوابير |
| Resend | $20 | الإيميل |
| Sentry | $0-26 | المراقبة |
| **المجموع الثابت** | **~$90-105** | |
| **متغيّر:** Claude API | حسب الاستخدام | تُغطّى من إيرادات العملاء |

---

## 🎯 الخطوات التالية الموصى بها

1. **اختبر محلّياً**: اتّبع خطوات التشغيل أعلاه للتأكّد من عمل المنطق
2. **أنشئ حسابات الخدمات الخارجية** (Anthropic, Stripe, Tap, R2, Resend)
3. **حلّ مشكلة معالجة PDF** (Inngest + Docker container)
4. **أنشئ صفحة Export API**
5. **استبدل الواجهات بتصميمك النهائي**
6. **أطلق نسخة Beta لـ ٢٠-٣٠ مستخدماً مختاراً**

---

تم بناؤه بـ ❤️ لتمكين البحث في التراث العربي.
