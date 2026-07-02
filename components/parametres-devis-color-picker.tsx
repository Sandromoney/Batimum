"use client";

import { useState } from "react";
import { DevisColorStudioModal } from "@/components/devis-color-preview-modal";
import { Button } from "@/components/ui/button";
import {
  DEVIS_BRAND_COLORS,
  normalizeDevisBrandColorId,
  resolveDevisBrandHex,
  type DevisBrandColorId,
} from "@/lib/devis-brand-colors";
import type { Parametres } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Eye, Plus } from "lucide-react";

export type DevisColorDraft = {
  couleurDevis: DevisBrandColorId;
  customHex: string;
};

type ParametresDevisColorPickerProps = {
  draft: DevisColorDraft;
  committed: DevisColorDraft;
  onDraftChange: (draft: DevisColorDraft) => void;
  onCommit: () => void;
  parametres: Parametres;
};

export function ParametresDevisColorPicker({
  draft,
  committed,
  onDraftChange,
  onCommit,
  parametres,
}: ParametresDevisColorPickerProps) {
  const [studioOpen, setStudioOpen] = useState(false);
  const [openCustomPicker, setOpenCustomPicker] = useState(false);

  const hasUnsavedDraft =
    draft.couleurDevis !== committed.couleurDevis ||
    (draft.couleurDevis === "personnalise" &&
      draft.customHex !== committed.customHex);

  const previewHex = resolveDevisBrandHex({
    couleurDevis: draft.couleurDevis,
    couleurDevisCustom: draft.customHex,
  });

  function updateDraft(couleurDevis: DevisBrandColorId, customHex?: string) {
    onDraftChange({
      couleurDevis: normalizeDevisBrandColorId(couleurDevis),
      customHex:
        couleurDevis === "personnalise"
          ? (customHex ?? draft.customHex)
          : draft.customHex,
    });
  }

  function openStudio(customPicker = false) {
    setOpenCustomPicker(customPicker);
    setStudioOpen(true);
  }

  function closeStudio() {
    onDraftChange(committed);
    setStudioOpen(false);
  }

  function saveFromStudio(nextDraft: DevisColorDraft) {
    onDraftChange(nextDraft);
    onCommit();
    setStudioOpen(false);
  }

  return (
    <>
      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Couleur des devis</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choisissez une pastille ou ouvrez le studio pour personnaliser avec
            aperçu instantané.
          </p>
          {hasUnsavedDraft ? (
            <p className="mt-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              Couleur modifiée — enregistrez-la ou validez via « Enregistrer les
              paramètres ».
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {DEVIS_BRAND_COLORS.map((color) => {
            const selected =
              draft.couleurDevis !== "personnalise" &&
              normalizeDevisBrandColorId(draft.couleurDevis) === color.id;
            return (
              <button
                key={color.id}
                type="button"
                title={color.label}
                onClick={() => updateDraft(color.id)}
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
            onClick={() => openStudio(true)}
            className={cn(
              "group flex flex-col items-center gap-1.5",
              draft.couleurDevis === "personnalise"
                ? "opacity-100"
                : "opacity-90 hover:opacity-100",
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border-2 text-white shadow-sm transition-transform",
                draft.couleurDevis === "personnalise"
                  ? "scale-105 border-foreground/80 ring-2 ring-primary/30"
                  : "border-border/80 group-hover:scale-105",
              )}
              style={{
                background:
                  draft.couleurDevis === "personnalise"
                    ? previewHex
                    : "linear-gradient(to bottom right, #ec4899, #8b5cf6, #38bdf8)",
              }}
            >
              <Plus className="h-4 w-4" />
            </span>
            <span className="max-w-[4.5rem] text-center text-[10px] font-medium text-muted-foreground">
              Perso.
            </span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => openStudio(false)}
          >
            <Eye className="h-4 w-4" />
            Voir un exemple de devis
          </Button>
        </div>
      </section>

      <DevisColorStudioModal
        open={studioOpen}
        initialDraft={draft}
        committed={committed}
        parametres={parametres}
        openCustomPicker={openCustomPicker}
        onClose={closeStudio}
        onSave={saveFromStudio}
      />
    </>
  );
}
