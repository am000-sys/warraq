// src/app/api/try/route.ts — تجربة مجانيّة دون تسجيل (محدودة بالـ IP)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isClaudeConfigured, extractTextFromImage } from "@/lib/claude";
import { isImageFile, imageBufferToPage } from "@/lib/pdf";

export const maxDuration = 120;

// عدد الصفحات المجانيّة لكلّ عنوان IP
const FREE_TRIES_PER_IP = 2;

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  if (!isClaudeConfigured) {
    return NextResponse.json(
      { error: "خدمة التجربة غير متاحة حالياً." },
      { status: 503 },
    );
  }

  const ip = getClientIp(req);

  // تحقّق من عدد المحاولات لهذا الـ IP
  const usage = await db.trialUsage.findUnique({ where: { ip } });
  if (usage && usage.count >= FREE_TRIES_PER_IP) {
    return NextResponse.json(
      {
        error: "انتهت تجربتك المجانيّة. سجّل حساباً للحصول على المزيد.",
        limitReached: true,
      },
      { status: 429 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "لا يوجد ملفّ" }, { status: 400 });
    if (!isImageFile(file.name)) {
      return NextResponse.json(
        { error: "التجربة المجانيّة تقبل الصور فقط (PNG/JPG)." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 6 * 1024 * 1024) {
      return NextResponse.json({ error: "حجم الصورة كبير (الحدّ ٦ ميجابايت)." }, { status: 400 });
    }

    const page = imageBufferToPage(buffer, file.name);
    const result = await extractTextFromImage(page.base64, page.mediaType, "OPUS");

    // سجّل الاستخدام (increment أو إنشاء)
    await db.trialUsage.upsert({
      where: { ip },
      create: { ip, count: 1, lastAt: new Date() },
      update: { count: { increment: 1 }, lastAt: new Date() },
    });

    const remaining = Math.max(0, FREE_TRIES_PER_IP - ((usage?.count ?? 0) + 1));
    return NextResponse.json({ text: result.text, remaining });
  } catch (err) {
    console.error("[try]", err);
    const msg = (err as Error)?.message?.toLowerCase() ?? "";
    if (msg.includes("credit") || msg.includes("authentication") || msg.includes("x-api-key")) {
      return NextResponse.json(
        { error: "خدمة التجربة متوقّفة مؤقّتاً. حاول لاحقاً." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "تعذّرت المعالجة. تأكّد من وضوح الصورة." },
      { status: 500 },
    );
  }
}
