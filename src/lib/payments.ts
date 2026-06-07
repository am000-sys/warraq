// src/lib/payments.ts — تسوية معاملات الدفع (مشترك بين الـ webhooks وصفحة العودة)
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { retrieveTapCharge } from "@/lib/tap";
import type { TransactionStatus } from "@prisma/client";

// ادّعاء ذرّي: ينقل المعاملة PENDING → SUCCEEDED مرّة واحدة فقط ثمّ يضيف الصفحات.
// آمن ضدّ التكرار حتّى لو تسابق الـ webhook مع صفحة العودة (لا ازدواج في الرصيد).
export async function creditTransaction(txId: string): Promise<void> {
  const claimed = await db.transaction.updateMany({
    where: { id: txId, status: "PENDING" },
    data: { status: "SUCCEEDED" },
  });
  if (claimed.count === 0) return; // عولِجت سابقاً — لا تُضِف الرصيد ثانية
  const tx = await db.transaction.findUnique({ where: { id: txId } });
  if (tx && tx.pagesGranted > 0 && tx.userId) {
    await db.user.update({
      where: { id: tx.userId },
      data: { pagesBalance: { increment: tx.pagesGranted } },
    });
  }
}

// تعليم المعاملة المعلّقة كفاشلة (لا يمسّ الرصيد)
export async function markTransactionFailed(txId: string): Promise<void> {
  await db.transaction.updateMany({
    where: { id: txId, status: "PENDING" },
    data: { status: "FAILED" },
  });
}

// تسوية احتياطيّة: تتحقّق من حالة الدفع مباشرةً من البوّابة لو كانت المعاملة معلّقة،
// فلا يعتمد إضافة الرصيد على وصول الـ webhook وحده. تُستدعى من صفحة العودة. idempotent.
export async function reconcilePendingTransaction(
  txId: string,
): Promise<TransactionStatus | null> {
  const tx = await db.transaction.findUnique({ where: { id: txId } });
  if (!tx) return null;
  if (tx.status !== "PENDING" || !tx.externalId) return tx.status;

  try {
    if (tx.gateway === "TAP") {
      const charge = await retrieveTapCharge(tx.externalId);
      const status = charge?.status;
      if (status === "CAPTURED") {
        await creditTransaction(txId);
        return "SUCCEEDED";
      }
      if (status === "FAILED" || status === "DECLINED") {
        await markTransactionFailed(txId);
        return "FAILED";
      }
    } else if (tx.gateway === "STRIPE" && stripe) {
      const sess = await stripe.checkout.sessions.retrieve(tx.externalId);
      if (sess.payment_status === "paid") {
        await creditTransaction(txId);
        return "SUCCEEDED";
      }
      if (sess.status === "expired") {
        await markTransactionFailed(txId);
        return "FAILED";
      }
    }
  } catch (err) {
    console.error("[reconcilePendingTransaction]", err);
  }
  return "PENDING";
}
