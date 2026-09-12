// src/app/api/admin/study-model/route.ts — ضبط نموذج الملخّص الدراسي (للمالك فقط)
//
// لماذا؟ ترتيب الأسبقيّة في getStudyConfig هو: صفّ SystemSetting ⇐ متغيّر البيئة
// ⇐ الافتراضيّ. فصفٌّ قديم في القاعدة (من تجربة مزوّد سابق) يُبطل كلّ ضبطٍ في
// البيئة بلا أثر ظاهر — وكانت معالجته تتطلّب وصولاً مباشراً إلى القاعدة.
// هذا المنفذ يكتب الصفّ نفسه، فيحسم التبديل أيّاً كان مصدر القيمة الحاليّة.
//
// POST { model, modelPremium? } = ضبط. DELETE = حذف الصفّين ليعود ضبط البيئة.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSupportedStudyModel, studyProviderReady, STUDY_KEYS } from "@/lib/study";

async function requireOwner() {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "SYSTEM_ADMIN") return null;
  return session.user;
}

async function setKey(key: string, value: string, description: string) {
  await db.systemSetting.upsert({
    where: { key },
    create: { key, value, description },
    update: { value },
  });
}

export async function POST(req: NextRequest) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "للمالك فقط" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    model?: unknown;
    modelPremium?: unknown;
  };
  const model = body.model;
  if (!isSupportedStudyModel(model)) {
    return NextResponse.json(
      { error: "معرّف نموذج غير مقبول — يبدأ بـ claude- أو qwen- أو kimi-/moonshot-" },
      { status: 400 },
    );
  }
  // رفض نموذجٍ لا مفتاح لمزوّده: الضبط عليه يُغلق الميزة بدل أن يفتحها.
  if (!studyProviderReady(model)) {
    return NextResponse.json(
      { error: "مفتاح مزوّد هذا النموذج غير مضبوط في البيئة" },
      { status: 400 },
    );
  }
  const premium = isSupportedStudyModel(body.modelPremium) ? body.modelPremium : model;
  if (!studyProviderReady(premium)) {
    return NextResponse.json(
      { error: "مفتاح مزوّد نموذج الدقّة القصوى غير مضبوط في البيئة" },
      { status: 400 },
    );
  }

  await setKey(STUDY_KEYS.model, model, "نموذج الملخّص الدراسي — الدقّة العالية");
  await setKey(STUDY_KEYS.modelPremium, premium, "نموذج الملخّص الدراسي — الدقّة القصوى");
  await db.auditLog
    .create({
      data: {
        userId: owner.id,
        action: "study.model_changed",
        entity: "system_setting",
        entityId: STUDY_KEYS.model,
        metadata: { model, modelPremium: premium },
      },
    })
    .catch(() => {});

  return NextResponse.json({ model, modelPremium: premium });
}

// حذف الصفّين: يعود النموذج إلى ما تضبطه البيئة (أو الافتراضيّ حسب المفتاح الموجود).
export async function DELETE() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "للمالك فقط" }, { status: 403 });
  await db.systemSetting.deleteMany({
    where: { key: { in: [STUDY_KEYS.model, STUDY_KEYS.modelPremium] } },
  });
  await db.auditLog
    .create({
      data: {
        userId: owner.id,
        action: "study.model_reset",
        entity: "system_setting",
        entityId: STUDY_KEYS.model,
      },
    })
    .catch(() => {});
  return NextResponse.json({ reset: true });
}
