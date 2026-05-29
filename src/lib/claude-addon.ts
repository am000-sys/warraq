// src/lib/claude-addon.ts
// المنطق المركزيّ لخدمات Claude الإضافيّة المدفوعة (Ask Document / Generate Report).
// Claude ليست ضمن الخدمة الأساسيّة (OCR) — بل add-on مربوط بنظام التسعير الحالي:
//  - الأهليّة عبر الخطّة (الخطط المشمولة) أو عبر رصيد الاستخدام (pagesBalance).
//  - الإعداد كلّه في SystemSetting (قابل للتحكّم لاحقاً من لوحة الإدارة) — بلا جداول جديدة.
//  - التتبّع في AuditLog.
import { db } from "@/lib/db";
import type { ClaudeModel } from "@prisma/client";

export type ClaudeActionType =
  | "ask"
  | "report-summary"
  | "report-executive-summary"
  | "report-key-points"
  | "report-structured"
  | "proofread"
  | "index"
  | "translate";

export const CLAUDE_ACTION_TYPES: ClaudeActionType[] = [
  "ask",
  "report-summary",
  "report-executive-summary",
  "report-key-points",
  "report-structured",
  "proofread",
  "index",
  "translate",
];

export type ClaudeConfig = {
  enabled: boolean; // تفعيل/تعطيل الميزة عالمياً
  mode: "plan" | "usage" | "plan_or_usage"; // طريقة الأهليّة
  includedPlanSlugs: string[]; // الخطط التي تتضمّن الإضافة
  costPerAction: number; // وحدات الرصيد المخصومة لكلّ عمليّة (وضع usage)
  monthlyLimit: number; // حدّ شهريّ لعمليّات الخطّة (0 = بلا حدّ)
  textModel: ClaudeModel; // نموذج Claude النصّي لخدمات الفهم
};

const DEFAULTS: ClaudeConfig = {
  enabled: true, // مفعّلة — مدعومة بـ Mistral chat (سريعة)
  mode: "plan",
  includedPlanSlugs: ["researcher", "verifier"],
  costPerAction: 5,
  monthlyLimit: 0,
  textModel: "OPUS",
};

const KEYS = {
  enabled: "claude_addon_enabled",
  mode: "claude_addon_mode",
  includedPlans: "claude_addon_included_plans",
  costPerAction: "claude_addon_cost_per_action",
  monthlyLimit: "claude_addon_monthly_limit",
  textModel: "claude_addon_text_model",
} as const;

// يقرأ الإعداد من SystemSetting مع قيَم افتراضيّة آمنة (يعمل حتى لو غابت الصفوف)
export async function getClaudeConfig(): Promise<ClaudeConfig> {
  try {
    const rows = await db.systemSetting.findMany({
      where: { key: { in: Object.values(KEYS) } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value as unknown]));
    const cfg: ClaudeConfig = { ...DEFAULTS };

    if (map.has(KEYS.enabled)) cfg.enabled = Boolean(map.get(KEYS.enabled));
    const mode = map.get(KEYS.mode);
    if (mode === "plan" || mode === "usage" || mode === "plan_or_usage") cfg.mode = mode;
    const plans = map.get(KEYS.includedPlans);
    if (Array.isArray(plans)) cfg.includedPlanSlugs = plans.map(String);
    const cost = Number(map.get(KEYS.costPerAction));
    if (Number.isFinite(cost) && cost >= 0) cfg.costPerAction = Math.round(cost);
    const limit = Number(map.get(KEYS.monthlyLimit));
    if (Number.isFinite(limit) && limit >= 0) cfg.monthlyLimit = Math.round(limit);
    const m = map.get(KEYS.textModel);
    if (m === "HAIKU" || m === "SONNET" || m === "OPUS") cfg.textModel = m;

    return cfg;
  } catch {
    return { ...DEFAULTS };
  }
}

export type ClaudeAccess = {
  enabled: boolean; // الميزة مفعّلة عالمياً
  eligible: boolean; // هل يحقّ لهذا المستخدم الاستخدام الآن
  mode: "plan" | "usage" | "none"; // وضع الأهليّة الفعليّ لهذا المستخدم
  reason: "ok" | "disabled" | "no_plan" | "no_balance" | "no_user";
  costPerAction: number; // التكلفة بالرصيد (وضع usage)
  balance: number; // رصيد المستخدم الحالي
  planSlug: string; // خطّة المستخدم الحاليّة
  monthlyLimit: number;
  configMode: ClaudeConfig["mode"];
  textModel: ClaudeModel;
};

