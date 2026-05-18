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
  await resend.emails.send({ from: FROM, ...opts });
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
          لديك ٥٠ صفحة مجانية لتجرّب المنصّة. ابدأ من الآن.
        </p>
      </div>
    `,
  };
}
