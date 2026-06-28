import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type LandingCtaLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

export function LandingCtaLink({
  href,
  children,
  variant = "primary",
  className,
}: LandingCtaLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        variant === "primary"
          ? "landing-btn-primary landing-btn-interactive group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground no-underline shadow-glow transition-all hover:bg-primary-hover active:scale-[0.98]"
          : "landing-btn-secondary landing-btn-interactive group inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground no-underline shadow-card transition-all hover:bg-card-hover active:scale-[0.98]",
        className,
      )}
    >
      {children}
      <ArrowRight
        className="landing-btn-arrow h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  );
}

export function LandingExclusiveBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="landing-badge landing-badge--accent mb-4 text-xs tracking-[0.16em]">
      {children}
    </span>
  );
}
