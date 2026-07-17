"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PilotageReadiness } from "@/lib/pilotage/readiness";
import { Check, Circle } from "lucide-react";

export function PilotageOnboardingCard({
  readiness,
}: {
  readiness: PilotageReadiness;
}) {
  if (readiness.isActionable) return null;

  return (
    <Card className="border-border/60 bg-card-elevated/20 p-4">
      <header className="mb-3">
        <h2 className="text-sm font-semibold">Pour activer le pilotage</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {readiness.completedCount}/{readiness.steps.length} étapes complétées
        </p>
      </header>
      <ul className="space-y-1.5">
        {readiness.steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="flex items-center gap-2.5 rounded-lg border border-border/40 px-3 py-2 text-sm transition-colors hover:bg-card-elevated/40"
            >
              {step.done ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={cn(
                  "min-w-0 truncate",
                  step.done ? "text-muted-foreground line-through" : "font-medium",
                )}
              >
                {step.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
