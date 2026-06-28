"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CommandeFactureModal } from "@/components/commande-facture-modal";
import {
  buildInitialLigneSituationTargets,
  CommandeLignesSituation,
} from "@/components/commande-lignes-situation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { getClientDisplayName } from "@/lib/clients";
import {
  COMMANDE_STATUT_LABELS,
  COMMANDE_STATUTS,
  applyLigneSituationAfterFacture,
  getCommandeFactures,
} from "@/lib/commandes";
import {
  appendFactureWithHistorique,
  withCommandeStatutHistorique,
} from "@/lib/historique-store";
import { EntityHistoriqueSection } from "@/components/entity-historique-section";
import {
  TYPE_FACTURE_LABELS,
  buildProgressiveBillingContext,
  getMontantFactureTTC,
  normalizeTypeFacture,
  resolveDevisTotalTTC,
} from "@/lib/factures-progressive";
import type { StatutCommande, TypeFacture } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, FileText, HardHat, Receipt } from "lucide-react";

export default function CommandeDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, setData } = useStore();
  const [factureModalOpen, setFactureModalOpen] = useState(false);
  const [factureModalType, setFactureModalType] = useState<
    Extract<TypeFacture, "acompte" | "situation" | "solde">
  >("acompte");
  const [ligneSituationTargets, setLigneSituationTargets] = useState<
    Record<string, number>
  >({});

  const commande = data.commandes.find((item) => item.id === params.id);
  const devis = commande
    ? data.devis.find((item) => item.id === commande.devisId)
    : undefined;
  const client = commande
    ? data.clients.find((item) => item.id === commande.clientId)
    : undefined;
  const chantier = commande?.chantierId
    ? data.chantiers.find((item) => item.id === commande.chantierId)
    : data.chantiers.find((item) => item.devisId === commande?.devisId);

  const totalProjetTTC = useMemo(() => {
    if (!devis) return commande?.montantTTC ?? 0;
    return resolveDevisTotalTTC(devis, data.parametres.tva);
  }, [commande?.montantTTC, devis, data.parametres.tva]);

  const billingCtx = useMemo(() => {
    if (!commande || !totalProjetTTC) return null;
    return buildProgressiveBillingContext(data.factures, {
      devisId: commande.devisId,
      chantierId: commande.chantierId ?? chantier?.id,
      totalProjetTTC,
    });
  }, [chantier?.id, commande, data.factures, totalProjetTTC]);

  const linkedFactures = useMemo(() => {
    if (!commande) return [];
    return getCommandeFactures(data.factures, commande).sort((a, b) =>
      b.dateEmission.localeCompare(a.dateEmission),
    );
  }, [commande, data.factures]);

  useEffect(() => {
    if (!commande || !devis) return;
    setLigneSituationTargets(
      buildInitialLigneSituationTargets(devis, commande),
    );
  }, [commande, devis]);

  function updateStatut(statut: StatutCommande) {
    if (!commande) return;
    setData((prev) => ({
      ...prev,
      ...withCommandeStatutHistorique(prev, commande.id, statut),
    }));
  }

  function openFactureModal(type: Extract<TypeFacture, "acompte" | "situation" | "solde">) {
    setFactureModalType(type);
    setFactureModalOpen(true);
  }

  function handleFactureCreated(
    facture: (typeof data.factures)[number],
    targets?: Record<string, number>,
  ) {
    const situationTargets = targets ?? ligneSituationTargets;
    setData((prev) => {
      const withHistorique = appendFactureWithHistorique(prev, facture);
      return {
        ...prev,
        ...withHistorique,
        commandes:
          facture.typeFacture === "situation" && commande
            ? withHistorique.commandes.map((item) =>
                item.id === commande.id
                  ? applyLigneSituationAfterFacture(item, situationTargets)
                  : item,
              )
            : withHistorique.commandes,
      };
    });
    setFactureModalOpen(false);
  }

  if (!commande) {
    return (
      <>
        <Link
          href="/commandes"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux commandes
        </Link>
        <p className="text-muted-foreground">Commande introuvable.</p>
      </>
    );
  }

  const canBill = commande.statut !== "annulee";

  return (
    <>
      <Link
        href="/commandes"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux commandes
      </Link>

      <PageHeader
        title={commande.numero}
        description={commande.devisTitre ?? "Commande client"}
        action={
          <Badge
            label={COMMANDE_STATUT_LABELS[commande.statut]}
            status={commande.statut}
          />
        }
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-5 text-base font-semibold tracking-tight">
            Informations
          </h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Client</dt>
              <dd className="mt-1 font-medium text-foreground">
                {getClientDisplayName(client)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Devis source</dt>
              <dd className="mt-1">
                <Link
                  href={`/devis/${commande.devisId}`}
                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {commande.devisNumero ?? devis?.numero ?? "Devis"}
                  {commande.devisTitre ? ` — ${commande.devisTitre}` : ""}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Montant devis</dt>
              <dd className="mt-1 font-semibold tabular-nums text-foreground">
                {formatCurrency(commande.montantTTC)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Chantier lié</dt>
              <dd className="mt-1">
                {chantier ? (
                  <Link
                    href={`/chantiers/${chantier.id}`}
                    className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                  >
                    <HardHat className="h-4 w-4" />
                    {chantier.nom}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Aucun chantier lié</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Date de création</dt>
              <dd className="mt-1 text-foreground">
                {formatDate(commande.dateCreation)}
              </dd>
            </div>
            <div>
              <Label>Statut commande</Label>
              <Select
                value={commande.statut}
                className="mt-2"
                onChange={(event) =>
                  updateStatut(event.target.value as StatutCommande)
                }
              >
                {COMMANDE_STATUTS.map((statut) => (
                  <option key={statut} value={statut}>
                    {COMMANDE_STATUT_LABELS[statut]}
                  </option>
                ))}
              </Select>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-5 text-base font-semibold tracking-tight">
            Avancement facturation
          </h2>
          {billingCtx ? (
            <section className="space-y-3 text-sm">
              <p className="flex justify-between gap-4">
                <span className="text-muted-foreground">Total commande (TTC)</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(billingCtx.totalDevisTTC)}
                </span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-muted-foreground">Déjà facturé</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(billingCtx.montantDejaFacture)}
                </span>
              </p>
              {billingCtx.montantAcomptes > 0 && (
                <p className="flex justify-between gap-4 pl-3 text-muted-foreground">
                  <span>dont acomptes</span>
                  <span className="tabular-nums">
                    {formatCurrency(billingCtx.montantAcomptes)}
                  </span>
                </p>
              )}
              {billingCtx.montantSituations > 0 && (
                <p className="flex justify-between gap-4 pl-3 text-muted-foreground">
                  <span>dont situations</span>
                  <span className="tabular-nums">
                    {formatCurrency(billingCtx.montantSituations)}
                  </span>
                </p>
              )}
              <p className="flex justify-between gap-4 border-t border-border pt-3">
                <span className="text-muted-foreground">Reste à facturer</span>
                <span className="font-semibold tabular-nums text-primary">
                  {formatCurrency(billingCtx.resteAFacturer)}
                </span>
              </p>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune donnée de facturation disponible.
            </p>
          )}

          {canBill && (
            <section className="mt-6 flex flex-col gap-2">
              <Button
                variant="secondary"
                onClick={() => openFactureModal("acompte")}
              >
                <Receipt className="h-4 w-4" />
                Facture d&apos;acompte
              </Button>
              <Button
                variant="secondary"
                onClick={() => openFactureModal("situation")}
              >
                <Receipt className="h-4 w-4" />
                Facture de situation
              </Button>
              <Button
                variant="secondary"
                disabled={!billingCtx || billingCtx.resteAFacturer <= 0}
                onClick={() => openFactureModal("solde")}
              >
                <Receipt className="h-4 w-4" />
                Facture de solde
                {billingCtx && billingCtx.resteAFacturer > 0
                  ? ` (${formatCurrency(billingCtx.resteAFacturer)})`
                  : ""}
              </Button>
              <Link href="/factures" className="mt-2">
                <Button variant="ghost" size="sm" className="w-full">
                  Voir toutes les factures
                </Button>
              </Link>
            </section>
          )}
        </Card>
      </section>

      {devis && canBill && (
        <Card className="mt-6">
          <h2 className="mb-2 text-base font-semibold tracking-tight">
            Lignes du devis — facturation par situation
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Définissez l&apos;avancement par ligne avant de créer une facture de
            situation. Les pourcentages déjà facturés sont conservés.
          </p>
          <CommandeLignesSituation
            devis={devis}
            commande={commande}
            defaultTva={data.parametres.tva}
            targets={ligneSituationTargets}
            onChangeTargets={setLigneSituationTargets}
          />
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="mb-4 text-base font-semibold tracking-tight">
          Factures liées
        </h2>
        {linkedFactures.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune facture créée pour cette commande.
          </p>
        ) : (
          <ul className="space-y-3">
            {linkedFactures.map((facture) => (
              <li
                key={facture.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card-elevated/40 px-4 py-3"
              >
                <section>
                  <p className="font-medium text-foreground">{facture.numero}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_FACTURE_LABELS[normalizeTypeFacture(facture.typeFacture)]}{" "}
                    · {formatDate(facture.dateEmission)}
                  </p>
                </section>
                <section className="text-right">
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(getMontantFactureTTC(facture))}
                  </p>
                  <Badge label={facture.statut} status={facture.statut} />
                </section>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <EntityHistoriqueSection
        title="Historique de la commande"
        historique={commande.historique ?? []}
        emptyLabel="Aucun événement enregistré pour cette commande."
      />

      <CommandeFactureModal
        open={factureModalOpen}
        onClose={() => setFactureModalOpen(false)}
        commande={commande}
        data={data}
        initialType={factureModalType}
        ligneSituationTargets={ligneSituationTargets}
        onCreated={handleFactureCreated}
      />
    </>
  );
}
