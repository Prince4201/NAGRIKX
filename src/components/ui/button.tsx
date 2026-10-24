import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium cursor-pointer transition-all duration-300 ease-[var(--ease-civic)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5 motion-reduce:transform-none",
  {
    variants: {
      variant: {
        glass: "border border-forest-foreground/35 bg-forest-foreground/10 text-forest-foreground backdrop-blur-md hover:bg-forest-foreground/20 hover:border-forest-foreground/60",
        default:
          "bg-primary text-primary-foreground shadow-ember hover:-translate-y-0.5 hover:brightness-105",
        forest:
          "bg-forest text-forest-foreground shadow-soft hover:-translate-y-0.5 hover:brightness-110",
        ink: "bg-ink text-ink-foreground hover:-translate-y-0.5 hover:bg-forest",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-ink/15 bg-paper/60 text-foreground hover:border-ink/40 hover:bg-paper",
        secondary: "bg-sage text-forest hover:bg-sage/70",
        ghost: "text-foreground hover:bg-ink/5",
        link: "text-forest underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-12 px-7 text-[0.95rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
