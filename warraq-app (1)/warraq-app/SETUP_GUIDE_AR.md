# 🚀 دليل التشغيل من الصفر · وَرَّاق

> هذا الدليل يفترض أنّك لست مطوّراً محترفاً.
> اِتّبع الخطوات بالترتيب ولا تتجاوز خطوة.

---

## 📋 ما ستحتاجه قبل البدء

### حسابات (كلّها مجانيّة في البداية)
1. **GitHub** — لحفظ الكود (https://github.com)
2. **Supabase** — قاعدة البيانات (https://supabase.com)
3. **Cloudflare** — تخزين الملفّات (https://cloudflare.com)
4. **Anthropic** — Claude API (https://console.anthropic.com)
5. **Resend** — البريد الإلكتروني (https://resend.com)
6. **Vercel** — استضافة الموقع (https://vercel.com)
7. **Stripe** — دفعات دوليّة (https://stripe.com)
8. **Tap Payments** — دفعات سعوديّة (https://tap.company)

### أدوات على جهازك
- **Node.js 20+** — حمّله من https://nodejs.org (اختر النسخة LTS)
- **محرّر كود** — أنصحك بـ **Cursor** (https://cursor.com) لأنّه يحوي Claude مدمجاً، أو VS Code (https://code.visualstudio.com)

---

## ⚙️ الخطوة ١: تثبيت المشروع محليّاً

### ١.أ - فكّ الضغط
- فكّ ضغط `warraq-app.zip` في مجلّد على سطح المكتب
- ستحصل على مجلّد اسمه `warraq-app`

### ١.ب - افتح Terminal في المجلّد
- **Windows**: انقر بالزرّ الأيمن داخل المجلّد → "Open in Terminal"
- **Mac**: افتح Terminal، اكتب `cd ` ثمّ اسحب المجلّد إلى النافذة، ثمّ Enter

### ١.ج - ثبّت الحزم
```bash
npm install
```
انتظر حتّى ينتهي (٢-٥ دقائق).

---

## 🗄️ الخطوة ٢: إعداد قاعدة البيانات (Supabase)

### ٢.أ - أنشئ مشروعاً
1. ادخل https://supabase.com وسجّل
2. اضغط **New Project**
3. اختر اسماً (مثل `warraq`)
4. **مهمّ**: اختر منطقة قريبة (مثل `Frankfurt` أو `Mumbai` للسعوديّة)
5. اختر كلمة مرور قويّة وفظّها

### ٢.ب - انسخ رابط القاعدة
1. بعد إنشاء المشروع، اذهب إلى **Settings** → **Database**
2. انزل لقسم **Connection string** → اختر **URI**
3. انسخ الرابط (يبدأ بـ `postgresql://...`)
4. **مهمّ**: استبدل `[YOUR-PASSWORD]` بكلمة المرور الفعليّة

---

## 🔐 الخطوة ٣: إنشاء ملفّ `.env.local`

في مجلّد المشروع، انسخ ملفّ `.env.example` وسمّه `.env.local`، ثمّ افتحه واملأ القيم:

### ٣.أ - الأساسيّات
```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DATABASE_URL="<الرابط الذي نسخته من Supabase>"
```

### ٣.ب - مفتاح المصادقة
في Terminal:
```bash
# Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Mac/Linux:
openssl rand -base64 32
```
انسخ الناتج وضعه في:
```
AUTH_SECRET="<الناتج>"
```

### ٣.ج - ⭐ بيانات المالك (المهمّ جدّاً)
```
SEED_ADMIN_EMAIL="بريدك@example.com"
SEED_ADMIN_PASSWORD="كلمة مرور قويّة 10 أحرف فأكثر"
SEED_ADMIN_NAME="اسمك"
```

### ٣.د - المفاتيح الأخرى
لا تقلق منها الآن — يمكن تركها فارغة أوّلاً والمشروع سيعمل (لكن بدون دفعات/إيميل).

---

## 🌱 الخطوة ٤: تهيئة قاعدة البيانات

في Terminal، شغّل:

```bash
# توليد عميل Prisma
npx prisma generate

# إنشاء الجداول في Supabase
npx prisma db push

# إنشاء حسابك كمالك + الخطط
npm run db:seed
```

ستظهر رسالة:
```
═══════════════════════════════
✅ اكتمل التهيئة بنجاح!
═══════════════════════════════

🔐 بيانات دخول المالك:
   البريد:       بريدك@example.com
   كلمة المرور:  ******
```

---

## ▶️ الخطوة ٥: تشغيل الموقع محليّاً

```bash
npm run dev
```

افتح المتصفّح على: **http://localhost:3000**

### المسارات الرئيسيّة:
- `/` — الصفحة الرئيسيّة
- `/login` — تسجيل الدخول
- `/dashboard` — لوحة المستخدم (بعد الدخول)
- `/admin` — **لوحة المالك** (بعد الدخول ببيانات المالك)

### كيف تدخل كمالك:
1. اذهب لـ http://localhost:3000/login
2. أدخل البريد وكلمة المرور من الخطوة ٣.ج
3. ستجد رابط **"لوحة المالك"** في الشريط الجانبي

### كيف تختبر كمستخدم عادي:
1. اضغط **خروج**
2. سجّل حساباً جديداً من `/signup` ببريد آخر
3. تصرّف كمستخدم عاديّ

---

## 🎨 الخطوة ٦: استبدال الواجهات بتصميمك

### الخيار الأوّل: استخدام v0.dev (الأسرع)
1. ادخل https://v0.dev (مجاني محدود)
2. صف الصفحة بالعربيّة:
   > "صمّم لي landing page لمنصّة تحويل PDF عربي إلى نصّ. اللون الأساسي #0A2E54، المحتوى عربي RTL"
3. v0 يولّد كود React جاهز
4. انسخ الكود واستبدل محتوى الصفحة المقابلة في `src/app/(marketing)/page.tsx`

### الخيار الثاني: تصميم في Figma
1. صمّم في Figma
2. صدّر التصميم كصورة PNG/JPG
3. ارفع الصورة إلى Cursor أو Claude مع طلب: "حوّل هذا التصميم إلى React + Tailwind"
4. انسخ الكود الناتج إلى الصفحة المقابلة

### الخيار الثالث: وصف لـ Claude
1. افتح Claude (هذه المحادثة أو في Cursor)
2. قل مثلاً:
   > "ها هو الكود الحالي لصفحة الرئيسيّة [انسخ الكود]. اعد تصميمها بأسلوب Apple — تيبوغرافي كبير، مساحات بيضاء، حركات ناعمة"
3. سأعيد كتابة الكود

---

## 📂 خريطة الصفحات للتصميم

عند التصميم، ركّز على هذه الصفحات بالترتيب:

### 🏠 الصفحات العامّة (Marketing)
| الملفّ | المحتوى |
|---|---|
| `src/app/(marketing)/page.tsx` | الصفحة الرئيسيّة (Landing) |
| `src/app/(marketing)/pricing/page.tsx` | الأسعار |

### 🔐 المصادقة
| الملفّ | المحتوى |
|---|---|
| `src/app/(auth)/login/page.tsx` | تسجيل الدخول |
| `src/app/(auth)/signup/page.tsx` | إنشاء حساب |
| `src/app/(auth)/forgot-password/page.tsx` | نسيت كلمة المرور |
| `src/app/(auth)/reset-password/page.tsx` | كلمة مرور جديدة |

### 📊 لوحة المستخدم
| الملفّ | المحتوى |
|---|---|
| `src/app/(app)/layout.tsx` | الـ Sidebar + الإطار العامّ |
| `src/app/(app)/dashboard/page.tsx` | اللوحة الرئيسيّة |
| `src/app/(app)/upload/page.tsx` | رفع ملفّ |
| `src/app/(app)/jobs/page.tsx` | قائمة الوظائف |
| `src/app/(app)/jobs/[id]/page.tsx` | تفاصيل الوظيفة |
| `src/app/(app)/billing/page.tsx` | الفوترة والاشتراك |
| `src/app/(app)/billing/return/page.tsx` | بعد الدفع (Tap) |
| `src/app/(app)/api-keys/page.tsx` | مفاتيح API |
| `src/app/(app)/organization/page.tsx` | قائمة المؤسسات |
| `src/app/(app)/organization/new/page.tsx` | إنشاء مؤسسة |
| `src/app/(app)/organization/[id]/page.tsx` | تفاصيل مؤسسة |
| `src/app/(app)/organization/members/page.tsx` | إدارة الأعضاء |
| `src/app/(app)/settings/page.tsx` | إعدادات الحساب |

### 👑 لوحة المالك
| الملفّ | المحتوى |
|---|---|
| `src/app/(admin)/admin/layout.tsx` | الإطار |
| `src/app/(admin)/admin/page.tsx` | الإحصائيّات |
| `src/app/(admin)/admin/users/page.tsx` | المستخدمون |
| `src/app/(admin)/admin/jobs/page.tsx` | كلّ الوظائف |
| `src/app/(admin)/admin/revenue/page.tsx` | الإيرادات |
| `src/app/(admin)/admin/system/page.tsx` | سجلّ النظام |

### 🎟️ صفحات أخرى
| الملفّ | المحتوى |
|---|---|
| `src/app/invitations/[token]/page.tsx` | قبول دعوة مؤسسة |

---

## ❓ مشاكل شائعة

### "Cannot find module..."
- شغّل `npm install` مرّة أخرى
- ثمّ `npx prisma generate`

### "Database connection failed"
- تأكّد من `DATABASE_URL` في `.env.local`
- تأكّد أنّك استبدلت `[YOUR-PASSWORD]` بالكلمة الفعليّة

### "SEED_ADMIN_EMAIL not defined"
- تأكّد من وجود ملفّ `.env.local` (ليس `.env.example`)
- تأكّد من سطر `SEED_ADMIN_EMAIL=`

### "Page not found" في `/admin`
- تأكّد أنّك سجّلت دخول ببريد المالك (الذي وضعته في `SEED_ADMIN_EMAIL`)
- لو دخلت ببريد آخر فلن تظهر لك لوحة المالك (هذا متعمَّد)

### الموقع بطيء في التطوير
- طبيعي — `npm run dev` يجمّع الكود في كلّ تحديث
- في الإنتاج (`npm run build && npm start`) سيكون أسرع بكثير

---

## 🔄 ما تفعله بعد كلّ تعديل في الكود

```bash
# لو عدّلت schema.prisma:
npx prisma db push
npx prisma generate

# لو أضفت حزماً جديدة:
npm install <اسم الحزمة>

# لتشغيل الموقع:
npm run dev
```

---

تمّ! إذا عَلِقت في خطوة، أرسل لي رسالة الخطأ من Terminal.
