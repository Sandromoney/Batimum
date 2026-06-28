"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground font-semibold shadow-glow hover:bg-primary-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0",
  secondary:
    "border border-border/80 bg-card/90 text-foreground shadow-card hover:-translate-y-0.5 hover:border-primary/25 hover:bg-card-hover hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]",
  ghost:
    "text-muted hover:bg-card-hover/80 hover:text-primary active:scale-[0.98]",
  danger:
    "border border-border/80 bg-card/90 text-muted hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-200 active:scale-[0.98]",
};

export function buttonClassName(
  variant: Variant = "primary",
  size: "sm" | "md" = "md",
  className?: string,
) {
  return cn(
    "btp-btn inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-all duration-200 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:active:scale-100",
    size === "sm" ? "px-3.5 py-2 text-xs" : "px-5 py-3 text-sm",
    variants[variant],
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName(variant, size, className)}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: {
  href: string;
  className?: string;
  variant?: Variant;
  size?: "sm" | "md";
  children: ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={buttonClassName(variant, size, className)}
      {...props}
    >
      {children}
    </Link>
  );
}
