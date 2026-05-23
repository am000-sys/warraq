// src/lib/auth.ts — Auth.js v5 + helpers
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      systemRole: "USER" | "SYSTEM_ADMIN";
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // عند تسجيل الدخول فقط: نخزّن المعرّف والدور في الـ token (مرّة واحدة)
      if (user?.id) {
        token.id = user.id;
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { systemRole: true },
        });
        token.systemRole = dbUser?.systemRole ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      // نقرأ من الـ token مباشرةً — دون استعلام قاعدة بيانات في كلّ طلب (أسرع)
      if (session.user) {
        session.user.id = String(token.id ?? "");
        let role = token.systemRole as "USER" | "SYSTEM_ADMIN" | undefined;
        // احتياط للجلسات القديمة التي لا تحوي الدور في الـ token
        if (!role && token.id) {
          const u = await db.user.findUnique({
            where: { id: String(token.id) },
            select: { systemRole: true },
          });
          role = (u?.systemRole as "USER" | "SYSTEM_ADMIN") ?? "USER";
        }
        session.user.systemRole = role ?? "USER";
      }
      return session;
    },
  },
});

// ── Helpers ──
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
  });
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "SYSTEM_ADMIN") {
    redirect("/dashboard");
  }
  return session.user;
}

// Existing API routes call this as: requireOrgRole(userId, orgId, roles?)
// Throws if forbidden (caller catches).
export async function requireOrgRole(
  userId: string,
  orgId: string,
  roles: Array<"OWNER" | "ADMIN" | "MEMBER"> = ["OWNER", "ADMIN", "MEMBER"],
) {
  const member = await db.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!member || !roles.includes(member.role as "OWNER" | "ADMIN" | "MEMBER")) {
    throw new Error("FORBIDDEN");
  }
  return member;
}
