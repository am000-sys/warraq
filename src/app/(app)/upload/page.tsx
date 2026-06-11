// src/app/(app)/upload/page.tsx — رفع ملف جديد (غلاف خادم: يجلب الرصيد للفحص المسبق)
import { getCurrentUser } from "@/lib/auth";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  const user = await getCurrentUser();
  return <UploadForm balance={user?.pagesBalance ?? 0} />;
}
