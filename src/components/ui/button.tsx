import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[5px] text-center text-[13px] font-medium leading-[1.15] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,212,191,0.38)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-[rgba(94,234,212,0.36)] bg-[rgba(45,212,191,0.14)] text-[var(--accent-strong)] hover:border-[rgba(94,234,212,0.58)] hover:bg-[rgba(45,212,191,0.22)] hover:text-[var(--foreground)]",
        secondary: "border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.44)] text-[var(--text-soft)] hover:border-[rgba(94,234,212,0.36)] hover:bg-[rgba(45,212,191,0.09)] hover:text-[var(--foreground)]",
        ghost: "border border-transparent text-[var(--muted)] hover:bg-[rgba(148,163,184,0.08)] hover:text-[var(--foreground)]",
        danger: "border border-[rgba(251,113,133,0.28)] bg-[rgba(251,113,133,0.10)] text-[#fecdd3] hover:bg-[rgba(251,113,133,0.18)]",
      },
      size: {
        default: "min-h-[30px] px-2.5 py-1.5",
        sm: "min-h-7 px-2 py-1 text-xs",
        lg: "min-h-8 px-3 py-1.5",
        icon: "size-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}, ref) => {
  const Comp = asChild ? Slot : "button";
  const buttonProps = {
    ref,
    "data-slot": "button",
    className: cn(buttonVariants({ variant, size, className })),
    disabled: disabled || isLoading,
    "aria-busy": isLoading || undefined,
    ...props,
  };

  if (asChild) {
    return (
      <Comp {...buttonProps}>
        {children}
      </Comp>
    );
  }

  return (
    <Comp {...buttonProps}>
      {isLoading ? <LoaderCircle className="animate-spin" /> : null}
      {children}
    </Comp>
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
