// src/app/(app)/billing/page.tsx — شحن الرصيد بالحوالة البنكيّة
import { PageHeader } from "@/components/page-header";
import { TopUpClient } from "@/components/topup-client";
import { TOPUP_PACKAGES } from "@/lib/packages";
import { BANK, formatIban } from "@/lib/bank";
import { CARD_PAYMENTS_ENABLED } from "@/lib/payments-config";

export const metadata = { title: "شحن الرصيد — ورّاق" };

export default function BillingPage() {
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
      />
    </div>
  );
}
