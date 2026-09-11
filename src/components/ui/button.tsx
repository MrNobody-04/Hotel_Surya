import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 hover:shadow-primary/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-destructive/25 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border border-input bg-background/80 backdrop-blur-xs shadow-xs hover:bg-accent hover:text-accent-foreground hover:border-primary/40 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 hover:-translate-y-0.5 active:translate-y-0",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline",
        emerald:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 hover:shadow-emerald-600/25 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 dark:bg-emerald-600 dark:hover:bg-emerald-500",
        amber:
          "bg-amber-600 text-white shadow-sm hover:bg-amber-500 hover:shadow-amber-600/25 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 dark:bg-amber-600 dark:hover:bg-amber-500",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
