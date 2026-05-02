// src/app/(app)/billing/return/page.tsx
// ─────────────────────────
// صفحة العودة من Tap بعد محاولة الدفع
// ─────────────────────────

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function BillingReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ tx?: string }>;
}) {
  const { tx: txId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!txId) {
    return (
      <div className="text-center py-12">
        <p>معرّف المعاملة مفقود</p>
        <Link href="/billing" className="text-[#0A2E54] underline mt-4 inline-block">
          العودة للفوترة
        </Link>
      </div>
    );
  }

  const transaction = await db.transaction.findUnique({
    where: { id: txId },
  });

  if (!transaction || transaction.userId !== user.id) {
    return (
      <div className="text-center py-12">
        <p>المعاملة غير موجودة</p>
      </div>
    );
  }

  const isPending = transaction.status === "PENDING";
  const isSuccess = transaction.status === "SUCCEEDED";
  const isFailed = transaction.status === "FAILED";

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white border rounded-2xl p-8 text-center">
        {isPending && (
          <>
            <div className="text-4xl mb-4">⏳</div>
            <h1 className="text-xl font-bold mb-2">جارٍ التحقّق من الدفع</h1>
            <p className="text-gray-600 mb-4">
              نتلقّى تأكيد الدفع من بوّابة الدفع. حدّث الصفحة بعد قليل.
            </p>
            <button
              onClick={() => location.reload()}
              className="bg-[#0A2E54] text-white px-6 py-2 rounded-full"
            >
              تحديث
            </button>
          </>
        )}

        {isSuccess && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-xl font-bold mb-2 text-green-700">تمّ الدفع بنجاح</h1>
            <p className="text-gray-600 mb-2">
              المبلغ: {(transaction.amountSar / 100).toLocaleString("ar-SA")} ﷼
            </p>
            {transaction.pagesGranted > 0 && (
              <p className="text-gray-600 mb-4">
                أُضيفت {transaction.pagesGranted.toLocaleString("ar-SA")} صفحة لرصيدك
              </p>
            )}
            <Link
              href="/upload"
              className="inline-block bg-[#0A2E54] text-white px-6 py-2 rounded-full"
            >
              ابدأ الرفع
            </Link>
          </>
        )}

        {isFailed && (
          <>
            <div className="text-4xl mb-4">✗</div>
            <h1 className="text-xl font-bold mb-2 text-red-700">فشلت عملية الدفع</h1>
            <p className="text-gray-600 mb-4">
              حدث خطأ أثناء معالجة الدفع. لم يُخصم أيّ مبلغ.
            </p>
            <Link
              href="/billing"
              className="inline-block bg-[#0A2E54] text-white px-6 py-2 rounded-full"
            >
              المحاولة مرّة أخرى
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
