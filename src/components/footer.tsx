// src/components/footer.tsx
// التذييل الداكن
// مرجع: design-reference/warraq-v3.html (function Footer)
import Link from "next/link";
import { Logo } from "@/components/logo";

const cols = [
  { title: "المنتج", links: [
    { l: "المميزات", href: "/#features" },
    { l: "الأسعار", href: "/pricing" },
    { l: "API", href: "/#api" },
    { l: "التوثيق", href: "/#docs" },
  ] },
  { title: "الشركة", links: [
    { l: "من نحن", href: "#" },
    { l: "المدونة", href: "#" },
    { l: "وظائف", href: "#" },
  ] },
  { title: "الدعم", links: [
    { l: "مركز المساعدة", href: "#" },
    { l: "تواصل معنا", href: "#" },
    { l: "حالة الخدمة", href: "#" },
  ] },
];

export function Footer() {
  return (
    <footer style={{ background: "var(--midnight)", padding: "64px 0 36px" }}>
      <div className="container-warraq">
        <div className="grid gap-12 mb-12" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
          <div>
            <Logo size={0.88} inverted />
            <p
              className="mt-4 max-w-[260px] font-light"
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.35)",
                lineHeight: 1.7,
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              منصة متخصصة في تحويل الكتب العربية المصوّرة إلى نصوص رقمية، مدعومة بأحدث نماذج الذكاء الاصطناعي.
            </p>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <div
                className="mb-4 uppercase"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: "Tajawal, sans-serif",
                  letterSpacing: "0.1em",
                }}
              >
                {col.title}
              </div>
              <ul className="list-none flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.l}>
                    <Link
                      href={l.href}
                      className="no-underline transition-colors hover:text-orange font-light"
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.4)",
                        fontFamily: "Tajawal, sans-serif",
                      }}
                    >
                      {l.l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="pt-7 flex justify-between items-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            © ٢٠٢٦ وَرَّاق · جميع الحقوق محفوظة
          </span>
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            صُنع بـ ♥ لخدمة التراث العربي
          </span>
        </div>
      </div>
    </footer>
  );
}
