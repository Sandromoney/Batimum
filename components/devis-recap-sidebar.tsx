"use client";

import type { DevisTvaRecap } from "@/lib/devis-tva";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Devis } from "@/lib/types";
import { Check, Save, X } from "lucide-react";

export function DevisRecapSidebar({
  recap,
  devis,
  onUpdateAcompte,
  onSave,
  onValidate,
  saved = false,
  onClose,
  variant = "card",
}: {
  recap: DevisTvaRecap;
  devis: Devis;
  onUpdateAcompte: (patch: Partial<Devis>) => void;
  onSave?: () => void;
  onValidate?: () => void;
  saved?: boolean;
  onClose?: () => void;
  variant?: "card" | "panel";
}) {
  const acompteMode = devis.acompteDemandeMode ?? "pourcentage";
  const acompteValeur = devis.acompteDemande ?? 0;
  const acompteMontant =
    acompteMode === "pourcentage"
      ? (recap.totalTTC * acompteValeur) / 100
      : acompteValeur;
  const resteAPayer = Math.max(0, recap.totalTTC - acompteMontant);

  return (
    <div
      className={
        variant === "panel"
          ? "flex h-full flex-col p-5"
          : "rounded-2xl border border-primary/20 bg-card/95 p-4 shadow-card"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Récapitulatif
        </h2>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
            aria-label="Fermer le récapitulatif"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <dl className="space-y-2 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Total HT</dt>
          <dd className="font-medium tabular-nums">{formatCurrency(recap.totalHT)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">TVA</dt>
          <dd className="tabular-nums">{formatCurrency(recap.tvaTotale)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-border/50 pt-2.5 text-sm font-semibold">
          <dt>Total TTC</dt>
          <dd className="tabular-nums text-primary">{formatCurrency(recap.totalTTC)}</dd>
        </div>
      </dl>

      <section className="mt-4 space-y-2.5 border-t border-border/50 pt-4">
        <Label className="text-[10px] uppercase tracking-[0.14em]">Acompte</Label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            type="number"
            min={0}
            step={acompteMode === "pourcentage" ? "1" : "0.01"}
            className="h-8 rounded-xl border-border/70 text-xs focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
            value={acompteValeur || ""}
            onChange={(event) =>
              onUpdateAcompte({
                acompteDemande: Number(event.target.value) || 0,
              })
            }
            placeholder={acompteMode === "pourcentage" ? "30" : "0"}
          />
          <select
            className="h-8 rounded-xl border border-border/70 bg-background px-2 text-[11px] transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15"
            value={acompteMode}
            onChange={(event) =>
              onUpdateAcompte({
                acompteDemandeMode: event.target.value as "pourcentage" | "montant",
              })
            }
          >
            <option value="pourcentage">%</option>
            <option value="montant">€</option>
          </select>
        </div>
        <div className="flex justify-between gap-3 rounded-xl bg-card-elevated/40 px-2.5 py-2 text-xs">
          <span className="text-muted-foreground">Reste à payer</span>
          <span className="font-semibold tabular-nums">{formatCurrency(resteAPayer)}</span>
        </div>
      </section>

      {(onSave || onValidate) && (
        <section className="mt-auto flex flex-col gap-2 border-t border-border/50 pt-4">
          {onSave && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full rounded-xl transition-all duration-200"
              onClick={onSave}
            >
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Enregistré
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Enregistrer
                </>
              )}
            </Button>
          )}
          {onValidate && (
            <Button
              type="button"
              size="sm"
              className="w-full rounded-xl font-semibold shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
              onClick={onValidate}
            >
              Valider
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
