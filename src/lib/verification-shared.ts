// src/lib/verification-shared.ts — ثوابت رمز التحقّق المشتركة مع مكوّنات العميل
// منفصلة عن verification.ts لأنّ ذلك يستورد crypto وPrisma (خادم فقط).
export const CODE_LENGTH = 6;
