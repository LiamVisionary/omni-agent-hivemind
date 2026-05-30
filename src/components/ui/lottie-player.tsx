"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

import { cn } from "@/lib/utils/cn";

type LottiePlayerProps = {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  size?: number;
  ariaLabel?: string;
};

export function LottiePlayer({
  src,
  className,
  loop = true,
  autoplay = true,
  size,
  ariaLabel,
}: LottiePlayerProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <span
      className={cn("inline-block", className)}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={style}
    >
      <DotLottieReact src={src} loop={loop} autoplay={autoplay} style={{ width: "100%", height: "100%" }} />
    </span>
  );
}
