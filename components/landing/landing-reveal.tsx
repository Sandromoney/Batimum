"use client";

import {
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { useInView } from "@/lib/hooks/use-in-view";
import { cn } from "@/lib/utils";

type RevealDirection = "up" | "left" | "right";
type RevealVariant = "default" | "title" | "body";

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: RevealDirection;
  variant?: RevealVariant;
  glow?: boolean;
  as?: ElementType;
};

const directionClass: Record<RevealDirection, string> = {
  up: "landing-reveal--up",
  left: "landing-reveal--from-left",
  right: "landing-reveal--from-right",
};

const variantClass: Record<RevealVariant, string> = {
  default: "",
  title: "landing-reveal--title",
  body: "landing-reveal--body",
};

export function LandingReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  variant = "default",
  glow = false,
  as: Component = "div",
}: LandingRevealProps) {
  const { ref, inView } = useInView({ once: true, threshold: 0.1 });

  return (
    <Component
      ref={ref}
      className={cn(
        "landing-reveal",
        variant === "default" && directionClass[direction],
        variantClass[variant],
        glow && "landing-reveal--glow",
        inView && "landing-reveal--visible",
        className,
      )}
      style={
        {
          "--landing-reveal-delay": `${delay}ms`,
        } as CSSProperties
      }
    >
      {children}
    </Component>
  );
}

type LandingRevealStaggerProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

export function LandingRevealStagger({
  children,
  className,
  as: Component = "div",
}: LandingRevealStaggerProps) {
  const { ref, inView } = useInView({ threshold: 0.08, once: true });

  return (
    <Component
      ref={ref}
      className={cn(
        "landing-reveal-stagger",
        inView && "landing-reveal-stagger--visible",
        className,
      )}
    >
      {children}
    </Component>
  );
}

export function LandingRevealItem({
  children,
  className,
  as: Component = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Component className={cn("landing-reveal-stagger__item", className)}>
      {children}
    </Component>
  );
}

export function LandingLineReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, inView } = useInView({ threshold: 0.15, once: true });

  return (
    <div
      ref={ref}
      className={cn(
        "landing-line-reveal space-y-3",
        inView && "landing-line-reveal--visible",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LandingLineRevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("landing-line-reveal__item", className)}>{children}</div>
  );
}
