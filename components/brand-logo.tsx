"use client";

import { cn } from "@/lib/utils";

export type BrandLogoVariant =
  | "sidebar"
  | "landing"
  | "header"
  | "footer"
  | "topbar"
  | "sidebarFooter";

const LOGO_WIDTH_PX: Record<
  Exclude<BrandLogoVariant, "topbar" | "sidebarFooter" | "header">,
  number
> = {
  sidebar: 150,
  landing: 200,
  footer: 120,
};

export function BrandLogo({
  variant,
  imageClassName,
  showSubtitle = true,
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
  const fixedWidth =
    variant &&
    variant !== "topbar" &&
    variant !== "sidebarFooter" &&
    variant !== "header"
      ? LOGO_WIDTH_PX[variant]
      : undefined;

  return (
    <span
      className={cn(
        "flex items-center",
        variant === "topbar" && "gap-2.5",
        variant === "sidebarFooter" && "justify-center",
        variant === "sidebar" && "w-full justify-center gap-3",
        variant === "landing" && "justify-center gap-3",
        variant === "header" && "items-center",
        !variant && "gap-3",
      )}
    >
      <img
        src="/logo-batimum.png"
        alt={variant === "sidebarFooter" ? "Batimum" : ""}
        width={variant === "topbar" ? undefined : fixedWidth}
        className={cn(
          "block shrink-0 object-contain",
          variant === "topbar" && "h-[30px] w-auto max-h-[30px]",
          variant === "sidebarFooter" &&
            "mx-auto h-auto w-[96px] min-w-[88px] max-w-[96px] object-contain",
          variant === "sidebar" && "mx-auto h-auto w-[150px] object-center",
          variant === "landing" &&
            "h-auto w-[200px] object-center drop-shadow-[0_0_28px_rgba(59,130,246,0.35)]",
          variant === "header" && "logo-topbar__img h-[36px] w-auto max-w-none object-contain object-left",
          variant === "footer" && "min-w-[120px] w-[120px] h-auto",
          !variant && "h-auto w-auto max-w-[12rem]",
          imageClassName,
        )}
        style={
          fixedWidth
            ? { width: fixedWidth, height: "auto", maxWidth: fixedWidth }
            : variant === "topbar"
              ? { height: 30, width: "auto" }
              : variant === "header"
                ? { height: 36, width: "auto" }
                : undefined
        }
        onError={(event) => {
          const parent = event.currentTarget.parentElement;
          event.currentTarget.classList.add("hidden");
          parent
            ?.querySelector("[data-brand-fallback]")
            ?.classList.replace("hidden", "flex");
          if (variant === "topbar") {
            parent
              ?.querySelector("[data-brand-topbar-label]")
              ?.classList.add("hidden");
          }
        }}
      />
      {variant === "topbar" && (
        <span
          data-brand-topbar-label
          className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground"
        >
          Batimum
        </span>
      )}
      <span data-brand-fallback className="hidden items-center gap-2.5">
        <span
          className={cn(
            "flex items-center justify-center rounded-xl bg-primary font-black tracking-tight text-primary-foreground shadow-glow",
            variant === "topbar"
              ? "h-8 w-8 text-sm"
              : variant === "sidebarFooter"
                ? "h-14 w-14 text-lg"
                : "h-11 w-11 text-base",
          )}
        >
          B
        </span>
        <span className="min-w-0">
          {variant !== "sidebarFooter" && (
            <span className="block truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground">
              Batimum
            </span>
          )}
          {showSubtitle && variant !== "topbar" && variant !== "sidebarFooter" && (
            <span className="block truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
      </span>
    </span>
  );
}
