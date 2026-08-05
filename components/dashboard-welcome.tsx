"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function DashboardWelcome({
  greeting,
  name,
  subtitle,
  /** Évite d'afficher un titre partiel avant calcul client (anti-hydratation). */
  ready = true,
}: {
  greeting: string;
  name: string;
  subtitle: string;
  ready?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) {
      setVisible(false);
      return;
    }
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [ready, greeting, name, subtitle]);

  const title = name.trim() ? `${greeting} ${name.trim()}` : greeting;

  return (
    <header className="btp-page-header mb-5 flex flex-col gap-3 sm:mb-6">
      <div
        className={cn(
          "min-w-0 transition-[opacity,transform] duration-300 ease-out",
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-1 opacity-0",
        )}
      >
        {ready ? (
          <>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
              {title}
            </h1>
            {subtitle.trim() ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                {subtitle}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div
              className="h-9 w-52 max-w-[70%] rounded-md bg-muted/40 sm:h-10 sm:w-64"
              aria-hidden
            />
            <div
              className="mt-3 h-4 w-72 max-w-full rounded-md bg-muted/30"
              aria-hidden
            />
          </>
        )}
      </div>
    </header>
  );
}
