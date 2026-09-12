// src/app/(auth)/signup/page.tsx — إنشاء حساب جديد
// صفحة خادميّة رقيقة: تقرأ إتاحة Google من البيئة وتمرّرها للنموذج (مكوّن عميل).
import { isGoogleAuthConfigured } from "@/lib/auth";
import { SignupForm } from "@/components/signup-form";

export const metadata = { title: "حساب جديد — ورّاق" };

export default function SignupPage() {
  return <SignupForm googleEnabled={isGoogleAuthConfigured} />;
}
