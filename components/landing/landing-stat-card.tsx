"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useInView } from "@/lib/hooks/use-in-view";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CounterConfig = {
  prefix?: string;
  value: number;
  suffix?: string;
  animateFrom?: number;
};

export type LandingStatCardProps = {
  title: string;
  description: string;
  counter?: CounterConfig;
  index?: number;
  className?: string;
};

function animateValue(
  from: number,
  to: number,
  duration: number,
  onUpdate: (value: number) => void,
) {
  const start = performance.now();

  function frame(now: number) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - progress) ** 4;
    onUpdate(Math.round(from + (to - from) * eased));
    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

export function LandingStatCard({
  title,
  description,
  counter,
  index = 0,
  className,
}: LandingStatCardProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.35 });
  const reducedMotion = usePrefersReducedMotion();
  const hasAnimated = useRef(false);
  const startValue = counter?.animateFrom ?? 0;
  const [display, setDisplay] = useState(
    counter ? (reducedMotion ? counter.value : startValue) : 0,
  );

  useEffect(() => {
    if (!counter || !inView || hasAnimated.current) return;
    hasAnimated.current = true;

    if (reducedMotion) {
      setDisplay(counter.value);
      return;
    }

    animateValue(startValue, counter.value, 1400, setDisplay);
  }, [counter, inView, reducedMotion, startValue]);

  const headline = counter ? (
    <>
      {counter.prefix}
      {display}
      {counter.suffix}
    </>
  ) : (
    title
  );

  return (
    <div
      ref={ref}
      className={cn(
        "landing-stat-card-wrap h-full",
        counter && "landing-stat-card-wrap--counter",
        inView && "landing-stat-card--visible",
        className,
      )}
      style={
        {
          "--landing-stat-delay": `${index * 120}ms`,
        } as CSSProperties
      }
    >
      <Card className="landing-stat-card landing-stat-bubble landing-card-interactive flex h-full min-h-[11.5rem] flex-col p-6 text-center">
        <div className="landing-stat-card__headline-wrap flex min-h-[4.25rem] w-full flex-col items-center justify-center">
          <p className="landing-stat-card__headline text-base font-semibold uppercase leading-tight tracking-[0.09em] text-foreground sm:text-lg">
            {headline}
          </p>
          <span className="landing-stat-card__accent" aria-hidden="true" />
        </div>
        <p className="landing-stat-card__description mt-4 min-h-[3rem] w-full whitespace-pre-line text-sm leading-[1.65] text-muted-foreground/90 sm:text-[0.9375rem]">
          {description}
        </p>
      </Card>
    </div>
  );
}
