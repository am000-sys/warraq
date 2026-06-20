"use client";

import * as React from "react";
import { Field as FieldPrimitive } from "@base-ui-components/react/field";

import { cn } from "@/lib/utils";

// طبقة الحقول على Base UI Field — تربط التسمية بالمدخل تلقائيّاً (htmlFor/id)
// وتوصّل رسائل الخطأ/الوصف عبر aria-describedby دون إعداد يدويّ.

// أنماط المدخل — مطابقة لـ .field في globals.css
const fieldControlClass =
  "w-full rounded-[8px] border border-border bg-fog px-3.5 py-3 font-sans text-[15px] text-carbon outline-none transition-colors placeholder:text-pebble focus:border-orange disabled:cursor-not-allowed disabled:opacity-50 data-[invalid]:border-rose";

function Field({
  className,
  ...props
}: React.ComponentProps<typeof FieldPrimitive.Root>) {
  return (
    <FieldPrimitive.Root
      data-slot="field"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof FieldPrimitive.Label>) {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn(
        "mb-1.5 block select-none font-sans text-[13px] text-stone",
        className
      )}
      {...props}
    />
  );
}

function FieldControl({
  className,
  ...props
}: React.ComponentProps<typeof FieldPrimitive.Control>) {
  return (
    <FieldPrimitive.Control
      data-slot="field-control"
      className={cn(fieldControlClass, className)}
      {...props}
    />
  );
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<typeof FieldPrimitive.Description>) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn(
        "mt-1.5 font-sans text-[12px] font-light text-pebble",
        className
      )}
      {...props}
    />
  );
}

function FieldError({
  className,
  ...props
}: React.ComponentProps<typeof FieldPrimitive.Error>) {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      className={cn("mt-1.5 font-sans text-[12px] text-rose", className)}
      {...props}
    />
  );
}

export {
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
  FieldError,
  fieldControlClass,
};
