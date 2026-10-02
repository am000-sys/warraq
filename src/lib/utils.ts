import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── أرقام عربيّة بفواصل الآلاف (للأرصدة والإحصاءات الكبيرة) ──
export function arNum(n: number): string {
  return n.toLocaleString("ar-SA");
}

// ── Arabic numeral helper ──
export function ar(n: number | string): string {
  const map: Record<string, string> = {
    "0": "٠",
    "1": "١",
    "2": "٢",
    "3": "٣",
    "4": "٤",
    "5": "٥",
    "6": "٦",
    "7": "٧",
    "8": "٨",
    "9": "٩",
  };
  return String(n).replace(/\d/g, (d) => map[d] || d);
}

// ── أرقام عربيّة حتميّة للأسعار ──
// لا تعتمد على بيانات اللغة في المتصفّح (toLocaleString)، فيطابق ما يُصيَّر على
// الخادم ما يُصيَّر في العميل حرفاً بحرف، ولا يقع اختلافٌ عند الإماهة.
export function arGrouped(n: number): string {
  return ar(Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬"));
}

// مبلغٌ بالهللات ⇒ ريالات: ٢٣ أو ٢١٫٥
export function arSar(halalas: number): string {
  const whole = Math.floor(halalas / 100);
  const frac = Math.round(halalas % 100);
  if (!frac) return arGrouped(whole);
  return `${arGrouped(whole)}٫${ar(String(frac).padStart(2, "0").replace(/0$/, ""))}`;
}

// كسرٌ عشريّ صغير (سعر الصفحة): ٠٫٠٤٦
export function arDecimal(n: number, digits = 3): string {
  return ar(String(Number(n.toFixed(digits)))).replace(".", "٫");
}
