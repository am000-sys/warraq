"use client";

import * as React from "react";
import { Input as InputPrimitive } from "@base-ui-components/react/input";

import { cn } from "@/lib/utils";

// حقل إدخال — مطابق لـ .field في globals.css (خلفيّة fog، تركيز برتقاليّ)
function Input({
  className,
  ...props
}: React.ComponentProps<typeof InputPrimitive>) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        "w-full rounded-[8px] border border-border bg-fog px-3.5 py-3 font-sans text-[15px] text-carbon outline-none transition-colors placeholder:text-pebble focus:border-orange disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
