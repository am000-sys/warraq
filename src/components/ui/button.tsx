"use client";

import * as React from "react";
import { useRender } from "@base-ui-components/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// أنماط الزرّ — مبنيّة على هويّة وَرَّاق (حوافّ دائريّة، برتقاليّ + نصّ كربونيّ).
// المظهر مطابق لـ .btn-primary / .btn-ghost في globals.css لكن عبر Base UI + cva.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans text-[15px] font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // الزرّ الأساسي: برتقاليّ بنصّ كربونيّ (هويّة وَرَّاق)
        default:
          "bg-primary text-primary-foreground shadow-btn hover:brightness-105 hover:-translate-y-px hover:shadow-btn-orange",
        // زرّ شبحيّ بحدود
        ghost: "bg-snow text-carbon border border-border hover:border-orange",
        outline: "border border-border bg-transparent text-carbon hover:bg-fog",
        secondary:
          "bg-secondary text-secondary-foreground border border-border-sub hover:bg-fog",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-105",
        link: "text-orange underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[46px] rounded-btn px-7",
        sm: "h-9 rounded-btn px-4 text-sm",
        lg: "h-12 rounded-btn px-8",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = useRender.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

// render prop يحلّ محلّ asChild/Slot في Radix (تركيب مع <Link> مثلاً)
function Button({
  className,
  variant,
  size,
  render = <button />,
  ...props
}: ButtonProps) {
  const defaultProps = {
    "data-slot": "button",
    className: cn(buttonVariants({ variant, size, className })),
  };

  return useRender({
    render,
    props: { ...defaultProps, ...props },
  });
}

export { Button, buttonVariants };
