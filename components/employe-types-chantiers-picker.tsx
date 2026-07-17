"use client";

import {
  CATEGORIES_PILOTAGE,
  CATEGORIE_PILOTAGE_LABELS,
} from "@/lib/pilotage";
import type { CategoriePilotageChantier } from "@/lib/types";

export function EmployeTypesChantiersPicker({
  value,
  onChange,
}: {
  value: CategoriePilotageChantier[];
  onChange: (next: CategoriePilotageChantier[]) => void;
}) {
  function toggle(categorie: CategoriePilotageChantier) {
    if (value.includes(categorie)) {
      onChange(value.filter((item) => item !== categorie));
      return;
    }
    onChange([...value, categorie]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES_PILOTAGE.map((categorie) => {
        const selected = value.includes(categorie);
        return (
          <button
            key={categorie}
            type="button"
            onClick={() => toggle(categorie)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              selected
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            {CATEGORIE_PILOTAGE_LABELS[categorie]}
          </button>
        );
      })}
    </div>
  );
}
