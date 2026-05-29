// src/app/api/blob-upload/route.ts — توكن رفع Vercel Blob من المتصفّح مباشرةً
// المتصفّح يرفع الملفّ إلى Blob دون المرور بجسم طلب الخادم (يتجاوز حدّ 4.5م).
import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/tiff",
          "image/webp",
        ],
        maximumSizeInBytes: 500 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // لا حاجة لإجراء — ننشئ الوظيفة من العميل بعد الرفع
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "فشل تحضير الرفع" },
      { status: 400 },
    );
  }
}
