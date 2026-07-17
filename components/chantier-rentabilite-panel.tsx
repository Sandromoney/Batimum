"use client";

import { Card } from "@/components/ui/card";
import {
  computeChantierRentabilite,
  computeLigneMargeHT,
  computeLigneTauxMarge,
} from "@/lib/pilotage";
import type { ChantierRentabiliteResume } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function MetricRow({
  label,
  value,
  highlight,
  negativeIsBad = true,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negativeIsBad?: boolean;
}) {
  const numeric = Number(value.replace(/[^\d.-]/g, ""));
  const isNegative = !Number.isNaN(numeric) && numeric < 0;
  const color =
    highlight && isNegative && negativeIsBad
      ? "text-red-400"
      : highlight && !isNegative
        ? "text-foreground"
        : "text-foreground";

  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-semibold tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}

export function ChantierRentabilitePanel({
  rentabilite,
}: {
  rentabilite: ChantierRentabiliteResume;
}) {
  return (
    <Card>
      <header className="mb-5">
        <h2 className="text-base font-semibold tracking-tight">
          Rentabilité prévu / réel
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Comparaison automatique entre devis, achats et heures pointées.
        </p>
        {rentabilite.rentabiliteIncomplete ? (
          <p className="mt-2 text-xs font-medium text-amber-700">
            {rentabilite.fiabiliteLabel}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Fiabilité : {rentabilite.fiabiliteLabel}
          </p>
        )}
      </header>

      <dl className="space-y-3">
        <MetricRow
          label="Prix de vente HT"
          value={formatCurrency(rentabilite.prixVenteHT)}
        />
        <MetricRow
          label="Achats réels (toutes catégories)"
          value={formatCurrency(rentabilite.achatsReelsHT)}
        />
        <MetricRow
          label="Coût matériaux prévu"
          value={formatCurrency(rentabilite.coutMateriauxPrevu)}
        />
        <MetricRow
          label="Coût matériaux réel"
          value={formatCurrency(rentabilite.coutMateriauxReel)}
        />
        <MetricRow
          label="Coût main-d'œuvre prévu"
          value={formatCurrency(rentabilite.coutMainOeuvrePrevu)}
        />
        <MetricRow
          label="Coût main-d'œuvre réel"
          value={formatCurrency(rentabilite.coutMainOeuvreReel)}
        />
        <MetricRow
          label="Déboursé réel"
          value={formatCurrency(rentabilite.debourseReel)}
          highlight
        />
        <MetricRow
          label="Temps prévu"
          value={`${rentabilite.tempsPrevuHeures.toFixed(1)} h`}
        />
        <MetricRow
          label="Temps réel"
          value={`${rentabilite.tempsReelHeures.toFixed(1)} h`}
        />
        <MetricRow
          label="Écart temps"
          value={`${rentabilite.ecartTempsHeures >= 0 ? "+" : ""}${rentabilite.ecartTempsHeures.toFixed(1)} h`}
          highlight
          negativeIsBad
        />
        <MetricRow
          label="Écart coût total"
          value={formatCurrency(rentabilite.ecartCoutTotal)}
          highlight
          negativeIsBad
        />
        <div className="border-t border-border pt-3">
          <MetricRow
            label="Marge prévue"
            value={formatCurrency(rentabilite.margePrevue)}
            highlight
          />
          <div className="mt-3">
            <MetricRow
              label="Marge réelle / bénéfice"
              value={formatCurrency(rentabilite.margeReelle)}
              highlight
            />
          </div>
          <div className="mt-3">
            <MetricRow
              label="Taux de rentabilité"
              value={`${rentabilite.tauxMargeReelle.toFixed(1)} %`}
              highlight
            />
          </div>
        </div>
      </dl>
    </Card>
  );
}

export function LigneMargeHint({
  prixUnitaire,
  prixAchatHT,
  quantite,
}: {
  prixUnitaire: number;
  prixAchatHT?: number;
  quantite: number;
}) {
  if (!prixAchatHT || prixAchatHT <= 0) return null;
  const ligne = {
    id: "hint",
    description: "",
    quantite,
    prixUnitaire,
    prixAchatHT,
  };
  const marge = computeLigneMargeHT(ligne);
  const taux = computeLigneTauxMarge(ligne);
  return (
    <p className="mt-1 text-[10px] text-muted-foreground">
      Marge ligne : {formatCurrency(marge)} ({taux.toFixed(1)} %)
    </p>
  );
}

export function computeRentabiliteForChantier(
  chantier: import("@/lib/types").Chantier,
  data: import("@/lib/types").AppData,
) {
  const devis = chantier.devisId
    ? data.devis.find((item) => item.id === chantier.devisId)
    : undefined;
  return computeChantierRentabilite(chantier, {
    devis,
    timeEntries: data.chantierTimeEntries ?? [],
    employes: data.employes,
    entrepriseTauxDefaut: data.parametres.tauxHoraireInterneDefaut,
  });
}
