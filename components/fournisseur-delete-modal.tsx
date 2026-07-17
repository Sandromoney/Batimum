"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  getFournisseurEnseigneLabel,
} from "@/lib/fourniture/helpers";
import type { Fournisseur } from "@/lib/types";

type Props = {
  open: boolean;
  fournisseur: Fournisseur | null;
  productCount: number;
  onClose: () => void;
  onConfirmDelete: (fournisseurId: string) => void;
  onArchive: (fournisseurId: string) => void;
};

export function FournisseurDeleteModal({
  open,
  fournisseur,
  productCount,
  onClose,
  onConfirmDelete,
  onArchive,
}: Props) {
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!open) setConfirmText("");
  }, [open]);

  if (!open || !fournisseur) return null;

  const label = getFournisseurEnseigneLabel(fournisseur);
  const hasProducts = productCount > 0;
  const canHardDelete = !hasProducts || confirmText.trim() === "SUPPRIMER";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-white p-5 shadow-xl">
        {hasProducts ? (
          <>
            <h3 className="text-base font-semibold text-foreground">
              Ce fournisseur contient des produits
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {label} contient {productCount} produit
              {productCount > 1 ? "s" : ""}. En supprimant ce fournisseur, tous
              ses produits et ses prix seront également retirés de votre
              bibliothèque et du comparatif de prix.
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-foreground">
              <li>suppression du fournisseur ;</li>
              <li>suppression de ses produits ;</li>
              <li>retrait de ses prix du comparatif ;</li>
              <li>MUM IA ne pourra plus utiliser ces tarifs.</li>
            </ul>

            <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3">
              <p className="text-sm font-medium text-foreground">
                Alternative plus sûre
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Archivez le fournisseur pour conserver ses produits sans les
                proposer dans les sélections actives ni à MUM IA.
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => onArchive(fournisseur.id)}
              >
                Désactiver le fournisseur
              </Button>
            </div>

            <div className="mt-4">
              <Label>Tapez SUPPRIMER pour confirmer</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="mt-1"
                autoComplete="off"
              />
            </div>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-foreground">
              Supprimer ce fournisseur ?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Le fournisseur {label} sera supprimé de votre compte.
            </p>
          </>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={!canHardDelete}
            className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
            onClick={() => {
              if (!canHardDelete) return;
              onConfirmDelete(fournisseur.id);
            }}
          >
            {hasProducts ? "Supprimer définitivement" : "Supprimer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
