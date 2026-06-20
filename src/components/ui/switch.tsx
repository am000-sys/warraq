"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui-components/react/switch";

import { cn } from "@/lib/utils";

// مفتاح تبديل مبني على Base UI Switch. حركة الإبهام بخصائص منطقيّة
// (inset-inline-start) فتعمل صحيحةً في RTL وLTR دون كود إضافيّ.
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full border border-border bg-pebble/40 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-[checked]:border-orange data-[checked]:bg-orange disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="absolute top-1/2 size-[16px] -translate-y-1/2 rounded-full bg-snow shadow-sm transition-all duration-200 start-[3px] data-[checked]:start-[21px]" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
