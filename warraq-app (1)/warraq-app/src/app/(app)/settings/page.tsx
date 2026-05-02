// src/app/(app)/settings/page.tsx
import { getCurrentUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = (await getCurrentUser())!;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">الإعدادات</h1>

      <div className="bg-white border rounded-2xl p-6 mb-4">
        <h2 className="font-bold mb-4">معلومات الحساب</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">الاسم</dt>
            <dd>{user.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">البريد الإلكتروني</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">رصيد الصفحات</dt>
            <dd className="font-bold text-[#0A2E54]">
              {user.pagesBalance.toLocaleString("ar-SA")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">تاريخ التسجيل</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString("ar-SA")}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white border rounded-2xl p-6">
        <h2 className="font-bold mb-3">المنطقة الخطرة</h2>
        <button className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-full">
          حذف الحساب
        </button>
      </div>
    </div>
  );
}
