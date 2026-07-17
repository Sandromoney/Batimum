"use client";

import { useMemo } from "react";
import { getProactiveDevisSuggestions } from "@/lib/entreprise-memoire";
import type { AppData, TypeChantier } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Lightbulb } from "lucide-react";

type EntrepriseSuggestionsStripProps = {
  data: AppData;
  typeChantier?: TypeChantier;
  onSelect: (item: {
    designation: string;
    unite: string;
    prixUnitaireHT: number;
  }) => void;
};

export function EntrepriseSuggestionsStrip({
  data,
  typeChantier,
  onSelect,
}: EntrepriseSuggestionsStripProps) {
  const suggestions = useMemo(
    () => getProactiveDevisSuggestions(data, { typeChantier, limit: 6 }),
    [data, typeChantier],
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl border border-border/50 bg-card-elevated/25 px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.75} />
        Suggestions fréquentes dans votre entreprise
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <button
            key={item.id}
            type="button"
            className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
            onClick={() =>
              onSelect({
                designation: item.designation,
                unite: item.unite,
                prixUnitaireHT: item.prixMoyenHT,
              })
            }
            title={`Utilisé ${item.nombreUtilisations} fois`}
          >
            <span className="font-medium">{item.designation}</span>
            <span className="ml-1 text-muted-foreground">
              · {formatCurrency(item.prixMoyenHT)} · {item.nombreUtilisations}×
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
