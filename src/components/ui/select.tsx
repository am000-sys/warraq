"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui-components/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// قائمة اختيار مبنيّة على Base UI Select — تنقّل لوحة مفاتيح + بحث بالكتابة +
// مواضع RTL صحيحة (تُورَّث من DirectionProvider في الجذر)، بمظهر وَرَّاق.

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectValue(
  props: React.ComponentProps<typeof SelectPrimitive.Value>
) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-[8px] border border-border bg-fog px-3.5 py-3 font-sans text-[15px] text-carbon outline-none transition-colors hover:border-pebble focus-visible:border-orange data-[popup-open]:border-orange disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="flex shrink-0 text-pebble">
        <ChevronDown size={16} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        sideOffset={6}
        alignItemWithTrigger={false}
        className="z-50 outline-none"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-[var(--available-height)] min-w-[var(--anchor-width)] overflow-y-auto rounded-inner border border-border-sub bg-popover p-1.5 text-popover-foreground shadow-card transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-[8px] py-2 pe-2.5 ps-8 text-sm text-carbon outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-orange-soft",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="absolute inset-y-0 start-2 flex items-center text-orange">
        <Check size={15} strokeWidth={2.4} />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };
