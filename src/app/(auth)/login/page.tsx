// src/app/(auth)/login/page.tsx — تسجيل الدخول
// صفحة خادميّة رقيقة: تقرأ إتاحة Google من البيئة وتمرّرها للنموذج (مكوّن عميل).
import { isGoogleAuthConfigured } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "تسجيل الدخول — ورّاق" };

export default function LoginPage() {
  return <LoginForm googleEnabled={isGoogleAuthConfigured} />;
}
