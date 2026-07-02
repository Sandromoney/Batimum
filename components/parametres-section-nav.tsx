"use client";

import type { ParametresSectionId } from "@/lib/parametres-sections";
import { PARAMETRES_SECTIONS } from "@/lib/parametres-sections";
import { cn } from "@/lib/utils";

type ParametresSectionNavProps = {
  activeSection: ParametresSectionId;
  dirtySections: Set<ParametresSectionId>;
  disabled?: boolean;
  onSelect: (sectionId: ParametresSectionId) => void;
};

export function ParametresSectionNav({
  activeSection,
  dirtySections,
  disabled = false,
  onSelect,
}: ParametresSectionNavProps) {
  return (
    <nav
      aria-label="Sections des paramètres"
      className="lg:sticky lg:top-24 lg:self-start"
    >
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {PARAMETRES_SECTIONS.map((section) => {
          const isActive = section.id === activeSection;
          const isDirty = dirtySections.has(section.id);

          return (
            <button
              key={section.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(section.id)}
              className={cn(
                "flex min-w-[max-content] shrink-0 items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors lg:min-w-0 lg:w-full",
                isActive
                  ? "border-primary/35 bg-primary/10 text-foreground"
                  : "border-border/80 bg-card/50 text-muted-foreground hover:border-primary/20 hover:bg-card-hover hover:text-foreground",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              <span>{section.label}</span>
              {isDirty ? (
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.65)]"
                  title="Modifications non enregistrées"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
