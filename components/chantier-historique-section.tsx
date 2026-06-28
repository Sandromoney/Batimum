import type { ChantierHistoriqueEntry } from "@/lib/types";
import { formatDateTimeFR } from "@/lib/utils";

export function ChantierHistoriqueSection({
  historique,
}: {
  historique: ChantierHistoriqueEntry[];
}) {
  if (historique.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card-elevated/60 px-4 py-3 text-sm text-muted-foreground">
        Aucun événement enregistré pour ce chantier.
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
          <p className="font-semibold text-foreground">{entry.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTimeFR(entry.date)}
          </p>
        </li>
      ))}
    </ul>
  );
}
