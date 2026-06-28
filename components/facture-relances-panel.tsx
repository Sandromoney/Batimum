"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ParametresToggle } from "@/components/parametres-toggle";
import { EntityHistoriqueSection } from "@/components/entity-historique-section";
import {
  downloadFactureElectroniqueJson,
  validateFactureMentionsObligatoires,
  buildFactureElectroniqueExport,
} from "@/lib/facture-electronique";
import { downloadFacturePdf } from "@/lib/facture-pdf";
import { getFactureDisplayStatut } from "@/lib/facture-statut";
import {
  getNextFactureRelance,
  RELANCE_NIVEAU_LABELS,
} from "@/lib/facture-relances-auto";
import type { Client, Facture, Parametres, RelanceClient } from "@/lib/types";
import { formatDate, formatDateTimeFR } from "@/lib/utils";

type FactureRelancesPanelProps = {
  facture: Facture;
  client?: Client;
  parametres: Parametres;
  allFactures: Facture[];
  relances: RelanceClient[];
  canSendEmail?: boolean;
  emailSendDisabledTitle?: string;
  onSendRelance: () => void;
  onToggleRelancesDesactivees: (disabled: boolean) => void;
};

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_attente: "Impayée",
  envoyee: "Envoyée",
  payee: "Payée",
  en_retard: "En retard",
  avoir_partiel: "Avoir partiel",
  avoir_total: "Avoir total",
};

export function FactureRelancesPanel({
  facture,
  client,
  parametres,
  allFactures,
  relances,
  canSendEmail = true,
  emailSendDisabledTitle = "Veuillez connecter votre email avant d'envoyer ce document.",
  onSendRelance,
  onToggleRelancesDesactivees,
}: FactureRelancesPanelProps) {
  const displayStatut = getFactureDisplayStatut(facture);
  const nextRelance = getNextFactureRelance(facture, parametres);
  const factureRelances = relances
    .filter(
      (relance) =>
        relance.documentType === "facture" && relance.documentId === facture.id,
    )
    .sort((a, b) => b.dateRelance.localeCompare(a.dateRelance));

  const conformite =
    parametres.eFacturationPrete
      ? validateFactureMentionsObligatoires({
          facture,
          client,
          parametres,
          allFactures,
        })
      : [];
  const conformiteOk =
    conformite.length === 0 || conformite.every((mention) => mention.ok);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card-elevated/60 p-4">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">
          Suivi & relances
        </h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Statut</dt>
            <dd className="mt-1">
              <Badge label={STATUT_LABELS[displayStatut] ?? displayStatut} status={displayStatut} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Date d&apos;échéance</dt>
            <dd className="mt-1 font-medium text-foreground">
              {formatDate(facture.dateEcheance)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Prochaine relance prévue</dt>
            <dd className="mt-1 font-medium text-foreground">
              {facture.relancesDesactivees
                ? "Relances désactivées pour cette facture"
                : nextRelance
                  ? `${RELANCE_NIVEAU_LABELS[nextRelance.niveau]} — ${formatDate(nextRelance.date)}`
                  : "Aucune relance programmée"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ParametresToggle
            label="Désactiver les relances pour cette facture"
            description="Aucune relance automatique ne sera envoyée"
            checked={Boolean(facture.relancesDesactivees)}
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
        {factureRelances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune relance envoyée pour cette facture.
          </p>
        ) : (
          <ul className="space-y-2">
            {factureRelances.map((relance) => (
              <li
                key={relance.id}
                className="rounded-xl border border-border bg-card px-3 py-3 text-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-foreground">
                    {relance.niveauRelance
                      ? RELANCE_NIVEAU_LABELS[relance.niveauRelance]
                      : relance.typeRelance === "automatique"
                        ? "Relance automatique"
                        : "Relance manuelle"}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDateTimeFR(relance.dateRelance)}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{relance.message}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                  {relance.statut === "envoyee"
                    ? "Email envoyé"
                    : relance.statut === "envoyee_simulee"
                      ? "Envoyée (simulation)"
                      : "En attente d'envoi"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card-elevated/60 p-4">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">
          Historique de la facture
        </h3>
        <EntityHistoriqueSection
          title="Historique de la facture"
          historique={facture.historique ?? []}
          emptyLabel="Aucun événement enregistré pour cette facture."
        />
      </section>

      <section className="rounded-2xl border border-border bg-card-elevated/60 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold tracking-tight">
            Facturation électronique
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                void downloadFacturePdf({ facture, client, parametres })
              }
            >
              PDF classique
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const payload = buildFactureElectroniqueExport({
                  facture,
                  client,
                  parametres,
                });
                downloadFactureElectroniqueJson(
                  payload,
                  `${facture.numero}-e-facture.json`,
                );
              }}
            >
              Export structuré
            </Button>
          </div>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Préparation Factur-X / PDP — aucune transmission automatique vers une
          plateforme agréée.
        </p>
        {parametres.eFacturationPrete && (
          <ul className="space-y-1.5 text-sm">
            {conformite.map((mention) => (
              <li
                key={mention.id}
                className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${
                  mention.ok
                    ? "border-border/60 bg-card/40"
                    : "border-amber-400/30 bg-amber-400/5"
                }`}
              >
                <span className="text-foreground">{mention.label}</span>
                <span
                  className={
                    mention.ok ? "text-primary" : "text-warning-foreground"
                  }
                >
                  {mention.ok ? "OK" : "À compléter"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {parametres.eFacturationPrete && (
          <p
            className={`mt-3 text-xs ${
              conformiteOk ? "text-primary" : "text-warning-foreground"
            }`}
          >
            {conformiteOk
              ? "Mentions obligatoires complètes pour cette facture."
              : "Certaines mentions obligatoires sont incomplètes."}
          </p>
        )}
      </section>
    </div>
  );
}
