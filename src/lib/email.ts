// src/lib/email.ts — Resend wrapper
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || "warraq <noreply@warraq.sa>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return;
  }
  // Resend لا يرمي استثناءً عند فشل الإرسال — بل يُرجع { error }.
  // نتحقّق منه صراحةً لئلّا يُبتلَع الخطأ بصمت (نطاق غير موثَّق، عنوان مرسِل خاطئ...).
  const { data, error } = await resend.emails.send({ from: FROM, ...opts });
  if (error) {
    console.error("[email] Resend rejected the send:", error);
    throw new Error(`Resend: ${error.message || error.name || "فشل الإرسال"}`);
  }
  return data;
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://warraq-nu.vercel.app";
  const jobUrl = `${appUrl}/jobs/${jobId}`;
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
