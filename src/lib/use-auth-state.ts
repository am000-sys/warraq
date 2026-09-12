// src/lib/use-auth-state.ts — حالة الدخول في صفحات التسويق (عميل)
//
// لماذا نداء واحد مشترك؟ صفحات التسويق **ساكنة** (تُقدَّم من CDN) فلا يمكنها
// قراءة الجلسة على الخادم. وتعدّد المكوّنات المحتاجة للحالة (الشريط، البطل،
// شريط الدعوة) كان سيعني ثلاثة نداءات لنفس المسار — فنُخزّن الوعد على مستوى
// الوحدة ليتشاركه الجميع، ويُنفَّذ مرّة واحدة لكلّ تحميل صفحة.
"use client";

import { useEffect, useState } from "react";

export type AuthState = "loading" | "in" | "out";

let cached: Promise<boolean> | null = null;

function fetchAuthed(): Promise<boolean> {
  cached ??= fetch("/api/auth/session")
    .then((r) => r.json())
    .then((s) => Boolean(s?.user))
    .catch(() => false);
  return cached;
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    let alive = true;
    fetchAuthed().then((authed) => {
      if (alive) setState(authed ? "in" : "out");
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
