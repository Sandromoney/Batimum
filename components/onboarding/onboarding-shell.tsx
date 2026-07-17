"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";
import {
  ONBOARDING_STEP_LABELS,
  type OnboardingStepIndex,
} from "@/lib/onboarding-flow";
import { cn } from "@/lib/utils";

type OnboardingShellProps = {
  step: OnboardingStepIndex;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
};

export function OnboardingShell({
  step,
  title,
  description,
  children,
  footer,
  maxWidthClassName = "max-w-xl",
}: OnboardingShellProps) {
  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-10">
        <Card className={cn("w-full", maxWidthClassName)}>
          <Link href="/" className="mb-8 flex justify-center">
            <BrandLogo variant="marketing" showSubtitle={false} />
          </Link>

          <header className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Inscription · Étape {step} sur {ONBOARDING_STEP_LABELS.length}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {description}
            </p>

            <div className="mt-5 flex gap-1.5">
              {ONBOARDING_STEP_LABELS.map((label, index) => {
                const stepNumber = (index + 1) as OnboardingStepIndex;
                const active = stepNumber === step;
                const completed = stepNumber < step;
                return (
                  <div key={label} className="flex min-w-0 flex-1 flex-col gap-1">
                    <span
                      className={cn(
                        "h-1.5 rounded-full transition-colors",
                        completed || active ? "bg-primary" : "bg-border",
                      )}
                      title={label}
                    />
                    <span
                      className={cn(
                        "hidden truncate text-[10px] font-medium sm:block",
                        active
                          ? "text-primary"
                          : completed
                            ? "text-foreground"
                            : "text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </header>

          {children}
        </Card>
      </section>
      {footer}
    </main>
  );
}

type OnboardingNavProps = {
  onBack?: () => void;
  backLabel?: string;
  backDisabled?: boolean;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  secondaryAction?: ReactNode;
};

export function OnboardingNav({
  onBack,
  backLabel = "Retour",
  backDisabled = false,
  onNext,
  nextLabel,
  nextDisabled = false,
  secondaryAction,
}: OnboardingNavProps) {
  return (
    <section className="mt-6 flex flex-col gap-3">
      {secondaryAction}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        {onBack ? (
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            disabled={backDisabled}
            onClick={onBack}
          >
            {backLabel}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          disabled={nextDisabled}
          onClick={onNext}
        >
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
