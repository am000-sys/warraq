// src/lib/failure-hints.ts
// تلميحات عمليّة ودّيّة عند فشل المعالجة — معالجة نصّيّة خالصة بلا أيّ نداء API ولا تكلفة.
// مبنيّ على ملاحظة عمليّة من الاستخدام الواقعيّ: كثير من حالات الفشل سببها كِبَر حجم
// الملفّ (مسح بدقّة عالية)، وضغطه أو تقليل الدقّة ثمّ إعادة رفعه يحلّها في الغالب.

export type FailureHint = {
  title: string; // العنوان: السبب الأرجح
  tips: string[]; // خطوات عمليّة مرتّبة بالأولويّة
};

// عتبة ننصح عندها بالضغط قبل الرفع (٤٠ ميجابايت) — قريبة من حدود خدمة التفريغ
export const LARGE_FILE_BYTES = 40 * 1024 * 1024;

// إشارات نصّيّة في رسالة الخطأ تدلّ على أنّ الفشل متعلّق بالحجم أو المهلة
const SIZE_SIGNALS =
  /(too\s*large|payload|413|content[\s-]?length|body\s*size|request entity|size\s*limit|exceed|413|timeout|timed?\s*out|504|408|abort|deadline|memory|heap|مهلة|كبير|الحجم)/i;

// إشارات تدلّ على أنّ الفشل سببه نفاد رصيد الصفحات (وليس عطلاً تقنيّاً)
const BALANCE_SIGNALS = /(رصيد|نفد|insufficient|402)/i;

const COMPRESS_TIP =
  "اضغط الملفّ (قلّل حجمه أو دقّة المسح) ثمّ أعِد رفعه — هذا يحلّ أغلب حالات الفشل.";
const SPLIT_TIP = "إن كان كتاباً كبيراً، قسّمه إلى أجزاء أصغر وارفع كلّ جزء على حدة.";
const CLARITY_TIP = "تأكّد أنّ الصفحات واضحة وغير مائلة أو شديدة الإظلام.";
const RETRY_TIP = "قد يكون ازدحاماً مؤقّتاً في الخدمة — انتظر دقيقة ثمّ أعِد المحاولة.";

// يحلّل رسالة الخطأ (إن وُجدت) ويعيد تلميحاً عمليّاً.
// نُقدّم نصيحة الضغط أوّلاً دائماً لأنّها السبب الأكثر شيوعاً في تجربتنا.
export function failureHint(errorMessage?: string | null): FailureHint {
  const msg = errorMessage ?? "";
  if (BALANCE_SIGNALS.test(msg)) {
    return {
      title: "توقّفت المعالجة لنفاد رصيد الصفحات",
      tips: [
        "اشحن رصيدك من صفحة «الفوترة» ثمّ أعد المحاولة.",
        "الصفحات التي اكتملت محفوظة في حسابك ويمكنك تصفّحها وتصديرها الآن.",
        "لن تُخصم الصفحات المكتملة مرّتين عند إعادة المحاولة.",
      ],
    };
  }
  if (SIZE_SIGNALS.test(msg)) {
    return {
      title: "يبدو أنّ حجم الملفّ كبير على المعالجة",
      tips: [COMPRESS_TIP, SPLIT_TIP, RETRY_TIP],
    };
  }
  return {
    title: "تلميحات لإنجاح المعالجة",
    tips: [COMPRESS_TIP, SPLIT_TIP, CLARITY_TIP, RETRY_TIP],
  };
}

// تلميح استباقيّ يُعرض قبل بدء المعالجة عند كِبَر حجم الملفّ (دون انتظار فشل).
// يعيد null إن كان الحجم ضمن الحدّ الآمن. الرقم يُنسّق في الواجهة (أرقام عربيّة).
export function largeFileMB(fileSizeBytes: number): number | null {
  if (fileSizeBytes < LARGE_FILE_BYTES) return null;
  return Math.round(fileSizeBytes / (1024 * 1024));
}
