// src/app/(app)/organization/members/page.tsx — إدارة الأعضاء
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Trash2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires: string;
}

export default function MembersPage() {
  const params = useSearchParams();
  const orgId = params.get("orgId") ?? "";

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orgId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function refresh() {
    const res = await fetch(`/api/orgs/${orgId}/members`);
    const data = await res.json();
    setMembers(data.members ?? []);
    setInvitations(data.invitations ?? []);
  }

  async function handleInvite() {
    if (!email) return;
    setLoading(true);
    await fetch(`/api/orgs/${orgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setLoading(false);
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
      <PageHeader title="الأعضاء" subtitle="إدارة فريق المؤسسة." />

      {/* Invite form */}
      <div className="card mb-5" style={{ borderRadius: 16 }}>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--carbon)",
            fontFamily: "Tajawal, sans-serif",
            marginBottom: 14,
          }}
        >
          دعوة عضو
        </h2>
        <div className="flex gap-2.5">
          <Input
            type="email"
            aria-label="البريد الإلكتروني"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            className="flex-1 text-right"
          />
          <Select
            value={role}
            onValueChange={(v) => setRole(v as "ADMIN" | "MEMBER")}
          >
            <SelectTrigger aria-label="الدور" className="w-[120px]">
              <SelectValue>{(v) => (v === "ADMIN" ? "مدير" : "عضو")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEMBER">عضو</SelectItem>
              <SelectItem value="ADMIN">مدير</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={handleInvite}
            disabled={!email || loading}
            className="btn-primary"
            style={{ fontSize: 14, padding: "12px 24px" }}
          >
            <UserPlus size={14} />
            دعوة
          </button>
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="mb-5">
          <h2
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--carbon)",
              fontFamily: "Tajawal, sans-serif",
              marginBottom: 12,
            }}
          >
            دعوات معلّقة
          </h2>
          <div
            className="card"
            style={{
              borderRadius: 16,
              padding: "8px 16px",
              background: "var(--orange-soft)",
              border: "1px solid rgba(246,146,81,0.20)",
            }}
          >
            {invitations.map((inv, i) => (
              <div
                key={inv.id}
                className="flex items-center justify-between"
                style={{
                  padding: "12px 8px",
                  borderBottom:
                    i < invitations.length - 1 ? "1px solid rgba(246,146,81,0.15)" : "none",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Mail size={14} color="var(--orange)" />
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--carbon)",
                      fontFamily: "Inter, sans-serif",
                      direction: "ltr",
                    }}
                  >
                    {inv.email}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--orange)",
                    fontFamily: "Tajawal, sans-serif",
                  }}
                >
                  {roleLabel(inv.role)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current members */}
      <h2
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--carbon)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 12,
        }}
      >
        الأعضاء الحاليون
      </h2>
      <div className="card" style={{ borderRadius: 16, padding: "8px 16px" }}>
        {members.length === 0 ? (
          <p
            className="text-center"
            style={{
              padding: 24,
              color: "var(--pebble)",
              fontFamily: "Tajawal, sans-serif",
              fontSize: 14,
            }}
          >
            لا يوجد أعضاء بعد.
          </p>
        ) : (
          members.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center justify-between"
              style={{
                padding: "14px 10px",
                borderBottom: i < members.length - 1 ? "1px solid var(--border-sub)" : "none",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--orange-soft)",
                    border: "1px solid rgba(246,146,81,0.25)",
                    fontSize: 13,
                    color: "var(--orange)",
                    fontFamily: "Tajawal, sans-serif",
                  }}
                >
                  {(m.user.name || m.user.email)[0]?.toUpperCase()}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--carbon)",
                      fontFamily: "Tajawal, sans-serif",
                      marginBottom: 1,
                    }}
                  >
                    {m.user.name || m.user.email.split("@")[0]}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--pebble)",
                      fontFamily: "Inter, sans-serif",
                      direction: "ltr",
                    }}
                  >
                    {m.user.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="badge"
                  style={{ fontSize: 11 }}
                >
                  {roleLabel(m.role)}
                </span>
                {m.role !== "OWNER" && (
                  <button
                    onClick={() => handleRemove(m.user.id)}
                    className="cursor-pointer"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--rose)",
                      padding: 6,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function roleLabel(role: string) {
  return ({ OWNER: "المالك", ADMIN: "مدير", MEMBER: "عضو" } as Record<string, string>)[role] ?? role;
}
