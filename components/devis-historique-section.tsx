"use client";

import type { DevisHistoriqueEntry } from "@/lib/types";
import { formatDateTimeFR } from "@/lib/utils";

export function DevisHistoriqueSection({
  historique,
}: {
  historique: DevisHistoriqueEntry[];
}) {
  const entries = [...historique].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-sm font-semibold tracking-tight">
        Historique du devis
      </h3>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-border bg-card-elevated/60 px-4 py-3 text-sm text-muted-foreground">
          Aucun événement enregistré pour ce devis.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-border bg-card-elevated/60 px-4 py-3 text-sm"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-foreground">{entry.label}</span>
                <span className="text-muted-foreground">
                  {formatDateTimeFR(entry.date)}
                </span>
              </div>
              {entry.meta?.motif && (
                <p className="mt-1 text-muted-foreground">Motif : {entry.meta.motif}</p>
              )}
              {entry.meta?.signataire && (
                <p className="mt-1 text-muted-foreground">
                  Signataire : {entry.meta.signataire}
                </p>
              )}
              {entry.meta?.pdfOfficiel === "true" && (
                <p className="mt-1 text-xs font-medium text-success">
                  Version officielle (PDF signé)
                </p>
              )}
              {entry.meta?.verrouille === "true" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Devis verrouillé — modifications via duplication uniquement
                </p>
              )}
              {entry.meta?.utilisateur && (
                <p className="mt-1 text-muted-foreground">
                  Par : {entry.meta.utilisateur}
                </p>
              )}
              {entry.meta?.clientIp && (
                <p className="mt-1 text-xs text-muted-foreground">
                  IP client : {entry.meta.clientIp}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
