// src/components/turnstile-widget.tsx — أداة التحدّي البشريّ (Cloudflare Turnstile)
//
// تُعرض فقط حين يُضبط مفتاح الموقع. في الغالب لا تُظهر شيئاً للمستخدم: تفحص
// المتصفّح بصمت وتُصدر رمزاً يتحقّق منه الخادم.
//
// معالجة الفشل صريحة لا صامتة: إن تعذّر تحميل سكربت Cloudflare (حجب أو انقطاع)
// نُعلم المستخدم ونتيح إعادة المحاولة — بدل أن يبقى زرّ الإرسال معطّلاً بلا سبب ظاهر.
"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      language?: string;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  reset: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const LOAD_TIMEOUT_MS = 10000;

export function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled && !window.turnstile) setFailed(true);
    }, LOAD_TIMEOUT_MS);

    function renderWidget() {
      if (cancelled || !boxRef.current || !window.turnstile) return;
      boxRef.current.innerHTML = "";
      try {
        widgetId.current = window.turnstile.render(boxRef.current, {
          sitekey: siteKey,
          language: "ar",
          theme: "light",
          callback: (token) => onToken(token),
          // انتهاء صلاحيّة الرمز أو خطأ: نُبطل الرمز فيُعاد التحدّي
          "expired-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null);
            setFailed(true);
          },
        });
        setFailed(false);
      } catch {
        setFailed(true);
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      // تحميل السكربت مرّة واحدة فقط مهما تكرّر التركيب
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", renderWidget, { once: true });
      script.addEventListener("error", () => setFailed(true), { once: true });
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [siteKey, onToken, attempt]);

  return (
    <div>
      <div ref={boxRef} />
      {failed && (
        <div
          style={{
            background: "rgba(201,123,132,0.08)",
            border: "1px solid rgba(201,123,132,0.25)",
            borderRadius: 12,
            padding: 10,
            fontSize: 12.5,
            lineHeight: 1.9,
            color: "var(--carbon)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          تعذّر تحميل فحص الأمان.{" "}
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "var(--orange)",
              fontFamily: "inherit",
              fontSize: "inherit",
              textDecoration: "underline",
            }}
          >
            أعِد المحاولة
          </button>
          {" "}أو استعمل التسجيل بحساب Google.
        </div>
      )}
    </div>
  );
}
