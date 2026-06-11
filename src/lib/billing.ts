// src/lib/billing.ts — خصم رصيد الصفحات بأمان (ذرّي ومشروط)
// القاعدة: لا يُخصم رصيد إلا مقابل صفحات حُفظت فعلاً في نفس المعاملة، ولا يهبط
// الرصيد تحت الصفر أبداً (الخصم مشروط بكفايته — يصمد أمام الطلبات المتزامنة).
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// يُرمى عندما لا يكفي الرصيد لإتمام الخصم — يلتقطه المسار ويعيد 402
export class InsufficientBalanceError extends Error {
  constructor(message = "رصيد غير كافٍ") {
    super(message);
    this.name = "InsufficientBalanceError";
  }
}

// خصم مشروط داخل معاملة: ينجح فقط إن كان الرصيد ≥ المطلوب، وإلا يرمي
// InsufficientBalanceError فتتراجع المعاملة كاملة (لا صفحات بلا رصيد ولا رصيد سالب).
export async function chargeBalance(
  tx: Prisma.TransactionClient,
  userId: string,
  pages: number,
): Promise<void> {
  if (pages <= 0) return;
  const r = await tx.user.updateMany({
    where: { id: userId, pagesBalance: { gte: pages } },
    data: { pagesBalance: { decrement: pages } },
  });
  if (r.count === 0) throw new InsufficientBalanceError();
}

// رصيد المستخدم الحالي (لرسائل 402 الواضحة)
export async function currentBalance(userId: string): Promise<number> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { pagesBalance: true },
  });
  return u?.pagesBalance ?? 0;
}

// رسالة موحّدة عند نفاد الرصيد قبل البدء (تذكر المطلوب والمتاح بوضوح)
export function insufficientUpfrontMessage(required: number, available: number): string {
  return `رصيدك لا يكفي لمعالجة المستند كاملاً: يحتاج ${required.toLocaleString("ar-SA")} صفحة ولديك ${available.toLocaleString("ar-SA")}. اشحن رصيدك ثم أعد المحاولة — لن يُخصم شيء الآن.`;
}

// رسالة موحّدة عند نفاد الرصيد أثناء المعالجة (الصفحات المكتملة محفوظة)
export function balanceExhaustedMessage(processed: number, total: number): string {
  return `نفد رصيد الصفحات أثناء المعالجة — اكتملت ${processed.toLocaleString("ar-SA")} من ${total.toLocaleString("ar-SA")} صفحة وهي محفوظة في حسابك. اشحن رصيدك ثم أعد المحاولة لاستكمال الباقي.`;
}
