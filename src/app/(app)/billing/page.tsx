// src/app/(app)/billing/page.tsx — شحن الرصيد بالحوالة البنكيّة
import { PageHeader } from "@/components/page-header";
import { TopUpClient } from "@/components/topup-client";
import { TOPUP_PACKAGES } from "@/lib/packages";
import { BANK, formatIban } from "@/lib/bank";

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
      />
    </div>
  );
}
