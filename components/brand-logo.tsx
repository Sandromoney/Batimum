"use client";

import { cn } from "@/lib/utils";

export const BRAND_LOGO_SRC = "/logocomplet-batimum.png";

export type BrandLogoVariant =
  | "sidebar"
  | "landing"
  | "header"
  | "marketing"
  | "footer"
  | "topbar"
  | "sidebarFooter";

const VARIANT_IMAGE_CLASS: Record<BrandLogoVariant, string> = {
  header: "logo-topbar__img logo-topbar__img--header object-contain",
  marketing:
    "logo-topbar__img h-auto w-[140px] max-w-[140px] object-contain sm:w-[160px] sm:max-w-[160px]",
  topbar: "h-10 max-h-10 w-auto object-contain sm:h-12 sm:max-h-12",
  footer:
    "h-auto w-[120px] min-w-[120px] max-w-[120px] object-contain",
  landing: "h-12 max-h-12 w-auto object-contain sm:h-14 sm:max-h-14",
  sidebar: "h-10 max-h-10 w-auto object-contain",
  sidebarFooter: "h-10 max-h-10 w-auto object-contain",
};

export function BrandLogo({
  variant,
  imageClassName,
  showSubtitle = false,
  subtitle = "SaaS BTP",
  /** @deprecated Utiliser variant — conservé pour compatibilité. */
  compact: _compact,
}: {
  variant?: BrandLogoVariant;
  imageClassName?: string;
  showSubtitle?: boolean;
  subtitle?: string;
  compact?: boolean;
}) {
  const resolvedVariant = variant ?? "landing";

  return (
    <span
      className={cn(
        "inline-flex items-center",
        resolvedVariant === "sidebarFooter" && "justify-center",
        resolvedVariant === "sidebar" && "w-full justify-center",
        resolvedVariant === "landing" && "justify-center",
        resolvedVariant === "header" && "items-center",
        resolvedVariant === "marketing" && "items-center",
      )}
    >
      <img
        src={BRAND_LOGO_SRC}
        alt="Batimum"
        className={cn(
          "block shrink-0",
          VARIANT_IMAGE_CLASS[resolvedVariant],
          !variant && "h-12 max-h-12 w-auto object-contain sm:h-14 sm:max-h-14",
          imageClassName,
        )}
        onError={(event) => {
          const parent = event.currentTarget.parentElement;
          event.currentTarget.classList.add("hidden");
          parent
            ?.querySelector("[data-brand-fallback]")
            ?.classList.replace("hidden", "flex");
        }}
      />
      <span data-brand-fallback className="hidden items-center gap-2.5">
        <span
          className={cn(
            "flex items-center justify-center rounded-xl bg-primary font-black tracking-tight text-primary-foreground shadow-glow",
            resolvedVariant === "sidebarFooter"
              ? "h-14 w-14 text-lg"
              : "h-11 w-11 text-base",
          )}
          aria-hidden="true"
        >
          B
        </span>
        {showSubtitle && resolvedVariant !== "sidebarFooter" ? (
          <span className="block truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
