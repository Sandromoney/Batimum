import type { FactureHistoriqueEntry } from "@/lib/types";
import { formatDateTimeFR } from "@/lib/utils";

const TYPE_LABELS: Record<FactureHistoriqueEntry["type"], string> = {
  cree: "Création",
  envoyee: "Envoi",
  payee: "Paiement",
  relance: "Relance",
  en_retard: "Retard",
  transmission_electronique: "Transmission électronique",
};

export function FactureHistoriqueSection({
  historique,
}: {
  historique: FactureHistoriqueEntry[];
}) {
  if (historique.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card-elevated/60 px-4 py-3 text-sm text-muted-foreground">
        Aucun événement enregistré pour cette facture.
      </p>
    );
  }

  const sorted = [...historique].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <ul className="space-y-3">
      {sorted.map((entry) => (
        <li
          key={entry.id}
          className="rounded-xl border border-border bg-card-elevated/60 px-4 py-3 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-foreground">{entry.label}</p>
            <span className="text-xs text-muted-foreground">
              {TYPE_LABELS[entry.type]}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTimeFR(entry.date)}
          </p>
          {entry.meta?.motif && (
            <p className="mt-2 text-xs text-muted-foreground">
              Motif : {entry.meta.motif}
            </p>
          )}
          {entry.meta?.datePaiement && (
            <p className="mt-2 text-xs text-muted-foreground">
              Date de paiement : {entry.meta.datePaiement}
            </p>
          )}
          {entry.meta?.niveauRelance && (
            <p className="mt-2 text-xs text-muted-foreground">
              Type : {entry.meta.niveauRelance}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
