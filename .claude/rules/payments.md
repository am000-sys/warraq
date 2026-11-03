---
paths:
  - "src/lib/payments*.ts"
  - "src/lib/tap.ts"
  - "src/lib/stripe.ts"
  - "src/lib/bank.ts"
  - "src/lib/packages.ts"
  - "src/app/api/tap/**"
  - "src/app/api/stripe/**"
  - "src/app/api/topup/**"
  - "src/app/*app*/billing/**"
  - "src/components/topup-client.tsx"
---

# الدفع والشحن
<!-- أُضيفت في 2026-11-03. حال القنوات نفسها في docs/growth/payments.md، فلا تُكرَّر هنا. -->
- اقرأ `docs/growth/payments.md` قبل أيّ تعديل هنا: حال كلّ قناة، وسبب إيقاف البطاقة.
- لا يُمنح رصيد على تحصيل اختباريّ أو غير مُسوّى، ولا يعمل الإنتاج بمفتاح Tap اختباريّ (#42).
- أيّ تغيير في سعر أو باقة يُسجَّل في `decisions.md` بتاريخه وسببه، ويُطابَق في صفحة الأسعار (`.claude/rules/marketing-claims.md`).
- مراجع: وثائق Tap https://developers.tap.company ووثائق Stripe https://stripe.com/docs
