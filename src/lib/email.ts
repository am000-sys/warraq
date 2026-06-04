// src/lib/email.ts — Resend REST wrapper (direct fetch + إعادة محاولة على أخطاء الشبكة العابرة)
//
// لماذا الإعادة؟ على Vercel/Node قد يُعيد undici استخدام socket قديم أُغلق من الطرف
// الآخر، فيظهر ECONNRESET «قبل إنشاء اتّصال TLS» مع api.resend.com. محاولة جديدة
// تفتح اتّصالاً نظيفاً وتنجح غالباً. ولماذا queueEmail؟ لئلّا تُجمَّد دالّة serverless
// بعد إرجاع الاستجابة فتقتل الإرسال الجاري — فنُؤجّله عبر after() ليصمد بعد الردّ.

import { after } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "warraq <noreply@warraq.sa>";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://warraq-nu.vercel.app";

// فترات الانتظار قبل كلّ محاولة إعادة (ميلي ثانية)؛ المحاولة الأولى بلا انتظار
const RETRY_DELAYS_MS = [500, 2000];
const REQUEST_TIMEOUT_MS = 20000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// هل الخطأ شبكيّ عابر يستحقّ إعادة المحاولة؟ (ECONNRESET، انقطاع socket، مهلة، DNS عابر)
function isTransientNetworkError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; code?: string; cause?: { code?: string } };
  if (e.name === "AbortError") return true; // انتهت المهلة المحلّيّة
  const code = e.code ?? e.cause?.code;
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "EPIPE" ||
    code === "EAI_AGAIN" ||
    code === "UND_ERR_SOCKET" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "UND_ERR_HEADERS_TIMEOUT" ||
    code === "UND_ERR_BODY_TIMEOUT"
  );
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return;
  }

  const body = JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
  const maxAttempts = RETRY_DELAYS_MS.length + 1;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // مهلة لكلّ محاولة لئلّا تتعلّق الدالّة إلى ما لا نهاية
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      lastErr = err;
      // أخطاء الشبكة العابرة: أعد المحاولة ما دامت هناك محاولات متبقّية
      if (isTransientNetworkError(err) && attempt < maxAttempts) {
        console.warn(
          `[email] network error (attempt ${attempt}/${maxAttempts}), retrying:`,
          (err as Error)?.message ?? err,
        );
        await sleep(RETRY_DELAYS_MS[attempt - 1]);
        continue;
      }
      console.error("[email] fetch to Resend API failed (network):", err);
      throw err;
    } finally {
      clearTimeout(timer);
    }

    // 5xx و429: أخطاء عابرة من الخادم — أعد المحاولة
    if ((res.status >= 500 || res.status === 429) && attempt < maxAttempts) {
      console.warn(`[email] Resend HTTP ${res.status} (attempt ${attempt}/${maxAttempts}), retrying`);
      lastErr = new Error(`Resend HTTP ${res.status}`);
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
      continue;
    }

    // 4xx (مفتاح خاطئ، نطاق غير موثَّق...): لا تُعِد المحاولة — اعرض السبب
    if (!res.ok) {
      let detail: unknown;
      try { detail = await res.json(); } catch { detail = await res.text().catch(() => ""); }
      console.error("[email] Resend rejected the send:", detail);
      const msg = typeof detail === "object" && detail !== null && "message" in detail
        ? String((detail as Record<string, unknown>).message)
        : `HTTP ${res.status}`;
      throw new Error(`Resend: ${msg}`);
    }

    return res.json();
  }

  // استُنفدت كلّ المحاولات بأخطاء شبكة
  console.error("[email] all retries exhausted:", lastErr);
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Resend: تعذّر الاتّصال بخدمة البريد بعد عدّة محاولات");
}

// أرسل بريداً دون حجب الاستجابة، مع ضمان تنفيذه بعد إرسال الردّ (يصمد في serverless).
// يبتلع الأخطاء ويسجّلها فقط — فلا يُسقِط الطلب الأساسيّ بسبب فشل البريد.
export function queueEmail(
  opts: { to: string; subject: string; html: string },
  context = "send",
) {
  const run = () =>
    sendEmail(opts).catch((err) => console.error(`[email] ${context} failed:`, err));
  try {
    // after() يؤجّل العمل لما بعد الاستجابة ويُبقي الدالّة حيّة حتى يكتمل
    after(run);
  } catch {
    // إن استُدعي خارج سياق طلب (after غير متاح)، أرسل مباشرةً كحلّ احتياطيّ
    void run();
  }
}

