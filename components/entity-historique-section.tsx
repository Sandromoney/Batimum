import { formatHistoriqueDate, sortHistoriqueAsc } from "@/lib/historique";

export type HistoriqueEntryLike = {
  id: string;
  label: string;
  date: string;
  meta?: Record<string, string>;
};

export function EntityHistoriqueSection({
  title = "Historique",
  historique,
  emptyLabel = "Aucun événement enregistré.",
}: {
  title?: string;
  historique: HistoriqueEntryLike[];
  emptyLabel?: string;
}) {
  if (historique.length === 0) {
    return (
      <section className="mt-6">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">{title}</h3>
        <p className="rounded-xl border border-border bg-card-elevated/60 px-4 py-3 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      </section>
    );
  }

  const entries = sortHistoriqueAsc(historique);

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-sm font-semibold tracking-tight">{title}</h3>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-border bg-card-elevated/60 px-4 py-3 text-sm"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {formatHistoriqueDate(entry.date)}
              </span>
              <span className="font-medium text-foreground">{entry.label}</span>
            </div>
            {entry.meta?.signataire && (
              <p className="mt-1 text-xs text-muted-foreground">
                Signataire : {entry.meta.signataire}
              </p>
            )}
            {entry.meta?.factureNumero && (
              <p className="mt-1 text-xs text-muted-foreground">
                Facture : {entry.meta.factureNumero}
              </p>
            )}
            {entry.meta?.commandeNumero && (
              <p className="mt-1 text-xs text-muted-foreground">
                Commande : {entry.meta.commandeNumero}
              </p>
            )}
            {entry.meta?.devisNumero && (
              <p className="mt-1 text-xs text-muted-foreground">
                Devis : {entry.meta.devisNumero}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
