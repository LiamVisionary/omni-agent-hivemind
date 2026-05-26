import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type CloseIconButtonProps = Omit<React.ComponentProps<"button">, "children"> & {
  iconClassName?: string;
  size?: "sm" | "md";
};

const sizeClasses = {
  sm: "size-6 [&_svg]:size-3",
  md: "size-8 [&_svg]:size-3.5",
};

const CloseIconButton = React.forwardRef<HTMLButtonElement, CloseIconButtonProps>(({
  className,
  iconClassName,
  size = "md",
  type = "button",
  ...props
}, ref) => (
  <button
    ref={ref}
    type={type}
    data-slot="close-icon-button"
    className={cn(
      "inline-flex shrink-0 items-center justify-center rounded-full border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.46)] text-[var(--muted)] transition-all hover:border-[rgba(148,163,184,0.34)] hover:bg-[rgba(148,163,184,0.11)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,212,191,0.35)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      sizeClasses[size],
      className,
    )}
    {...props}
  >
    <X aria-hidden="true" className={iconClassName} />
  </button>
));
CloseIconButton.displayName = "CloseIconButton";

export { CloseIconButton };
