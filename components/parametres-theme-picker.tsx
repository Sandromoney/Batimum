"use client";

import { THEME_PREFERENCE_LABELS, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: ThemePreference[] = ["dark", "light", "system"];

export function ParametresThemePicker({
  value,
  onChange,
}: {
  value: ThemePreference;
  onChange: (theme: ThemePreference) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Apparence</legend>
      {OPTIONS.map((option) => {
        const selected = value === option;
        return (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-200",
              selected
                ? "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
                : "border-border/70 bg-card-elevated/40 hover:border-border hover:bg-card-hover/50",
            )}
          >
            <input
              type="radio"
              name="theme-preference"
              value={option}
              checked={selected}
              onChange={() => onChange(option)}
              className="h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-sm font-medium text-foreground">
              {THEME_PREFERENCE_LABELS[option]}
            </span>
          </label>
        );
      })}
      <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
        Le mode automatique suit le réglage de votre appareil (Windows, macOS,
        Android, iOS).
      </p>
    </fieldset>
  );
}
