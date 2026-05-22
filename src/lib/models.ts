// src/lib/models.ts — أسماء النماذج المعروضة + معامل استهلاك الرصيد
// الأدقّ يستهلك رصيداً أكثر (يُعكَس فعلياً على الخصم)
export const MODEL_LABELS: Record<
  "HAIKU" | "SONNET" | "OPUS",
  { name: string; desc: string; tier: string; credits: number }
> = {
  HAIKU: { name: "سريع", desc: "سريع · للكتب الواضحة", tier: "اقتصادي", credits: 1 },
  SONNET: { name: "جيد", desc: "متوازن · موصى به", tier: "قياسي", credits: 2 },
  OPUS: { name: "فائق", desc: "الأدقّ · يستهلك رصيداً أكثر", tier: "متقدّم", credits: 4 },
};

export function modelName(model: string): string {
  return MODEL_LABELS[model as keyof typeof MODEL_LABELS]?.name ?? model;
}

// عدد وحدات الرصيد المستهلكة لكلّ صفحة بحسب النموذج
export function modelCredits(model: string): number {
  return MODEL_LABELS[model as keyof typeof MODEL_LABELS]?.credits ?? 1;
}
