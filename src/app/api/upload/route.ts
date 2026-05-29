// src/app/api/upload/route.ts — توقيع رابط رفع R2
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { getUploadUrl, isStorageConfigured, isBlobConfigured } from "@/lib/storage";

const schema = z.object({
  fileName: z.string().min(1).max(500),
  fileSize: z.number().int().positive().max(500 * 1024 * 1024),
  contentType: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  // أفضليّة التخزين: R2 ثمّ Vercel Blob (كلاهما يتجاوز حدّ جسم الطلب 4.5م)
  if (!isStorageConfigured) {
    if (isBlobConfigured) {
      return NextResponse.json({ method: "blob" });
    }
    return NextResponse.json(
      {
        error: "التخزين غير مُعَدّ بعد",
        details:
          "فعّل Vercel Blob (نقرة واحدة) أو اضبط متغيّرات R2 على Vercel لرفع الملفّات الكبيرة.",
        configRequired: true,
      },
      { status: 503 },
    );
  }

  try {
    const data = schema.parse(await req.json());
    const ext = data.fileName.split(".").pop() || "bin";
    const storageKey = `uploads/${session.user.id}/${Date.now()}-${crypto
      .randomBytes(8)
      .toString("hex")}.${ext}`;
    const uploadUrl = await getUploadUrl(storageKey, data.contentType);
    return NextResponse.json({ method: "r2", uploadUrl, storageKey });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 },
      );
    }
    console.error("[upload]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}
