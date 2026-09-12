// src/app/api/auth/verify-email/route.ts — إكمال تفعيل الحساب برمز البريد
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { queueEmail, welcomeEmail } from "@/lib/email";
import { verifyCode, CODE_LENGTH } from "@/lib/verification";

const schema = z.object({
  email: z.string().email(),
  // تُقبل المسافات الطرفيّة (لصق من البريد) ثمّ يُتحقّق من الأرقام
  code: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => new RegExp(`^\\d{${CODE_LENGTH}}$`).test(v), "رمز غير صالح"),
});

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, code } = schema.parse(await req.json());
    const email = rawEmail.toLowerCase().trim();

    const result = await verifyCode(email, code);
    if (!result.ok) {
      const messages = {
        invalid: "الرمز غير صحيح — تأكّد منه أو اطلب رمزاً جديداً.",
        expired: "انتهت صلاحيّة الرمز — اطلب رمزاً جديداً.",
        too_many: "محاولات كثيرة خاطئة. انتظر قليلاً ثمّ أعد المحاولة.",
      } as const;
      return NextResponse.json(
        { error: messages[result.reason] },
        { status: result.reason === "too_many" ? 429 : 400 },
      );
    }

    // الرمز صحيح ومُستهلَك — يبقى تعليم الحساب مفعَّلاً.
    // تحديث مشروط بعدم التفعيل مسبقاً، فلا تتكرّر رسالة الترحيب عند طلبين متزامنين.
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, emailVerified: true },
    });
    if (!user) {
      return NextResponse.json({ error: "لا يوجد حساب بهذا البريد" }, { status: 404 });
    }

    if (!user.emailVerified) {
      const claimed = await db.user.updateMany({
        where: { id: user.id, emailVerified: null },
        data: { emailVerified: new Date() },
      });
      if (claimed.count > 0) {
        await db.auditLog
          .create({
            data: { userId: user.id, action: "user.verified", entity: "user", entityId: user.id },
          })
          .catch(() => {});
        queueEmail({ to: email, ...welcomeEmail(user.name ?? "") }, "welcome");
      }
    }

    return NextResponse.json({ verified: true });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "رمز غير صالح" }, { status: 400 });
    }
    console.error("[verify-email]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}
