"use client";

import { Input, Select } from "@/components/ui/input";
import {
  computeSituationMontantFromLignes,
  getDevisLignesFacturables,
  getLigneSituationPourcentageFacture,
  SITUATION_POURCENTAGE_PRESETS,
} from "@/lib/commande-situation";
import { getLigneDesignation } from "@/lib/devis-lignes";
import type { Commande, Devis } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const CUSTOM_PRESET = "custom";

function clampSituationPourcentage(
  value: number,
  dejaFacture: number,
): number {
  return Math.min(100, Math.max(dejaFacture, value));
}

export function CommandeLignesSituation({
  devis,
  commande,
  defaultTva,
  targets,
  onChangeTargets,
}: {
  devis: Devis;
  commande: Commande;
  defaultTva: number;
  targets: Record<string, number>;
  onChangeTargets: (next: Record<string, number>) => void;
}) {
  const lignes = getDevisLignesFacturables(devis);
  const summary = computeSituationMontantFromLignes({
    devis,
    commande,
    targetPourcentages: targets,
    defaultTva,
  });

  function updateTarget(ligneId: string, value: number, dejaFacture: number) {
    onChangeTargets({
      ...targets,
      [ligneId]: clampSituationPourcentage(value, dejaFacture),
    });
  }

  if (lignes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune ligne facturable sur ce devis.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border/70 bg-card-elevated/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Ligne</th>
              <th className="px-3 py-2 font-semibold text-right">Montant TTC</th>
              <th className="px-3 py-2 font-semibold text-right">Déjà facturé</th>
              <th className="px-3 py-2 font-semibold">Avancement cible</th>
              <th className="px-3 py-2 font-semibold text-right">À facturer</th>
              <th className="px-3 py-2 font-semibold text-right">Reste</th>
            </tr>
          </thead>
          <tbody>
            {summary.lignes.map((detail) => {
              const dejaFacture = detail.dejaFacture;
              const cible = targets[detail.ligneDevisId] ?? dejaFacture;
              const isPreset = SITUATION_POURCENTAGE_PRESETS.some(
                (preset) => preset === cible,
              );
              const montantRestant =
                Math.round(detail.montantLigneTTC * ((100 - cible) / 100) * 100) /
                100;

              return (
                <tr
                  key={detail.ligneDevisId}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="px-3 py-2 align-top font-medium">
                    {detail.designation}
                  </td>
                  <td className="px-3 py-2 align-top text-right tabular-nums">
                    {formatCurrency(detail.montantLigneTTC)}
                  </td>
                  <td className="px-3 py-2 align-top text-right tabular-nums text-muted-foreground">
                    {dejaFacture} %
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex min-w-[10rem] flex-col gap-1.5">
                      <Select
                        value={isPreset ? String(cible) : CUSTOM_PRESET}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === CUSTOM_PRESET) {
                            updateTarget(
                              detail.ligneDevisId,
                              dejaFacture,
                              dejaFacture,
                            );
                            return;
                          }
                          updateTarget(
                            detail.ligneDevisId,
                            Number(value),
                            dejaFacture,
                          );
                        }}
                      >
                        {SITUATION_POURCENTAGE_PRESETS.map((preset) => (
                          <option
                            key={preset}
                            value={preset}
                            disabled={preset < dejaFacture}
                          >
                            {preset} %
                          </option>
                        ))}
                        <option value={CUSTOM_PRESET}>Personnalisé</option>
                      </Select>
                      {!isPreset && (
                        <Input
                          type="number"
                          min={dejaFacture}
                          max={100}
                          step="0.1"
                          value={cible}
                          onChange={(event) =>
                            updateTarget(
                              detail.ligneDevisId,
                              Number(event.target.value) || dejaFacture,
                              dejaFacture,
                            )
                          }
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-right tabular-nums text-primary">
                    {formatCurrency(detail.montantFacture)}
                  </td>
                  <td className="px-3 py-2 align-top text-right tabular-nums text-muted-foreground">
                    {formatCurrency(montantRestant)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm">
        <p className="flex justify-between gap-4">
          <span className="text-muted-foreground">Montant à facturer (situation)</span>
          <span className="font-semibold tabular-nums text-primary">
            {formatCurrency(summary.montantTTC)}
          </span>
        </p>
        <p className="mt-2 flex justify-between gap-4 border-t border-border/60 pt-2">
          <span className="text-muted-foreground">Avancement global du devis</span>
          <span className="font-semibold tabular-nums">
            {summary.pourcentageGlobal} %
          </span>
        </p>
      </section>
    </section>
  );
}

export function buildInitialLigneSituationTargets(
  devis: Devis,
  commande: Commande,
): Record<string, number> {
  const targets: Record<string, number> = {};
  for (const ligne of getDevisLignesFacturables(devis)) {
    targets[ligne.id] = getLigneSituationPourcentageFacture(commande, ligne.id);
  }
  return targets;
}

export function getLigneSituationDesignation(devis: Devis, ligneId: string): string {
  const ligne = devis.lignes?.find((item) => item.id === ligneId);
  if (!ligne) return "Ligne";
  return getLigneDesignation(ligne) || ligne.description || "Ligne";
}
