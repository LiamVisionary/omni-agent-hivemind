"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./scheduler-tokens.module.css";
export type HexTone = "default" | "honey";
const TONE = {
  default: { bg: "var(--hex-default-bg)", border: "var(--hex-default-border)", glow: "transparent" },
  honey:   { bg: "var(--hex-honey-bg)",   border: "var(--hex-honey-border)",   glow: "var(--hex-honey-glow)" },
};
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
export const HexTile = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { size?: number; tone?: HexTone }>(function HexTile(
  { size = 80, tone = "default", children, className, onClick, style, ...rest }, ref,
) {
  const t = TONE[tone];
  const W = size, H = (size * 2) / Math.sqrt(3);
  const pts = `${W/2},0 ${W},${H/4} ${W},${3*H/4} ${W/2},${H} 0,${3*H/4} 0,${H/4}`;
  return (
    <div ref={ref} onClick={onClick}
      className={cn("relative", onClick && styles.hexInteractive, className)}
      style={{
        width: W, height: H,
        transition: "transform 180ms ease, filter 180ms ease",
        filter: t.glow !== "transparent" ? `drop-shadow(0 0 14px ${t.glow})` : undefined,
        ...style,
      }} {...rest}
    >
      <div className="absolute inset-0" style={{
        clipPath: HEX_CLIP, background: t.bg,
        backdropFilter: "blur(10px) saturate(140%)",
        WebkitBackdropFilter: "blur(10px) saturate(140%)",
      }} />
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden
        className="pointer-events-none absolute inset-0" style={{ overflow: "visible" }}>
        <polygon className={styles.hexStroke} points={pts} fill="none"
          stroke={t.border} strokeWidth={1} strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ transition: "stroke 160ms ease, stroke-width 160ms ease" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
});
