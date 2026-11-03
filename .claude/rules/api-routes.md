---
paths:
  - "src/app/api/**"
---

# مسارات الـ API
<!-- نُقل من CLAUDE.md (§٥ و§٩) في 2026-11-03. -->
- **لا تكسر** API routes الموجودة.
- قبل إضافة مسار جديد اقرأ مساراً مشابهاً موجوداً لتفهم النمط.
- المصادقة بـ `auth()`، وقاعدة البيانات بـ `db` (Prisma) من `@/lib/db`.
- تحقّق من الصلاحيّات (`requireOrgRole` و`requireAdmin` في `src/lib/auth.ts`).
- أعد JSON بصيغة `{ data }` أو `{ error }`.
