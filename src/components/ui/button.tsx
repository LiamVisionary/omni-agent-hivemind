import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,212,191,0.45)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-[#06201d] hover:bg-[var(--accent-strong)]",
        secondary: "border border-[rgba(148,163,184,0.2)] bg-[rgba(15,23,42,0.72)] text-[var(--foreground)] hover:border-[rgba(94,234,212,0.42)] hover:bg-[rgba(45,212,191,0.12)]",
        ghost: "text-[var(--muted)] hover:bg-[rgba(148,163,184,0.1)] hover:text-[var(--foreground)]",
        danger: "bg-[rgba(251,113,133,0.14)] text-[#fecdd3] hover:bg-[rgba(251,113,133,0.22)]",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5",
        icon: "size-9",
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