// المصدر الوحيد للحقيقة: هل يستطيع المستخدم استخدام خدمات Claude؟
export async function getClaudeAccess(userId: string): Promise<ClaudeAccess> {
  const cfg = await getClaudeConfig();
  const base = {
    enabled: cfg.enabled,
    costPerAction: cfg.costPerAction,
    monthlyLimit: cfg.monthlyLimit,
    configMode: cfg.mode,
    textModel: cfg.textModel,
  };

  if (!cfg.enabled) {
    return { ...base, eligible: false, mode: "none", reason: "disabled", balance: 0, planSlug: "free" };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { systemRole: true, pagesBalance: true, subscriptionId: true },
  });
  if (!user) {
    return { ...base, eligible: false, mode: "none", reason: "no_user", balance: 0, planSlug: "free" };
  }

  // المالك دائماً مؤهّل (وضع الخطّة، بلا خصم)
  if (user.systemRole === "SYSTEM_ADMIN") {
    return {
      ...base,
      eligible: true,
      mode: "plan",
      reason: "ok",
      balance: user.pagesBalance,
      planSlug: "admin",
    };
  }

  let planSlug = "free";
  if (user.subscriptionId) {
    const sub = await db.subscription
      .findUnique({
        where: { id: user.subscriptionId },
        select: { status: true, plan: { select: { slug: true } } },
      })
      .catch(() => null);
    if (sub && sub.status === "ACTIVE") planSlug = sub.plan.slug;
  }

  const planEligible = cfg.includedPlanSlugs.includes(planSlug);
  const usageEligible = user.pagesBalance >= cfg.costPerAction;

  let eligible = false;
  let mode: "plan" | "usage" | "none" = "none";
  let reason: ClaudeAccess["reason"] = "no_plan";

  if (cfg.mode === "plan") {
    eligible = planEligible;
    mode = planEligible ? "plan" : "none";
    reason = planEligible ? "ok" : "no_plan";
  } else if (cfg.mode === "usage") {
    eligible = usageEligible;
    mode = usageEligible ? "usage" : "none";
    reason = usageEligible ? "ok" : "no_balance";
  } else {
    // plan_or_usage
    if (planEligible) {
      eligible = true;
      mode = "plan";
      reason = "ok";
    } else if (usageEligible) {
      eligible = true;
      mode = "usage";
      reason = "ok";
    } else {
      reason = "no_balance";
    }
  }

  return {
    ...base,
    eligible,
    mode,
    reason,
    balance: user.pagesBalance,
    planSlug,
  };
}

export async function canUseClaudeFeatures(userId: string): Promise<boolean> {
  return (await getClaudeAccess(userId)).eligible;
}
export async function canAskDocument(userId: string): Promise<boolean> {
  return canUseClaudeFeatures(userId);
}
export async function canGenerateReport(userId: string): Promise<boolean> {
  return canUseClaudeFeatures(userId);
}

// عدد عمليّات Claude لهذا المستخدم في الشهر الحالي (للحدّ الشهريّ)
export async function claudeMonthlyUsage(userId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return db.auditLog
    .count({
      where: { userId, action: { startsWith: "claude." }, createdAt: { gte: start } },
    })
    .catch(() => 0);
}

// يسجّل الاستخدام (AuditLog) ويخصم الرصيد في وضع usage. آمن — يتجاهل أخطاء التتبّع.
export async function trackClaudeUsage(
  userId: string,
  actionType: ClaudeActionType,
  opts: { jobId?: string; mode: "plan" | "usage" | "none"; costPerAction: number },
): Promise<void> {
  if (opts.mode === "usage" && opts.costPerAction > 0) {
    await db.user
      .update({
        where: { id: userId },
        data: { pagesBalance: { decrement: opts.costPerAction } },
      })
      .catch(() => {});
  }
  await db.auditLog
    .create({
      data: {
        userId,
        action: `claude.${actionType}`,
        entity: "job",
        entityId: opts.jobId,
        metadata: {
          mode: opts.mode,
          charged: opts.mode === "usage" ? opts.costPerAction : 0,
        },
      },
    })
    .catch(() => {});
}
