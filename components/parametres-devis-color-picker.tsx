"use client";

import { DEVIS_BRAND_COLORS, type DevisBrandColorId } from "@/lib/devis-brand-colors";
import { cn } from "@/lib/utils";

type ParametresDevisColorPickerProps = {
  value: DevisBrandColorId;
  onChange: (value: DevisBrandColorId) => void;
};

export function ParametresDevisColorPicker({
  value,
  onChange,
}: ParametresDevisColorPickerProps) {
  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold text-foreground">Couleur des devis</p>
      <p className="text-xs text-muted-foreground">
        Appliquée aux titres, accents et éléments visuels des PDF devis.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {DEVIS_BRAND_COLORS.map((color) => {
          const selected = value === color.id;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(color.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/80 bg-card/60 hover:border-primary/20",
              )}
            >
              <span
                className="h-8 w-8 shrink-0 rounded-full border border-border/80"
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-sm font-medium text-foreground">
                {color.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
