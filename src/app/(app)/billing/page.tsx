// src/app/(app)/billing/page.tsx — شحن الرصيد بالحوالة البنكيّة
import { PageHeader } from "@/components/page-header";
import { TopUpClient } from "@/components/topup-client";
import { TOPUP_PACKAGES } from "@/lib/packages";
import { BANK, formatIban } from "@/lib/bank";
import { CARD_PAYMENTS_ENABLED } from "@/lib/payments-config";
import { auth } from "@/lib/auth";
import { trackBillingView } from "@/lib/funnel";

export const metadata = { title: "شحن الرصيد — ورّاق" };

export default async function BillingPage({
  searchParams,
}: {
  // ?pkg=medium أو ?pkg=flex&pages=350 — من بطاقات الأسعار وحاسبة الكلفة
  searchParams: Promise<{ pkg?: string; pages?: string }>;
}) {
  const { pkg, pages } = await searchParams;
  // مرحلة «فتح صفحة الشحن» في مسار التحويل (لوحة المالك)
  const session = await auth();
  if (session?.user?.id) await trackBillingView(session.user.id);

  return (
    <div>
      <PageHeader title="شحن الرصيد" subtitle="اختر باقة، حوّل المبلغ، وأرفق الإيصال." />
      <TopUpClient
        packages={TOPUP_PACKAGES}
        bank={{
          bankName: BANK.bankName,
          iban: formatIban(BANK.iban),
        }}
        cardPaymentsEnabled={CARD_PAYMENTS_ENABLED}
        initialPackageId={pkg}
        initialPages={pages ? Number(pages) || undefined : undefined}
      />
    </div>
  );
}
