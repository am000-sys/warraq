"use client";

import * as React from "react";
import { useRender } from "@base-ui-components/react/use-render";

import { cn } from "@/lib/utils";

type LabelProps = useRender.ComponentProps<"label">;

// تسمية حقل — مطابقة لـ .label في globals.css (13px، لون stone)
function Label({ className, render = <label />, ...props }: LabelProps) {
  return useRender({
    render,
    props: {
      "data-slot": "label",
      className: cn(
        "mb-1.5 block select-none font-sans text-[13px] text-stone peer-disabled:opacity-50",
        className
      ),
      ...props,
    },
  });
}

export { Label };
