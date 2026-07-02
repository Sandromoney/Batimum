"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ParametresToggle } from "@/components/parametres-toggle";
import {
  DEVIS_RELANCE_NIVEAU_LABELS,
  getDevisRelanceRegles,
} from "@/lib/devis-relance-config";
import {
  getNextDevisRelance,
  hasDevisRelanceBeenSent,
} from "@/lib/devis-relances-auto";
import type { Client, Devis, Facture, Parametres, RelanceClient } from "@/lib/types";
import { formatDate, formatDateTimeFR } from "@/lib/utils";

type DevisRelancesPanelProps = {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  factures: Facture[];
  relances: RelanceClient[];
  canSendEmail?: boolean;
  emailSendDisabledTitle?: string;
  onSendRelance: () => void;
  onToggleRelancesDesactivees: (disabled: boolean) => void;
};

function relanceStatutLabel(statut: RelanceClient["statut"]) {
  if (statut === "envoyee") return "Envoyée";
  if (statut === "envoyee_simulee") return "Envoyée (simulation)";
  return "En attente d'envoi";
}

export function DevisRelancesPanel({
  devis,
  client,
  parametres,
  factures,
  relances,
  canSendEmail = true,
  emailSendDisabledTitle = "Veuillez connecter votre email avant d'envoyer ce document.",
  onSendRelance,
  onToggleRelancesDesactivees,
}: DevisRelancesPanelProps) {
  const nextRelance = getNextDevisRelance(devis, parametres, factures);
  const devisRelances = relances
    .filter(
      (relance) =>
        relance.documentType === "devis" && relance.documentId === devis.id,
    )
    .sort((a, b) => b.dateRelance.localeCompare(a.dateRelance));

  const regles = getDevisRelanceRegles(parametres);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card-elevated/60 p-4">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">
          Suivi des relances devis
        </h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Date d&apos;envoi</dt>
            <dd className="mt-1 font-medium text-foreground">
              {devis.sentAt ? formatDateTimeFR(devis.sentAt) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Relances envoyées</dt>
            <dd className="mt-1 font-medium text-foreground">
              {devis.relanceCount ?? devis.relancesProgrammees?.length ?? 0}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Prochaine relance prévue</dt>
            <dd className="mt-1 font-medium text-foreground">
              {devis.relancesDesactivees
                ? "Relances désactivées pour ce devis"
                : nextRelance
                  ? `${nextRelance.regle.label} — ${formatDate(nextRelance.date)}`
                  : "Aucune relance programmée"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ParametresToggle
            label="Désactiver les relances pour ce devis"
            description="Aucune relance automatique ne sera envoyée"
            checked={Boolean(devis.relancesDesactivees)}
            onChange={onToggleRelancesDesactivees}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!canSendEmail}
            title={canSendEmail ? undefined : emailSendDisabledTitle}
            onClick={onSendRelance}
          >
            Envoyer une relance maintenant
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card-elevated/60 p-4">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">
          Historique des relances
        </h3>

        <ul className="mb-4 space-y-2">
          {regles.map((regle) => {
            const sent = hasDevisRelanceBeenSent(devis, regle.id);
            const relanceRecord = devisRelances.find(
              (item) => item.regleRelanceId === regle.id,
            );
            const statut = devis.relancesDesactivees
              ? "désactivée"
              : sent
                ? "envoyée"
                : regle.actif && parametres.relancesDevisAutomatiques
                  ? "en attente"
                  : "désactivée";

            return (
              <li
                key={regle.id}
                className="flex flex-col gap-1 rounded-xl border border-border bg-card px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-foreground">
                  {regle.label} (J+{regle.joursApresEnvoi})
                </span>
                <div className="flex items-center gap-2">
                  {relanceRecord ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDateTimeFR(relanceRecord.dateRelance)}
                    </span>
                  ) : null}
                  <Badge
                    label={statut}
                    status={
                      statut === "envoyée"
                        ? "payee"
                        : statut === "en attente"
                          ? "en_attente"
                          : "brouillon"
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {devisRelances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune relance envoyée pour ce devis.
          </p>
        ) : (
          <ul className="space-y-2">
            {devisRelances.map((relance) => (
              <li
                key={relance.id}
                className="rounded-xl border border-border bg-card px-3 py-3 text-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-foreground">
                    {relance.niveauRelanceDevis
                      ? DEVIS_RELANCE_NIVEAU_LABELS[relance.niveauRelanceDevis]
                      : relance.typeRelance === "automatique"
                        ? "Relance automatique"
                        : "Relance manuelle"}
                    {client ? ` — ${client.email ?? ""}` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDateTimeFR(relance.dateRelance)}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{relance.message}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                  {relanceStatutLabel(relance.statut)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
