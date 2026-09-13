"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
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
      maxTilt = 4.5,
      variant = "default",
      interactive = true,
      style,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLDivElement | null>(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
      // Check if device is touch-primary or prefers reduced motion
      const touchQuery = window.matchMedia("(hover: none)");
      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setIsTouch(touchQuery.matches || motionQuery.matches);

      const handleTouchChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
      touchQuery.addEventListener("change", handleTouchChange);
      return () => touchQuery.removeEventListener("change", handleTouchChange);
    }, []);

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isTouch || !interactive) return;

        const card = internalRef.current;
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Set spotlight CSS coordinates directly on the DOM element for zero React re-renders
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);

        // Compute normalized coordinates [-1, 1]
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const normX = (x - centerX) / centerX;
        const normY = (y - centerY) / centerY;

        // Invert Y for rotateX (moving cursor up tilts top towards screen)
        const tiltX = -normY * maxTilt;
        const tiltY = normX * maxTilt;

        setTilt({ x: tiltX, y: tiltY });
        setIsHovered(true);
      },
      [isTouch, interactive, maxTilt]
    );

    const handleMouseLeave = useCallback(() => {
      setTilt({ x: 0, y: 0 });
      setIsHovered(false);
    }, []);

    // Variant-specific styling
    const variantClass = {
      default: "spotlight-card border-border/80 bg-card",
      cabin: "spotlight-card spotlight-cabin card-3d-cabin border-amber-500/30",
      hall: "spotlight-card spotlight-hall card-3d-hall border-blue-500/30",
      luxury: "spotlight-card spotlight-cabin border-amber-500/40 bg-gradient-to-b from-amber-500/[0.04] to-card",
      kpi: "spotlight-card border-border/80 bg-card hover:border-primary/40",
    }[variant];

    return (
      <div
        ref={(node) => {
          internalRef.current = node;
          if (typeof forwardedRef === "function") {
            forwardedRef(node);
          } else if (forwardedRef) {
            forwardedRef.current = node;
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "rounded-xl border shadow-sm select-none transition-all duration-300",
          !isTouch && interactive && "will-change-transform",
          variantClass,
          className
        )}
        style={{
          transform:
            !isTouch && interactive && isHovered
              ? `perspective(1000px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) translateY(-3px)`
              : !isTouch && interactive
              ? "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)"
              : undefined,
          transition: isHovered
            ? "transform 0.12s ease-out, box-shadow 0.25s ease, border-color 0.2s ease"
            : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease, border-color 0.2s ease",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TiltCard.displayName = "TiltCard";