export function passwordResetEmail(name: string, resetUrl: string) {
  return {
    subject: "إعادة تعيين كلمة المرور — وَرَّاق",
    html: `
      <div style="font-family: 'Tajawal', sans-serif; direction: rtl; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="font-weight: 500; color: #181825;">مرحباً ${name}،</h2>
        <p style="color: #484758; line-height: 1.7;">
          تلقّينا طلباً لإعادة تعيين كلمة المرور لحسابك في وَرَّاق.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #f69251; color: #000; padding: 12px 28px; border-radius: 28px; text-decoration: none; font-weight: 500; margin: 16px 0;">
          إعادة تعيين كلمة المرور
        </a>
        <p style="color: #949494; font-size: 13px; line-height: 1.7;">
          إن لم تطلب ذلك، تجاهل هذه الرسالة. الرابط صالح لمدّة ساعة.
        </p>
      </div>
    `,
  };
}

export function newTopupForOwnerEmail(userEmail: string, pages: number, amountSar: number) {
  return {
    subject: "طلب شحن جديد بانتظار المراجعة — وَرَّاق",
    html: `
      <div style="font-family: 'Tajawal', sans-serif; direction: rtl; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="font-weight: 500; color: #181825;">طلب شحن جديد</h2>
        <p style="color: #484758; line-height: 1.7;">
          من: <strong>${userEmail}</strong><br>
          الباقة: <strong style="color:#f69251;">${pages}</strong> صفحة · ${(amountSar / 100).toLocaleString("ar-SA")} ريال
        </p>
        <a href="https://warraq-nu.vercel.app/admin/topups" style="display: inline-block; background: #f69251; color: #000; padding: 12px 28px; border-radius: 28px; text-decoration: none; font-weight: 500; margin: 16px 0;">
          مراجعة الطلب
        </a>
      </div>
    `,
  };
}

export function topupApprovedEmail(name: string, pages: number) {
  return {
    subject: "تمّ شحن رصيدك — وَرَّاق",
    html: `
      <div style="font-family: 'Tajawal', sans-serif; direction: rtl; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="font-weight: 500; color: #181825;">مرحباً ${name}،</h2>
        <p style="color: #484758; line-height: 1.7;">
          تمّ اعتماد حوالتك وإضافة <strong style="color:#f69251;">${pages}</strong> صفحة إلى رصيدك.
        </p>
        <a href="https://warraq-nu.vercel.app/upload" style="display: inline-block; background: #f69251; color: #000; padding: 12px 28px; border-radius: 28px; text-decoration: none; font-weight: 500; margin: 16px 0;">
          ابدأ المعالجة
        </a>
        <p style="color: #949494; font-size: 13px;">شكراً لاستخدامك وَرَّاق.</p>
      </div>
    `,
  };
}

export function welcomeEmail(name: string) {
  return {
    subject: "أهلاً بك في وَرَّاق",
    html: `
      <div style="font-family: 'Tajawal', sans-serif; direction: rtl; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="font-weight: 500; color: #181825;">أهلاً ${name}،</h2>
        <p style="color: #484758; line-height: 1.7;">
          شكراً لانضمامك إلى وَرَّاق — منصّتك لتحويل التراث العربي إلى نصوص قابلة للبحث.
        </p>
        <p style="color: #484758; line-height: 1.7;">
          لديك ٥ صفحات مجانية لتجرّب المنصّة. ابدأ من الآن.
        </p>
      </div>
    `,
  };
}

export function jobCompletedEmail(
  name: string,
  fileName: string,
  pages: number,
  jobId: string,
) {
  const jobUrl = `${APP_URL}/jobs/${jobId}`;
  const pagesAr = pages.toLocaleString("ar-SA");
  return {
    subject: `اكتمل تفريغ "${fileName}" — وَرَّاق`,
    html: `
      <div style="font-family: 'Tajawal', sans-serif; direction: rtl; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="font-weight: 500; color: #181825;">مرحباً ${name}،</h2>
        <p style="color: #484758; line-height: 1.8;">
          اكتمل تفريغ ملفّك بنجاح.
        </p>
        <div style="background: #f7f7f7; border-radius: 16px; padding: 20px 24px; margin: 16px 0;">
          <p style="margin: 0 0 6px; font-weight: 500; color: #181825;">${fileName}</p>
          <p style="margin: 0; font-size: 14px; color: #636363;">
            ${pagesAr} صفحة مفرَّغة
          </p>
        </div>
        <a href="${jobUrl}"
           style="display: inline-block; background: #f69251; color: #000; padding: 12px 28px; border-radius: 28px; text-decoration: none; font-weight: 500; margin: 8px 0;">
          عرض النتائج
        </a>
        <p style="color: #949494; font-size: 13px; margin-top: 20px; line-height: 1.6;">
          يمكنك تصدير النصّ بصيغ TXT أو Word أو JSON من صفحة الوظيفة.
        </p>
      </div>
    `,
  };
}
