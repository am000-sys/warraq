---
paths:
  - "src/lib/claude-addon.ts"
  - "src/components/claude-panel.tsx"
  - "src/lib/mistral.ts"
  - "src/lib/claude.ts"
  - "src/lib/ocr.ts"
---

# التفريغ وأدوات المستند
<!-- نُقل من CLAUDE.md (§١٠.٥) في 2026-11-03. -->
> **الحال في الكود (تحقّق في 2026-11-03):** أدوات المستند متاحة لكلّ مستخدم بلا قفل ولا خصم إضافيّ ما دامت مفعّلة عالمياً (`getClaudeAccess` في `src/lib/claude-addon.ts`، منذ aa5dfa7 في 2026-05-30). فوصفها أدناه بـ«الإضافي المدفوع» تصميمٌ سابق، لا الحال الحاليّة.

- **الأساسي:** OCR (التفريغ النصّي) عبر **Mistral** (`src/lib/mistral.ts`، نداء واحد للمستند) — متاح للجميع حسب الرصيد/الخطّة. يرجع إلى Claude إن لم يُضبط `MISTRAL_API_KEY`.
- **الإضافي المدفوع (مساعد المستند الذكي):** `تحسين الدقّة والتنسيق` (تصحيح القراءة + تنسيق Markdown + فصل الحواشي + رقم الصفحة) و`Generate Report`/تلخيص و`Ask Document` — **مدعومة بـ Mistral chat (سريعة)**، مع Claude كبديل. ليست ضمن الباقة الأساسيّة، وتُستدعى عند طلب المستخدم فقط.
- **المنطق المركزيّ:** `src/lib/claude-addon.ts` (`getClaudeAccess`, `canUseClaudeFeatures`, `trackClaudeUsage`).
- **الأهليّة:** عبر الخطّة (الخطط في `claude_addon_included_plans`) أو رصيد الاستخدام (`pagesBalance`)، حسب `claude_addon_mode`.
- **التحكّم:** كلّه في `SystemSetting` بمفاتيح `claude_addon_*` (تفعيل/سعر/طريقة الاحتساب/الحدّ الشهريّ) — **بلا جداول جديدة**.
- **التتبّع:** في `AuditLog` (action: `claude.*`). الخصم في وضع usage من `pagesBalance`.
- **الواجهة:** `src/components/claude-panel.tsx` على صفحة المستند — مفتوح للمؤهّل، مقفل مع upsell لغيره.
- **ملاحظة:** التفريغ الأساسي عبر Mistral؛ وخدمات Claude (Ask/Report) مستقلّة عنه كـ add-on مدفوع.
