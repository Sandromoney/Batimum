"use client";

import Link from "next/link";
import { useCallback, useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type LandingHeroMagneticCtaProps = {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function LandingHeroMagneticCta({
  href,
  children,
  className,
  style,
}: LandingHeroMagneticCtaProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const handleMove = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (reducedMotion || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;
      ref.current.style.transform = `translate(${offsetX * 0.14}px, ${offsetY * 0.14}px)`;
    },
    [reducedMotion],
  );

  const handleLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = "";
  }, []);

  return (
    <Link
      ref={ref}
      href={href}
      className={cn(
        "landing-btn-primary landing-btn-interactive landing-btn-magnetic group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.06em] text-primary-foreground no-underline shadow-glow transition-[box-shadow,background-color] duration-300 hover:bg-primary-hover active:scale-[0.98]",
        className,
      )}
      style={style}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
      <ArrowRight
        className="landing-btn-arrow h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1.5"
        aria-hidden="true"
      />
    </Link>
  );
}
