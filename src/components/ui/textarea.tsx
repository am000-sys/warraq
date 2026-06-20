"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// منطقة نصّ — مطابقة لأسلوب .field، مع ارتفاع أدنى وتغيير حجم عموديّ فقط
function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-20 w-full resize-y rounded-[8px] border border-border bg-fog px-3.5 py-3 font-sans text-[15px] leading-relaxed text-carbon outline-none transition-colors placeholder:text-pebble focus:border-orange disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
