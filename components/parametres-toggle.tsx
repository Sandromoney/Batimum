"use client";

import { cn } from "@/lib/utils";

export function ParametresToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border/80 bg-card-elevated/40 px-4 py-3 transition-colors duration-200 hover:border-border hover:bg-card-elevated/70">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-all duration-200",
          checked
            ? "border-primary bg-primary shadow-glow"
            : "border-border bg-card hover:bg-card-hover",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </button>
    </label>
  );
}
