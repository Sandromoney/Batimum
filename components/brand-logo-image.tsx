"use client";

import {
  logoFitClassName,
  normalizeLogoFitMode,
  type LogoFitMode,
} from "@/lib/logo-display";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt?: string;
  mode?: LogoFitMode;
  /** Logo application : toujours cover dans un cercle. */
  variant?: "application" | "pdf";
  boxClassName?: string;
  className?: string;
};

export function BrandLogoImage({
  src,
  alt = "",
  mode = "contain",
  variant = "pdf",
  boxClassName,
  className,
}: Props) {
  const fitMode = variant === "application" ? "cover" : normalizeLogoFitMode(mode);

  return (
    <div className={cn("overflow-hidden", boxClassName)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "h-full w-full",
          logoFitClassName(fitMode),
          className,
        )}
      />
    </div>
  );
}
