// prisma/seed.ts
// ─────────────────────────
// تهيئة قاعدة البيانات بالبيانات الأوّلية:
// - الخطط الثلاث (مجاني / باحث / محقّق)
// - حساب المالك (System Admin) — يُقرأ من .env.local
// - إعدادات النظام
//
// كيفية التشغيل:
//   npm run db:seed
//
// متغيّرات البيئة المطلوبة في .env.local:
//   SEED_ADMIN_EMAIL=your@email.com
//   SEED_ADMIN_PASSWORD=YourStrongPassword123
//   SEED_ADMIN_NAME=اسمك الكامل
// ─────────────────────────

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("\n🌱 جارٍ تهيئة قاعدة البيانات...\n");

  // ════════════════════════════════════════
  // ١. الخطط الثلاث
  // ════════════════════════════════════════
  console.log("📋 إنشاء الخطط...");

  const plans = [
    {
      slug: "free",
      nameAr: "مجاني",
      nameEn: "Free",
      monthlyPriceSar: 0,
      pagesPerMonth: 50,
      maxFileSizeMb: 10,
      maxBatchSize: 1,
      allowedFormats: ["TXT", "MD", "DOCX"] as const,
      apiAccess: false,
      defaultModel: "SONNET" as const,
    },
    {
      slug: "researcher",
      nameAr: "احترافي",
      nameEn: "Pro",
      monthlyPriceSar: 3100,
      pagesPerMonth: 500,
      maxFileSizeMb: 100,
      maxBatchSize: 5,
      allowedFormats: ["TXT", "MD", "DOCX", "JSON", "PDF_SEARCHABLE"] as const,
      apiAccess: true,
      defaultModel: "SONNET" as const,
    },
    {
      slug: "verifier",
      nameAr: "مؤسسي",
      nameEn: "Enterprise",
      monthlyPriceSar: 14000,
      pagesPerMonth: 2500,
      maxFileSizeMb: 200,
      maxBatchSize: 10,
      allowedFormats: ["TXT", "MD", "DOCX", "JSON", "PDF_SEARCHABLE"] as const,
      apiAccess: true,
      prioritySupport: true,
      defaultModel: "OPUS" as const,
      isOrg: true,
    },
  ];

  for (const plan of plans) {
    await db.plan.upsert({
      where: { slug: plan.slug },
      create: plan as any,
      update: plan as any,
    });
    console.log(`  ✓ ${plan.nameAr}`);
  }

  // ════════════════════════════════════════
  // ٢. حساب المالك
  // ════════════════════════════════════════
  console.log("\n👤 إنشاء/تحديث حساب المالك...");

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME ?? "مالك النظام";

  if (!adminEmail || !adminPassword) {
    console.error("\n❌ خطأ: يجب تحديد متغيّرات البيئة:");
    console.error("   SEED_ADMIN_EMAIL=your@email.com");
    console.error("   SEED_ADMIN_PASSWORD=YourStrongPassword");
    console.error("\n   أضِفها إلى .env.local ثمّ أعِد المحاولة.\n");
    process.exit(1);
  }

  if (adminPassword.length < 10) {
    console.error("\n❌ كلمة المرور قصيرة (الحدّ الأدنى ١٠ أحرف).\n");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      systemRole: "SYSTEM_ADMIN",
      pagesBalance: 999999,
      emailVerified: new Date(),
    },
    update: {
      systemRole: "SYSTEM_ADMIN",
      passwordHash,
    },
  });

  console.log(`  ✓ ${admin.email}`);

  // ════════════════════════════════════════
  // ٣. إعدادات النظام
  // ════════════════════════════════════════
  console.log("\n⚙️  إعدادات النظام...");

  const settings = [
    { key: "payg_price_per_page_halala", value: 8, description: "سعر الصفحة في PAYG (هللات)" },
    { key: "max_file_size_mb", value: 100, description: "الحدّ الأقصى لحجم الملف" },
    { key: "results_retention_days", value: 30, description: "مدّة حفظ النتائج" },
    { key: "free_signup_pages", value: 50, description: "صفحات مجانية عند التسجيل" },
    { key: "max_pages_per_file", value: 2000, description: "الحدّ الأقصى للصفحات في الملف" },
    // ── إعدادات إضافة Claude (Ask/Report) — قابلة للتحكّم من لوحة الإدارة ──
    { key: "claude_addon_enabled", value: true, description: "تفعيل مساعد المستند الذكي (Ask/Report/تحسين) — مدعوم بـ Mistral" },
    { key: "claude_addon_mode", value: "plan", description: "طريقة الأهليّة: plan | usage | plan_or_usage" },
    { key: "claude_addon_included_plans", value: ["researcher", "verifier"], description: "الخطط التي تتضمّن إضافة Claude" },
    { key: "claude_addon_cost_per_action", value: 5, description: "تكلفة العمليّة الواحدة بالرصيد (وضع usage)" },
    { key: "claude_addon_monthly_limit", value: 0, description: "حدّ شهريّ لعمليّات Claude (0 = بلا حدّ)" },
    { key: "claude_addon_text_model", value: "OPUS", description: "نموذج Claude النصّي لخدمات الفهم" },
  ];

  for (const s of settings) {
    await db.systemSetting.upsert({
      where: { key: s.key },
      create: s,
      update: { description: s.description },
    });
  }
  console.log(`  ✓ ${settings.length} إعداد`);

  // ════════════════════════════════════════
  // النهاية
  // ════════════════════════════════════════
  console.log("\n" + "═".repeat(50));
  console.log("✅ اكتمل التهيئة بنجاح!");
  console.log("═".repeat(50));
  console.log("\n🔐 بيانات دخول المالك:");
  console.log(`   البريد:       ${adminEmail}`);
  console.log(`   كلمة المرور:  ${adminPassword}`);
  console.log("\n📍 ادخل من:    http://localhost:3000/login");
  console.log("📍 لوحة المالك: http://localhost:3000/admin");
  console.log("\n⚠️  بعد أوّل دخول، احذف SEED_ADMIN_PASSWORD من .env.local\n");
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error("\n❌ فشل التهيئة:", err);
    await db.$disconnect();
    process.exit(1);
  });
