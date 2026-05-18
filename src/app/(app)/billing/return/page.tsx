// src/app/(app)/billing/return/page.tsx — صفحة العودة من بوّابة الدفع
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ar } from "@/lib/utils";
import { CheckCircle, XCircle, Clock } from "lucide-react";

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
      <div className="text-center" style={{ padding: 48 }}>
        <p style={{ fontFamily: "Tajawal, sans-serif" }}>معرّف المعاملة مفقود</p>
        <Link
          href="/billing"
          className="inline-block mt-4 no-underline"
          style={{ color: "var(--orange)", fontFamily: "Tajawal, sans-serif" }}
        >
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
      <div className="text-center" style={{ padding: 48 }}>
        <p style={{ fontFamily: "Tajawal, sans-serif" }}>المعاملة غير موجودة</p>
      </div>
    );
  }

  const isPending = transaction.status === "PENDING";
  const isSuccess = transaction.status === "SUCCEEDED";
  const isFailed = transaction.status === "FAILED";

  return (
    <div className="mx-auto" style={{ maxWidth: 480, paddingTop: 24 }}>
      <div className="card text-center" style={{ borderRadius: 20, padding: 40 }}>
        {isPending && (
          <>
            <div
              className="mx-auto mb-4 flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(66,133,244,0.08)",
                color: "#4285f4",
              }}
            >
              <Clock size={28} />
            </div>
            <h1
              style={{
                fontFamily: "Tajawal, sans-serif",
                fontSize: 22,
                fontWeight: 500,
                color: "var(--carbon)",
                marginBottom: 8,
              }}
            >
              جارٍ التحقّق من الدفع
            </h1>
            <p
              className="font-light"
              style={{
                fontSize: 14,
                color: "var(--stone)",
                fontFamily: "Tajawal, sans-serif",
                marginBottom: 24,
                lineHeight: 1.7,
              }}
            >
              نتلقّى تأكيد الدفع من بوّابة الدفع. حدّث الصفحة بعد قليل.
            </p>
          </>
        )}

        {isSuccess && (
          <>
            <div
              className="mx-auto mb-4 flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--orange-soft)",
                color: "var(--orange)",
              }}
            >
              <CheckCircle size={28} />
            </div>
            <h1
              style={{
                fontFamily: "Tajawal, sans-serif",
                fontSize: 22,
                fontWeight: 500,
                color: "var(--carbon)",
                marginBottom: 8,
              }}
            >
              تمّ الدفع بنجاح
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--stone)",
                fontFamily: "Tajawal, sans-serif",
                marginBottom: 4,
              }}
            >
              المبلغ:{" "}
              <strong style={{ color: "var(--carbon)" }}>
                {(transaction.amountSar / 100).toLocaleString("ar-SA")} ﷼
              </strong>
            </p>
            {transaction.pagesGranted > 0 && (
              <p
                className="font-light"
                style={{
                  fontSize: 14,
                  color: "var(--stone)",
                  fontFamily: "Tajawal, sans-serif",
                  marginBottom: 24,
                }}
              >
                أُضيفت {ar(transaction.pagesGranted)} صفحة لرصيدك
              </p>
            )}
            <Link
              href="/upload"
              className="btn-primary inline-flex no-underline"
              style={{ fontSize: 14, padding: "12px 28px" }}
            >
              ابدأ الرفع
            </Link>
          </>
        )}

        {isFailed && (
          <>
            <div
              className="mx-auto mb-4 flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(201,123,132,0.10)",
                color: "var(--rose)",
              }}
            >
              <XCircle size={28} />
            </div>
            <h1
              style={{
                fontFamily: "Tajawal, sans-serif",
                fontSize: 22,
                fontWeight: 500,
                color: "var(--rose)",
                marginBottom: 8,
              }}
            >
              فشلت عملية الدفع
            </h1>
            <p
              className="font-light"
              style={{
                fontSize: 14,
                color: "var(--stone)",
                fontFamily: "Tajawal, sans-serif",
                marginBottom: 24,
                lineHeight: 1.7,
              }}
            >
              حدث خطأ أثناء معالجة الدفع. لم يُخصم أيّ مبلغ.
            </p>
            <Link
              href="/billing"
              className="btn-primary inline-flex no-underline"
              style={{ fontSize: 14, padding: "12px 28px" }}
            >
              المحاولة مرّة أخرى
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
