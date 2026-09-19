"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  maxTilt?: number;
  variant?: "default" | "cabin" | "hall" | "luxury" | "kpi";
  interactive?: boolean;
}

export const TiltCard = React.forwardRef<HTMLDivElement, TiltCardProps>(
  (
    {
      className,
      children,
      maxTilt: _maxTilt,
      variant = "default",
      interactive = true,
      style,
      ...props
    },
    ref
  ) => {
    // Variant-specific styling preserving exact visual identity
    const variantClass = {
      default: "border-border/80 bg-card",
      cabin: "card-3d-cabin border-amber-500/30",
      hall: "card-3d-hall border-blue-500/30",
      luxury: "border-amber-500/40 bg-gradient-to-b from-amber-500/[0.04] to-card",
      kpi: "border-border/80 bg-card hover:border-primary/40",
    }[variant];

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border shadow-xs transition-all duration-200 ease-out",
          interactive && "hover:-translate-y-1 hover:shadow-md",
          variantClass,
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TiltCard.displayName = "TiltCard";

