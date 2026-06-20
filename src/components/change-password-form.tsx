// src/components/change-password-form.tsx — نموذج تغيير كلمة المرور
"use client";

import { useState } from "react";
import { Lock, Check } from "lucide-react";
import { Field, FieldLabel, FieldControl } from "@/components/ui/field";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPwd !== confirm) {
      setError("كلمتا المرور الجديدتان غير متطابقتين");
      return;
    }
    if (newPwd.length < 8) {
      setError("كلمة المرور الجديدة ٨ أحرف على الأقلّ");
      return;
    }
    if (newPwd === current) {
      setError("كلمة المرور الجديدة لا يمكن أن تكون نفس الحاليّة");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: newPwd }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "تعذّر تغيير كلمة المرور");
      return;
    }

    setSuccess(true);
    setCurrent("");
    setNewPwd("");
    setConfirm("");
    setTimeout(() => setSuccess(false), 4000);
  }

  return (
    <div className="card" style={{ borderRadius: 16 }}>
      <h2
        className="flex items-center gap-2"
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "var(--carbon)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 6,
        }}
      >
        <Lock size={16} color="var(--orange)" />
        تغيير كلمة المرور
      </h2>
      <p
        className="font-light"
        style={{
          fontSize: 13,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 18,
        }}
      >
        لحماية حسابك، استعمل كلمة مرور قويّة (٨ أحرف على الأقلّ).
      </p>

      {success && (
        <div
          className="flex items-center gap-2 mb-4"
          style={{
            background: "var(--orange-soft)",
            border: "1px solid rgba(246,146,81,0.25)",
            color: "var(--orange)",
            borderRadius: 12,
            padding: 12,
            fontSize: 13,
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          <Check size={14} />
          تمّ تغيير كلمة المرور بنجاح
        </div>
      )}

      {error && (
        <div
          className="mb-4"
          style={{
            background: "rgba(201,123,132,0.10)",
            border: "1px solid rgba(201,123,132,0.20)",
            color: "var(--rose)",
            borderRadius: 12,
            padding: 12,
            fontSize: 13,
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 14 }}>
        <Field>
          <FieldLabel>كلمة المرور الحاليّة</FieldLabel>
          <FieldControl
            type="password"
            required
            dir="ltr"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>كلمة المرور الجديدة</FieldLabel>
          <FieldControl
            type="password"
            required
            minLength={8}
            dir="ltr"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>تأكيد كلمة المرور الجديدة</FieldLabel>
          <FieldControl
            type="password"
            required
            minLength={8}
            dir="ltr"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <button
          type="submit"
          disabled={loading || !current || !newPwd || !confirm}
          className="btn-primary"
          style={{ fontSize: 14, padding: "12px 24px", marginTop: 6, alignSelf: "flex-start" }}
        >
          {loading ? "..." : "تحديث كلمة المرور"}
        </button>
      </form>
    </div>
  );
}
