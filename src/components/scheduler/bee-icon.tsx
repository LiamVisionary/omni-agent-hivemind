"use client";
import Image from "next/image";
import { beeRoleIconPath } from "@/lib/config/bee-role-icons";
import { cn } from "@/lib/utils/cn";
export function BeeIcon({ role = "worker", size = 24, dim, className }: {
  role?: "queen" | "worker"; size?: number; dim?: boolean; className?: string;
}) {
  const src = beeRoleIconPath(role);
  return <Image src={src} alt="" width={size} height={size} draggable={false}
    className={cn("block object-contain pointer-events-none", className)}
    style={{ filter: dim ? "saturate(0.55) brightness(0.85)" : undefined }}
    unoptimized />;
}
