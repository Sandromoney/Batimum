"use client";

import type { DevisTvaRecap } from "@/lib/devis-tva";
import { formatCurrency } from "@/lib/utils";

export function DevisTvaRecapSummary({ recap }: { recap: DevisTvaRecap }) {
  return (
    <section className="mt-5 rounded-xl border border-border bg-card-elevated px-4 py-3 text-sm">
      <p className="flex justify-between gap-4 text-muted-foreground">
        <span>Total HT</span>
        <span className="tabular-nums">{formatCurrency(recap.totalHT)}</span>
      </p>
      {recap.tva55 > 0 && (
        <p className="mt-2 flex justify-between gap-4 text-muted-foreground">
          <span>TVA 5,5 %</span>
          <span className="tabular-nums">{formatCurrency(recap.tva55)}</span>
        </p>
      )}
      {recap.tva10 > 0 && (
        <p className="mt-2 flex justify-between gap-4 text-muted-foreground">
          <span>TVA 10 %</span>
          <span className="tabular-nums">{formatCurrency(recap.tva10)}</span>
        </p>
      )}
      {recap.tva20 > 0 && (
        <p className="mt-2 flex justify-between gap-4 text-muted-foreground">
          <span>TVA 20 %</span>
          <span className="tabular-nums">{formatCurrency(recap.tva20)}</span>
        </p>
      )}
      <p className="mt-2 flex justify-between gap-4 border-t border-border/60 pt-2 text-muted-foreground">
        <span>TVA totale</span>
        <span className="tabular-nums">{formatCurrency(recap.tvaTotale)}</span>
      </p>
      <p className="mt-2 flex justify-between gap-4 font-semibold text-foreground">
        <span>Total TTC</span>
        <span className="tabular-nums">{formatCurrency(recap.totalTTC)}</span>
      </p>
    </section>
  );
}
