"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { MoreVertical } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Lightweight cell context menu — a trigger icon that opens a small
 * list of named actions anchored under it.
 *
 * Built without an external dropdown dep: we keep the project's
 * footprint small and the styling consistent with the cell system.
 *
 * Each item has a label, optional icon, optional `destructive` flag
 * (tints the row red), and an onClick. The menu closes on selection,
 * click-outside, or ESC.
 */
export type CellMenuItem = {
  /** Stable key — also used as the visible label if no `label` is given. */
  key: string;
  label?: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Renders as a danger-tinted row, used for Remove / Delete / etc. */
  destructive?: boolean;
};

type CellMenuProps = {
  items: CellMenuItem[];
  /** Accessible label for the trigger. */
  ariaLabel: string;
  /** Optional override icon for the trigger. Defaults to MoreVertical. */
  triggerIcon?: ReactNode;
  /** Optional className for the trigger button. */
  className?: string;
};

export function CellMenu({ items, ariaLabel, triggerIcon, className }: CellMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on click-outside and ESC.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        data-slot="cell-menu-trigger"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded text-[var(--muted)] transition-colors hover:bg-[rgba(148,163,184,0.12)] hover:text-[var(--foreground)] focus-visible:bg-[rgba(148,163,184,0.12)] focus-visible:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(45,212,191,0.45)] [&_svg]:size-3.5",
          className,
        )}
      >
        {triggerIcon ?? <MoreVertical aria-hidden="true" />}
      </button>

      {open ? (
        <ul
          role="menu"
          data-slot="cell-menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-[170px] overflow-hidden rounded-md border border-[rgba(148,163,184,0.22)] bg-[rgba(12,16,24,0.96)] py-1 text-xs shadow-[0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur"
        >
          {items.map((item, index) => {
            const previous = items[index - 1];
            const showSeparator = item.destructive && previous && !previous.destructive;
            return (
              <li key={item.key} role="none">
                {showSeparator ? (
                  <div aria-hidden="true" data-slot="cell-menu-separator" className="my-1 h-px bg-[rgba(148,163,184,0.16)]" />
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  data-slot={item.destructive ? "cell-menu-item-danger" : "cell-menu-item"}
                  disabled={item.disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (item.disabled) return;
                    setOpen(false);
                    item.onClick();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-45",
                    item.destructive
                      ? "text-[#fecdd3] enabled:hover:bg-[rgba(225,29,72,0.16)]"
                      : "text-[var(--foreground)] enabled:hover:bg-[rgba(45,212,191,0.12)] enabled:hover:text-[var(--accent-strong)]",
                    "[&_svg]:size-3.5 [&_svg]:shrink-0",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 truncate">{item.label ?? item.key}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
