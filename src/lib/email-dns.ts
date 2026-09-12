// src/lib/email-dns.ts — فحص حيّ لسجلّات توثيق البريد (SPF / DKIM / DMARC)
//
// لماذا؟ رسائل رمز التحقّق وإشعارات الشحن تفقد قيمتها إن ذهبت للبريد المزعج.
// وثلاثة سجلّات DNS تحسم ذلك، ونقصُها لا يظهر في أيّ مكان — فتُكتشف المشكلة
// من شكوى مستخدم. هذا الفحص يقرأها فعليّاً من DNS ويقول ما الناقص.
//
// يُنفَّذ على الخادم عند فتح /admin/system فقط (لا في مسار إرسال البريد)،
// فلا يُضيف زمناً على أيّ عمليّة يراها المستخدم.
import { promises as dns } from "node:dns";

export type RecordCheck = {
  ok: boolean;
  name: string; // اسم السجلّ المفحوص
  value: string | null; // ما وُجد (مقتطعاً للعرض)
  note?: string;
};

export type EmailDnsReport = {
  domain: string | null;
  from: string | null;
  spf: RecordCheck;
  dkim: RecordCheck;
  dmarc: RecordCheck;
  bounceMx: RecordCheck;
  suggestedDmarc: string; // السجلّ الجاهز للّصق عند نقصه
};

// نطاق المُرسِل من EMAIL_FROM بصيغتَيه: "الاسم <a@b.com>" أو "a@b.com"
export function senderDomain(from: string | null | undefined): string | null {
  if (!from) return null;
  const m = from.match(/<([^>]+)>/);
  const addr = (m ? m[1] : from).trim();
  const at = addr.lastIndexOf("@");
  if (at < 0) return null;
  const d = addr.slice(at + 1).trim().toLowerCase();
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) ? d : null;
}

const TIMEOUT_MS = 4000;

// مهلة لكلّ استعلام — لا نُعلّق صفحة اللوحة على DNS بطيء
async function withTimeout<T>(p: Promise<T>): Promise<T | null> {
  return Promise.race([
    p.catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS)),
  ]);
}

async function txt(name: string): Promise<string[]> {
  const res = await withTimeout(dns.resolveTxt(name));
  return (res ?? []).map((chunks) => chunks.join(""));
}

function trim(v: string, n = 120): string {
  return v.length > n ? `${v.slice(0, n)}…` : v;
}

export async function checkEmailDns(from: string | null | undefined): Promise<EmailDnsReport> {
  const domain = senderDomain(from);
  const suggestedDmarc = domain
    ? `v=DMARC1; p=none; rua=mailto:dmarc@${domain}; fo=1`
    : "v=DMARC1; p=none";

  const empty: RecordCheck = { ok: false, name: "—", value: null };
  if (!domain) {
    return {
      domain: null,
      from: from ?? null,
      spf: { ...empty, note: "تعذّر استخراج النطاق من EMAIL_FROM" },
      dkim: empty,
      dmarc: empty,
      bounceMx: empty,
      suggestedDmarc,
    };
  }

  // Resend يوثّق النطاق بسجلّات على النطاق نفسه وعلى نطاق الإرسال الفرعيّ،
  // فنقبل أيّهما: SPF قد يكون على الجذر أو على send.<النطاق>.
  const sendSub = `send.${domain}`;
  const [rootTxt, sendTxt, dmarcTxt, dkimTxt, sendMx] = await Promise.all([
    txt(domain),
    txt(sendSub),
    txt(`_dmarc.${domain}`),
    txt(`resend._domainkey.${domain}`),
    withTimeout(dns.resolveMx(sendSub)),
  ]);

  const spfRoot = rootTxt.find((v) => v.toLowerCase().startsWith("v=spf1"));
  const spfSend = sendTxt.find((v) => v.toLowerCase().startsWith("v=spf1"));
  const spfValue = spfRoot ?? spfSend ?? null;

  const dmarcValue = dmarcTxt.find((v) => v.toLowerCase().startsWith("v=dmarc1")) ?? null;
  const dkimValue = dkimTxt.find((v) => v.includes("p=")) ?? null;

  return {
    domain,
    from: from ?? null,
    spf: {
      ok: Boolean(spfValue),
      name: spfRoot ? domain : sendSub,
      value: spfValue ? trim(spfValue) : null,
      note: spfValue
        ? undefined
        : "لا سجلّ SPF على النطاق ولا على نطاق الإرسال الفرعيّ — أكمِل توثيق النطاق في Resend.",
    },
    dkim: {
      ok: Boolean(dkimValue),
      name: `resend._domainkey.${domain}`,
      value: dkimValue ? trim(dkimValue, 60) : null,
      note: dkimValue ? undefined : "مفتاح DKIM غير منشور — أكمِل توثيق النطاق في Resend.",
    },
    dmarc: {
      ok: Boolean(dmarcValue),
      name: `_dmarc.${domain}`,
      value: dmarcValue ? trim(dmarcValue) : null,
      note: dmarcValue
        ? undefined
        : "لا سجلّ DMARC. هذا أثقل سبب لذهاب الرسائل إلى المزعج لدى Outlook وGmail.",
    },
    bounceMx: {
      ok: Boolean(sendMx?.length),
      name: sendSub,
      value: sendMx?.length ? sendMx.map((m) => m.exchange).join(", ") : null,
      note: sendMx?.length ? undefined : "لا سجلّ MX لاستقبال الارتدادات على نطاق الإرسال.",
    },
    suggestedDmarc,
  };
}
