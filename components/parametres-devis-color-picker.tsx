"use client";

import { DEVIS_BRAND_COLORS, type DevisBrandColorId } from "@/lib/devis-brand-colors";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ParametresDevisColorPickerProps = {
  value: DevisBrandColorId;
  customHex?: string;
  onChange: (value: DevisBrandColorId, customHex?: string) => void;
};

export function ParametresDevisColorPicker({
  value,
  customHex = "#2563EB",
  onChange,
}: ParametresDevisColorPickerProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Couleur des devis</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cliquez sur une pastille ou choisissez une couleur personnalisée.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {DEVIS_BRAND_COLORS.map((color) => {
          const selected = value === color.id;
          return (
            <button
              key={color.id}
              type="button"
              title={color.label}
              onClick={() => onChange(color.id)}
              className={cn(
                "group flex flex-col items-center gap-1.5",
                selected ? "opacity-100" : "opacity-90 hover:opacity-100",
              )}
            >
              <span
                className={cn(
                  "h-11 w-11 rounded-xl border-2 shadow-sm transition-transform",
                  selected
                    ? "scale-105 border-foreground/80 ring-2 ring-primary/30"
                    : "border-border/80 group-hover:scale-105",
                )}
                style={{ backgroundColor: color.hex }}
              />
              <span className="max-w-[4.5rem] text-center text-[10px] font-medium text-muted-foreground">
                {color.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          title="Couleur personnalisée"
          onClick={() => onChange("personnalise", customHex)}
          className={cn(
            "group flex flex-col items-center gap-1.5",
            value === "personnalise" ? "opacity-100" : "opacity-90 hover:opacity-100",
          )}
        >
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border-2 bg-gradient-to-br from-pink-400 via-violet-500 to-sky-400 text-[10px] font-bold text-white shadow-sm transition-transform",
              value === "personnalise"
                ? "scale-105 border-foreground/80 ring-2 ring-primary/30"
                : "border-border/80 group-hover:scale-105",
            )}
          >
            +
          </span>
          <span className="max-w-[4.5rem] text-center text-[10px] font-medium text-muted-foreground">
            Perso.
          </span>
        </button>
      </div>

      {value === "personnalise" ? (
        <div className="flex max-w-xs items-center gap-3">
          <input
            type="color"
            value={customHex.startsWith("#") ? customHex : `#${customHex}`}
            onChange={(event) => onChange("personnalise", event.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border border-border/80 bg-transparent"
            aria-label="Couleur personnalisée"
          />
          <Input
            value={customHex}
            onChange={(event) => onChange("personnalise", event.target.value)}
            placeholder="#2563EB"
            className="font-mono text-xs"
          />
        </div>
      ) : null}
    </section>
  );
}
