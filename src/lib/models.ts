// src/lib/models.ts — أسماء النماذج المعروضة للمستخدم (دون ذكر المزوّد)
export const MODEL_LABELS: Record<
  "HAIKU" | "SONNET" | "OPUS",
  { name: string; desc: string; tier: string }
> = {
  HAIKU: { name: "وَرَّاق سريع", desc: "سريع · للكتب الواضحة", tier: "مجاني" },
  SONNET: { name: "وَرَّاق متوازن", desc: "متوازن · موصى به", tier: "احترافي" },
  OPUS: { name: "وَرَّاق دقيق", desc: "الأدقّ · للمخطوطات الصعبة", tier: "مؤسسي" },
};

export function modelName(model: string): string {
  return MODEL_LABELS[model as keyof typeof MODEL_LABELS]?.name ?? model;
}
