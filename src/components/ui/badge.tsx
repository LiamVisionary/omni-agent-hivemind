import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold leading-5 transition-colors [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[rgba(45,212,191,0.18)] text-[#99f6e4]",
        secondary: "border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.75)] text-[var(--muted)]",
        success: "border-[rgba(74,222,128,0.28)] bg-[rgba(22,163,74,0.16)] text-[#bbf7d0]",
        warning: "border-[rgba(250,204,21,0.28)] bg-[rgba(202,138,4,0.14)] text-[#fde68a]",
        danger: "border-[rgba(251,113,133,0.32)] bg-[rgba(225,29,72,0.16)] text-[#fecdd3]",
        outline: "border-[rgba(148,163,184,0.26)] text-[var(--foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return <Comp data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
