// src/app/api/admin/mistral-test/route.ts — تشخيص اتصال Mistral (للمالك فقط)
// يفتحه المالك في المتصفّح: /api/admin/mistral-test
// يكشف: هل المفتاح مضبوط؟ وماذا يردّ Mistral فعلياً؟ — دون كشف المفتاح.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 30;

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "للمالك فقط" }, { status: 403 });
  }

  const key = process.env.MISTRAL_API_KEY;
  const out: Record<string, unknown> = {
    mistralKeyPresent: Boolean(key),
    mistralKeyLength: key ? key.length : 0,
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    r2Configured: Boolean(process.env.R2_ACCOUNT_ID),
    anthropicKeyPresent: Boolean(process.env.ANTHROPIC_API_KEY),
  };

  if (!key) {
    out.verdict = "MISTRAL_API_KEY غير مضبوط على الخادم — أضِفه في Vercel ثمّ Redeploy.";
    return NextResponse.json(out);
  }

  // اختبار ١: صلاحيّة المفتاح عبر قائمة النماذج
  try {
    const r = await fetch("https://api.mistral.ai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    out.modelsStatus = r.status;
    out.modelsBody = (await r.text()).slice(0, 300);
  } catch (e) {
    out.modelsError = (e as Error).message;
  }

  // اختبار ٢: نداء OCR فعليّ على PDF صغير جداً (صفحة بيضاء) عبر data URI
  // PDF أدنى صالح (صفحة فارغة) بصيغة base64:
  const tinyPdfB64 =
    "JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCAyMDAgMjAwXT4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTk0CiUlRU9G";
  try {
    const r = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: { type: "document_url", document_url: `data:application/pdf;base64,${tinyPdfB64}` },
        include_image_base64: false,
      }),
    });
    out.ocrStatus = r.status;
    out.ocrBody = (await r.text()).slice(0, 500);
  } catch (e) {
    out.ocrError = (e as Error).message;
  }

  out.verdict =
    out.ocrStatus === 200
      ? "Mistral يعمل ✓ — المشكلة ليست في الربط."
      : "فشل نداء Mistral OCR — انظر ocrStatus و ocrBody أعلاه.";
  return NextResponse.json(out);
}
