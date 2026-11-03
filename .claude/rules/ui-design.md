---
paths:
  - "src/app/**/*.tsx"
  - "src/components/**"
  - "src/app/globals.css"
  - "tailwind.config.js"
---

# الواجهة والنظام التصميمي
<!-- نُقل من CLAUDE.md (§٣ و§٥ و§١٠) في 2026-11-03. -->

**اقرأ أوّلاً:**
- `design-reference/warraq-v3.html` — التصميم المرجعي **النهائي** (1083 سطر، فيه كلّ الصفحات)
- `design-reference/warraq-tokens.css` — النظام التصميمي
- `design-reference/brand-assets/` — الشعار وهويّة العلامة
- `design-reference/screenshots/` — لقطات الشاشة

### الألوان (موجودة في `globals.css` كـ CSS variables)
```
--orange: #f69251     (اللون المميّز - الأزرار، الـ accents)
--carbon: #000000     (النصّ الأساسي)
--midnight: #181825   (للأزرار/الخلفيّات الداكنة)
--fog: #f7f7f7        (خلفيّة الصفحة الأساسيّة)
--snow: #ffffff       (البطاقات والأسطح)
--stone: #636363      (نصّ ثانوي)
--pebble: #949494     (نصّ خافت)
--border: #e8e8e8
```

### الخطوط
- **Tajawal** للعربيّة (300, 400, 500, 700)
- **Inter** للاتيني (400, 500, 600)

### الأشكال
- أزرار: `border-radius: 28px` (شكل دائري ممدّد)
- بطاقات: `border-radius: 24px`
- شارات: `border-radius: 100px`
- Nav bar: `border-radius: 32px` (يَطفو في الأعلى)

### الإيقاع البصري
- Padding: 24px أو 28px داخل البطاقات
- Gap: 8/12/16/24/32/48/64 (مضاعفات 4)
- Shadows ناعمة جدّاً (`rgba(24,24,37,0.10) 0px 2px 8px -2px`)

### الـ classes الجاهزة في `globals.css`
- `.btn-primary` — زرّ برتقالي
- `.btn-ghost` — زرّ أبيض بحدود
- `.badge` — شارة صغيرة
- `.card` — بطاقة بيضاء
- `.field` — حقل إدخال
- `.label` — تسمية حقل
- `.container-warraq` — حاوية بعرض 1160px

## أحكام
- **استعمل الـ tokens والـ classes** من `globals.css` بدل القيم المباشرة؛ وهو المرجع للقائمة الكاملة عند أيّ اختلاف مع ما فوق.
- ❌ **لا تستعمل** ألواناً خارج النظام التصميمي.
- ❌ **لا تستعمل** خطوطاً غير Tajawal و Inter.
- لصفحات التسويق وإعادة التصميم: مهارة `design-taste-frontend` (في `.agents/skills/`).
