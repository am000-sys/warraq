"use client";

import * as React from "react";
import { Accordion as AccordionPrimitive } from "@base-ui-components/react/accordion";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

// أكورديون مبني على Base UI — يضيف وصوليّة كاملة (aria-expanded، تنقّل لوحة المفاتيح،
// حركة ارتفاع سلسة) مقارنةً بالتنفيذ اليدويّ السابق.

function Accordion(
  props: React.ComponentProps<typeof AccordionPrimitive.Root>
) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border-sub", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex flex-1 items-center justify-between gap-4 py-[18px] text-start font-sans text-[15px] font-medium text-carbon outline-none transition-colors hover:text-orange focus-visible:text-orange",
          className
        )}
        {...props}
      >
        {children}
        {/* علامة + تدور إلى × عند الفتح */}
        <Plus className="size-5 shrink-0 text-orange transition-transform duration-200 group-data-[panel-open]:rotate-45" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionPanel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Panel>) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className={cn(
        "h-[var(--accordion-panel-height)] overflow-hidden font-sans text-[14px] font-light leading-[1.65] text-stone transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0",
        className
      )}
      {...props}
    >
      <div className="pb-[18px]">{children}</div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionPanel };
