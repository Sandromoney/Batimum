"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DevisColorPickerPanel } from "@/components/devis-color-picker-panel";
import { DevisColorSamplePreview } from "@/components/devis-color-sample-preview";
import { Button } from "@/components/ui/button";
import {
  DEVIS_BRAND_COLORS,
  getPresetById,
  normalizeDevisBrandColorId,
  resolveDevisBrandHex,
  type DevisBrandColorId,
} from "@/lib/devis-brand-colors";
import {
  getRecentDevisColors,
  normalizeHex,
  pushRecentDevisColor,
} from "@/lib/color-picker-utils";
import type { Parametres } from "@/lib/types";
import type { DevisColorDraft } from "@/components/parametres-devis-color-picker";
import { cn } from "@/lib/utils";
import { Plus, RotateCcw, X } from "lucide-react";

type DevisColorStudioModalProps = {
  open: boolean;
  initialDraft: DevisColorDraft;
  committed: DevisColorDraft;
  parametres: Parametres;
  openCustomPicker?: boolean;
  onClose: () => void;
  onSave: (draft: DevisColorDraft) => void;
};

function draftToHex(draft: DevisColorDraft): string {
  return resolveDevisBrandHex({
    couleurDevis: draft.couleurDevis,
    couleurDevisCustom: draft.customHex,
  });
}

export function DevisColorStudioModal({
  open,
  initialDraft,
  committed,
  parametres,
  openCustomPicker = false,
  onClose,
  onSave,
}: DevisColorStudioModalProps) {
  const [session, setSession] = useState<DevisColorDraft>(initialDraft);
  const [customPickerOpen, setCustomPickerOpen] = useState(openCustomPicker);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const wasOpenRef = useRef(false);

  const previewHex = useMemo(() => draftToHex(session), [session]);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) return;

    let nextDraft = initialDraft;
    if (openCustomPicker && nextDraft.couleurDevis !== "personnalise") {
      nextDraft = {
        couleurDevis: "personnalise",
        customHex: draftToHex(initialDraft),
      };
    }
    setSession(nextDraft);
    setCustomPickerOpen(openCustomPicker);
    setRecentColors(getRecentDevisColors());
    wasOpenRef.current = true;
  }, [open, initialDraft, openCustomPicker]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const selectCustomHex = useCallback((hex: string) => {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    setSession({ couleurDevis: "personnalise", customHex: normalized });
  }, []);

  function selectPreset(id: DevisBrandColorId) {
    const preset = getPresetById(id);
    if (!preset) return;
    setSession({
      couleurDevis: normalizeDevisBrandColorId(id),
      customHex: preset.hex,
    });
    setCustomPickerOpen(false);
  }

  function openCustom() {
    setCustomPickerOpen(true);
    if (session.couleurDevis !== "personnalise") {
      const base = draftToHex(session);
      setSession({ couleurDevis: "personnalise", customHex: base });
    }
  }

  function handleReset() {
    setSession(committed);
    setCustomPickerOpen(false);
  }

  function handleSave() {
    const hex = draftToHex(session);
    setRecentColors(pushRecentDevisColor(hex));
    onSave(session);
  }

  const isPresetSelected = (id: DevisBrandColorId) =>
    session.couleurDevis !== "personnalise" &&
    normalizeDevisBrandColorId(session.couleurDevis) === normalizeDevisBrandColorId(id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="devis-color-studio-title"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" aria-hidden />

      <div className="relative z-10 flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0b0b10] shadow-2xl sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2
              id="devis-color-studio-title"
              className="text-base font-semibold tracking-tight text-white"
            >
              Personnaliser la couleur des devis
            </h2>
            <p className="text-xs text-white/55">
              Aperçu instantané — rendu identique à vos PDF Batimum
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="hidden rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-white/80 sm:inline"
            >
              {previewHex}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
          <aside className="overflow-y-auto border-b border-white/10 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Couleurs rapides
            </p>
            <div className="flex flex-wrap gap-2.5">
              {DEVIS_BRAND_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  title={color.label}
                  onClick={() => selectPreset(color.id)}
                  className={cn(
                    "flex flex-col items-center gap-1",
                    isPresetSelected(color.id) ? "opacity-100" : "opacity-85 hover:opacity-100",
                  )}
                >
                  <span
                    className={cn(
                      "h-10 w-10 rounded-xl border-2 transition-transform",
                      isPresetSelected(color.id)
                        ? "scale-105 border-white ring-2 ring-white/30"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="max-w-[4rem] text-center text-[9px] text-white/55">
                    {color.label}
                  </span>
                </button>
              ))}
              <button
                type="button"
                title="Couleur personnalisée"
                onClick={openCustom}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border-2 bg-gradient-to-br from-pink-500 via-violet-500 to-sky-400 text-sm font-bold text-white transition-transform",
                    customPickerOpen || session.couleurDevis === "personnalise"
                      ? "scale-105 border-white ring-2 ring-white/30"
                      : "border-transparent hover:scale-105",
                  )}
                >
                  <Plus className="h-4 w-4" />
                </span>
                <span className="text-[9px] text-white/55">Perso.</span>
              </button>
            </div>

            {customPickerOpen ? (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <DevisColorPickerPanel
                  hex={session.customHex}
                  onChange={selectCustomHex}
                />
              </div>
            ) : null}

            {recentColors.length > 0 ? (
              <div className="mt-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  Couleurs récentes
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      onClick={() => {
                        selectCustomHex(color);
                        setCustomPickerOpen(true);
                      }}
                      className={cn(
                        "h-8 w-8 rounded-lg border-2 transition-transform hover:scale-105",
                        previewHex === color
                          ? "border-white ring-2 ring-white/25"
                          : "border-white/10",
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <div className="min-h-0 overflow-y-auto bg-[#111118] p-4 sm:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Aperçu devis en direct
            </p>
            <DevisColorSamplePreview brandHex={previewHex} parametres={parametres} />
          </div>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/10 bg-[#0b0b10] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser la couleur
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Fermer
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              style={{ backgroundColor: previewHex }}
              className="border-0 font-semibold text-white hover:opacity-90"
            >
              Enregistrer cette couleur
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
