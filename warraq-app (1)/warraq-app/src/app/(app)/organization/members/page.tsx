// src/app/(app)/organization/members/page.tsx
"use client";
import { useEffect, useState } from "react";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires: string;
}

export default function MembersPage() {
  const [orgId] = useState<string>(""); // يُملأ من URL أو context
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  useEffect(() => {
    if (orgId) refresh();
  }, [orgId]);

  async function refresh() {
    const res = await fetch(`/api/orgs/${orgId}/members`);
    const data = await res.json();
    setMembers(data.members ?? []);
    setInvitations(data.invitations ?? []);
  }

  async function handleInvite() {
    await fetch(`/api/orgs/${orgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setEmail("");
    refresh();
  }

  async function handleRemove(userId: string) {
    if (!confirm("إزالة هذا العضو؟")) return;
    await fetch(`/api/orgs/${orgId}/members?userId=${userId}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">الأعضاء</h1>

      <div className="bg-white border rounded-2xl p-4 mb-6">
        <h2 className="font-bold mb-3">دعوة عضو</h2>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="border rounded-lg px-3"
          >
            <option value="MEMBER">عضو</option>
            <option value="ADMIN">مدير</option>
          </select>
          <button
            onClick={handleInvite}
            className="bg-[#0A2E54] text-white px-5 rounded-full"
          >
            دعوة
          </button>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold mb-3">دعوات معلّقة</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl overflow-hidden">
            {invitations.map((i) => (
              <div key={i.id} className="px-4 py-2 text-sm border-b last:border-b-0">
                {i.email} · {i.role}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-bold mb-3">الأعضاء الحاليون</h2>
      <div className="bg-white border rounded-2xl overflow-hidden">
        {members.map((m) => (
          <div
            key={m.id}
            className="px-4 py-3 border-b last:border-b-0 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{m.user.name}</p>
              <p className="text-xs text-gray-500">
                {m.user.email} · {m.role}
              </p>
            </div>
            {m.role !== "OWNER" && (
              <button
                onClick={() => handleRemove(m.user.id)}
                className="text-xs text-red-600"
              >
                إزالة
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
