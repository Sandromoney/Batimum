"use client";

import { Card } from "@/components/ui/card";
import {
  formatChantierBeneficePhrase,
  formatChantierTempsComparatif,
} from "@/lib/pilotage/chantier-summary";
import type { ChantierRentabiliteResume } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

export function ChantierBeneficeSummary({
  rentabilite,
}: {
  rentabilite: ChantierRentabiliteResume;
}) {
  const phrase = formatChantierBeneficePhrase(rentabilite);
  const tempsPhrase = formatChantierTempsComparatif(rentabilite);
  const isPositive = rentabilite.beneficeReel >= 0;
  const hasBenefice =
    rentabilite.coutTotalReel > 0 || rentabilite.tempsReelHeures > 0;

  return (
    <Card
      className={`border-l-4 p-5 ${
        !hasBenefice
          ? "border-l-border bg-card-elevated/30"
          : isPositive
            ? "border-l-emerald-500 bg-emerald-500/[0.04]"
            : "border-l-amber-500 bg-amber-500/[0.04]"
      }`}
    >
      <div className="flex items-start gap-3">
        {hasBenefice ? (
          isPositive ? (
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          )
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-snug text-foreground">
            {phrase}
          </p>
          {hasBenefice && rentabilite.prixVenteHT > 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{tempsPhrase}</p>
          ) : null}
          {hasBenefice ? (
            <dl className="mt-3 flex flex-wrap gap-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Vente HT</dt>
                <dd className="font-semibold tabular-nums">
                  {formatCurrency(rentabilite.prixVenteHT)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Coûts réels</dt>
                <dd className="font-semibold tabular-nums">
                  {formatCurrency(rentabilite.coutTotalReel)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Écart coût</dt>
                <dd
                  className={`font-semibold tabular-nums ${
                    rentabilite.ecartCoutTotal > 0
                      ? "text-amber-300"
                      : "text-emerald-400"
                  }`}
                >
                  {rentabilite.ecartCoutTotal >= 0 ? "+" : ""}
                  {formatCurrency(rentabilite.ecartCoutTotal)}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
