// src/lib/auth.ts — Auth.js v5 + helpers
import { cache } from "react";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { verifyPassword, hashPassword, needsRehash } from "@/lib/password";
import { db } from "@/lib/db";
import { queueEmail, welcomeEmail } from "@/lib/email";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      systemRole: "USER" | "SYSTEM_ADMIN";
    } & DefaultSession["user"];
  }
}

// Google OAuth — يُفعَّل فقط إن ضُبط المفتاحان، فلا يظهر زرّ معطّل للمستخدم.
// يُقبل اسما Auth.js v5 (AUTH_GOOGLE_*) والاسمان الشائعان (GOOGLE_CLIENT_*).
const googleId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "";
const googleSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
export const isGoogleAuthConfigured = Boolean(googleId && googleSecret);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(isGoogleAuthConfigured
      ? [
          Google({
            clientId: googleId,
            clientSecret: googleSecret,
            // ربط حساب Google ببريد مسجَّل مسبقاً بكلمة مرور.
            // آمن هنا تحديداً لأنّ Google تتحقّق من ملكيّة البريد، ونرفض في
            // signIn أدناه أيّ ملفّ Google بـ email_verified غير صحيح — فلا
            // يستطيع أحد ادّعاء بريد غيره ليستولي على حسابه.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
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

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        // لا دخول قبل تفعيل البريد — الرمز أُرسل عند التسجيل، وصفحة /verify-email
        // تتيح طلب رمز جديد. (نعيد null لئلّا نكشف حال الحساب لمن يجرّب العناوين.)
        if (!user.emailVerified) return null;

        // ترحيل شفّاف للتجزئات القديمة الأثقل (كلفة 12) إلى الكلفة الحاليّة —
        // مرّة واحدة لكلّ مستخدم، فيصير كلّ دخول لاحق أسرع بوضوح
        if (needsRehash(user.passwordHash)) {
          const newHash = await hashPassword(password);
          await db.user
            .update({ where: { id: user.id }, data: { passwordHash: newHash } })
            .catch(() => {});
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  events: {
    // يقع لمستخدمي OAuth فقط (حسابات كلمة المرور يُنشئها مسار signup لدينا).
    // بريد Google متحقَّق منه أصلاً، فالحساب مفعَّل منذ لحظته.
    async createUser({ user }) {
      if (!user.id) return;
      await db.auditLog
        .create({
          data: { userId: user.id, action: "user.signup_google", entity: "user", entityId: user.id },
        })
        .catch(() => {});
      if (user.email) {
        queueEmail({ to: user.email, ...welcomeEmail(user.name ?? "") }, "welcome-google");
      }
    },
  },
  callbacks: {
    // حارس Google: لا نقبل ملفّاً بلا بريد متحقَّق منه — هو شرط سلامة ربط
    // الحسابات أعلاه. الدخول بكلمة المرور يُفحص في authorize.
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        return profile?.email_verified === true && Boolean(profile.email);
      }
      return true;
    },
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
// مُغلّف بـ cache: استدعاؤه عدّة مرّات في الطلب الواحد (layout + الصفحة) = استعلام واحد فقط.
// نضمّ الاشتراك وخطّته في الاستعلام نفسه (join) — يوفّر جولة قاعدة بيانات كاملة
// في كلّ صفحات اللوحة (كان الـ layout يستعلم عن الاشتراك على حدة).
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: { include: { plan: true } } },
  });
});

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
