// src/app/(auth)/verify-email/page.tsx — إكمال تفعيل حساب بدأ ولم يكتمل
// (لمن أغلق التبويب قبل إدخال الرمز). يطلب البريد ثمّ الرمز، ويحوّل للدخول.
import { VerifyEmailClient } from "@/components/verify-email-client";

export const metadata = { title: "تفعيل الحساب — ورّاق" };

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
