// src/app/api/admin/qwen-test/route.ts — تشخيص اتصال Qwen/علي بابا (للمالك فقط)
// يفتحه المالك في المتصفّح: /api/admin/qwen-test
// يكشف: هل المفتاح مضبوط وصالح؟ وماذا يردّ علي بابا فعلياً؟ ثمّ يترجم الخطأ الخام
// إلى حكم عربيّ واضح مع خطوات العلاج في لوحة علي بابا — دون كشف المفتاح.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStudyConfig } from "@/lib/study";

export const maxDuration = 60;

// ترجمة الخطأ الخام من DashScope إلى حكم وخطوات علاج (بالعربيّة)
function qwenVerdict(status: number, body: string): { verdict: string; fix: string[] } {
  const b = body.toLowerCase();

  if (status === 401 || b.includes("invalid_api_key") || b.includes("invalidapikey")) {
    return {
      verdict: "المفتاح مرفوض (401) — غير صحيح أو من لوحة الصين بينما القاعدة دوليّة.",
      fix: [
        "أنشئ مفتاحاً من اللوحة الدوليّة (سنغافورة): bailian.console.alibabacloud.com → API Keys",
        "حدّث QWEN_API_KEY في Vercel ثمّ Redeploy",
      ],
    };
  }
  if (b.includes("arrearage") || b.includes("in good standing")) {
    return {
      verdict: "الحساب متعثّر ماليّاً (Arrearage) — رصيد حساب علي بابا سالب أو فاتورة غير مسدّدة.",
      fix: [
        "ادخل console.alibabacloud.com → Expenses and Costs (الفوترة)",
        "سدّد المتأخّرات أو اشحن رصيداً (Add Funds / Top up)",
        "انتظر دقائق بعد السداد حتى يتحدّث الحساب",
      ],
    };
  }
  if (
    b.includes("allocationquota") ||
    b.includes("free allocated quota") ||
    b.includes("quota exhausted") ||
    (b.includes("quota") && status === 429) ||
    status === 503
  ) {
    return {
      verdict:
        "نفدت الحصّة المجانيّة والدفع حسب الاستخدام غير سارٍ بعد — البطاقة وحدها لا تكفي.",
      fix: [
        "أكمل بيانات الحساب (Complete account information) في console.alibabacloud.com — شرط للدفع حسب الاستخدام",
        "افتح bailian.console.alibabacloud.com → إعدادات الفوترة داخل Model Studio",
        "عطّل مفتاح «Stop When Free Quota Is Used Up» — هذا هو المفتاح الخفيّ الذي يمنع الفوترة المدفوعة",
        "تأكّد من وجود وسيلة دفع صالحة، ثمّ انتظر دقائق وأعد الفحص",
      ],
    };
  }
  if (b.includes("accessdenied") || b.includes("unpurchased") || b.includes("not activate")) {
    return {
      verdict: "خدمة Model Studio غير مفعّلة على الحساب، أو النموذج غير مشمول.",
      fix: [
        "افتح bailian.console.alibabacloud.com وفعّل الخدمة (زرّ Activate Now في أوّل زيارة)",
        "تأكّد أنّ الحساب دوليّ (alibabacloud.com) لا صينيّ (aliyun.com)",
      ],
    };
  }
  if (status === 429) {
    return {
      verdict: "تقييد معدّل مؤقّت (429) — الحسابات المدفوعة حديثاً حدودها منخفضة.",
      fix: ["انتظر دقيقة وأعد المحاولة — التطبيق يعيد المحاولة تلقائيّاً أصلاً"],
    };
  }
  if (status >= 200 && status < 300) {
    return { verdict: "المزوّد يعمل ✅ — الملخّص الدراسي جاهز.", fix: [] };
  }
  return {
    verdict: `ردّ غير متوقّع (${status}) — اقرأ chatBody أدناه.`,
    fix: ["أرسل محتوى chatBody للدعم أو للمطوّر لتشخيص أدقّ"],
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "للمالك فقط" }, { status: 403 });
  }

  const key = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "";
  const baseUrl = (
    process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
  ).replace(/\/$/, "");
  const cfg = await getStudyConfig().catch(() => null);
  const model = cfg?.model || "qwen-plus-latest";

  const out: Record<string, unknown> = {
    qwenKeyPresent: Boolean(key),
    qwenKeyLength: key.length,
    baseUrl,
    studyModel: model,
    isQwenModel: model.startsWith("qwen-"),
  };

  if (!model.startsWith("qwen-")) {
    out.note = "study_model الحالي ليس qwen-* — الملخّص الدراسي لا يستعمل علي بابا أصلاً.";
  }
  if (!key) {
    out.verdict = "QWEN_API_KEY غير مضبوط على الخادم — أضِفه في Vercel ثمّ Redeploy.";
    return NextResponse.json(out);
  }

  // اختبار ١: صلاحيّة المفتاح والمنطقة عبر قائمة النماذج
  try {
    const r = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    out.modelsStatus = r.status;
    if (!r.ok) out.modelsBody = (await r.text()).slice(0, 300);
  } catch (e) {
    out.modelsError = (e as Error).message;
  }

  // اختبار ٢: نداء دردشة حقيقيّ مصغّر (كلفة تقارب الصفر عند النجاح) —
  // يستخرج الخطأ الخام الفعليّ الذي يمنع الملخّص الدراسي.
  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "قل: نعم" }],
        max_tokens: 8,
      }),
    });
    const body = (await r.text()).slice(0, 500);
    out.chatStatus = r.status;
    out.chatBody = body;
    const { verdict, fix } = qwenVerdict(r.status, body);
    out.verdict = verdict;
    if (fix.length) out.fixSteps = fix;
  } catch (e) {
    out.chatError = (e as Error).message;
    out.verdict = "تعذّر الوصول لخادم علي بابا من الخادم — تحقّق من الشبكة/القاعدة.";
  }

  return NextResponse.json(out);
}
