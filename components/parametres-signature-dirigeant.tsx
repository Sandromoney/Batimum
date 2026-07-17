"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DevisColorSamplePreview } from "@/components/devis-color-sample-preview";
import { DevisSignatureCanvas } from "@/components/devis-signature-canvas";
import { Button } from "@/components/ui/button";
import { resolveDevisBrandHex } from "@/lib/devis-brand-colors";
import type { Parametres } from "@/lib/types";
import { Lock, Pencil, Trash2 } from "lucide-react";

type ParametresSignatureDirigeantProps = {
  value: string;
  onChange: (value: string | undefined) => void;
  parametres: Parametres;
};

function isSavedSignature(value: string): boolean {
  return Boolean(value?.startsWith("data:image"));
}

export function ParametresSignatureDirigeant({
  value,
  onChange,
  parametres,
}: ParametresSignatureDirigeantProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [canvasSession, setCanvasSession] = useState(0);
  const [isEditing, setIsEditing] = useState(() => !isSavedSignature(value));
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const hasSavedSignature = isSavedSignature(value);
  const isLocked = hasSavedSignature && !isEditing;

  useEffect(() => {
    if (!isEditing) {
      setDraft(null);
    }
  }, [value, isEditing]);

  const previewSignature = isEditing ? draft : value || null;

  const brandHex = useMemo(
    () =>
      resolveDevisBrandHex({
        couleurDevis: parametres.couleurDevis,
        couleurDevisCustom: parametres.couleurDevisCustom,
      }),
    [parametres.couleurDevis, parametres.couleurDevisCustom],
  );

  function handleSave() {
    if (!draft?.startsWith("data:image")) return;
    onChange(draft);
    setIsEditing(false);
    setDraft(null);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  }

  function confirmEdit() {
    setConfirmEditOpen(false);
    setDraft(null);
    setCanvasSession((session) => session + 1);
    setIsEditing(true);
  }

  function confirmDelete() {
    setConfirmDeleteOpen(false);
    onChange(undefined);
    setDraft(null);
    setCanvasSession((session) => session + 1);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraft(null);
    setIsEditing(false);
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Signature électronique dirigeant
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Dessinez votre signature une fois : elle apparaîtra automatiquement sur
          tous vos devis PDF et sera conservée dans vos paramètres.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-start">
        <div className="flex flex-col items-center space-y-4 rounded-xl border border-border/60 bg-card/40 p-5">
          {isLocked ? (
            <>
              <div className="relative w-full max-w-[17rem] rounded-xl border border-border/80 bg-white px-4 py-5 shadow-sm">
                <Lock
                  className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/70"
                  aria-hidden
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt="Signature dirigeant enregistrée"
                  className="mx-auto h-[4.5rem] w-full max-w-[12.5rem] object-contain"
                />
              </div>
              <p className="text-center text-xs font-medium text-primary">
                Signature verrouillée — utilisée sur vos devis PDF
              </p>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => setConfirmEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier la signature
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Effacer la signature
                </Button>
              </div>
            </>
          ) : (
            <>
              <DevisSignatureCanvas
                key={`signature-session-${canvasSession}`}
                variant="dirigeant"
                showPlaceholder
                onChange={setDraft}
                showClearButton={!hasSavedSignature}
              />
              {hasSavedSignature ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditing}
                >
                  Annuler les modifications
                </Button>
              ) : null}
              <div className="flex w-full flex-col items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!draft?.startsWith("data:image")}
                  onClick={handleSave}
                >
                  Enregistrer la signature
                </Button>
                {savedNotice ? (
                  <span className="text-xs font-medium text-primary">
                    Signature enregistrée
                  </span>
                ) : (
                  <p className="text-center text-[10px] text-muted-foreground">
                    {hasSavedSignature
                      ? "L'ancienne signature reste active tant que vous n'enregistrez pas la nouvelle."
                      : "Pensez à cliquer sur « Enregistrer les paramètres » pour sauvegarder définitivement."}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="min-w-0 rounded-xl border border-white/10 bg-[#111118] p-4 sm:p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Aperçu sur devis PDF
          </p>
          <DevisColorSamplePreview
            brandHex={brandHex}
            parametres={parametres}
            compact
            signaturePreview={previewSignature}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmEditOpen}
        title="Modifier la signature"
        message="Toute modification remplacera la signature actuellement utilisée sur tous vos devis PDF.

Êtes-vous sûr de vouloir continuer ?"
        cancelLabel="Annuler"
        confirmLabel="Oui, modifier la signature"
        onCancel={() => setConfirmEditOpen(false)}
        onConfirm={confirmEdit}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Supprimer la signature"
        message="Êtes-vous sûr de vouloir supprimer votre signature électronique enregistrée ?"
        cancelLabel="Conserver la signature"
        confirmLabel="Supprimer définitivement"
        variant="danger"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
