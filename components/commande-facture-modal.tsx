"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  buildInitialLigneSituationTargets,
  CommandeLignesSituation,
} from "@/components/commande-lignes-situation";
import {
  TYPE_FACTURE_LABELS,
  buildProgressiveBillingContext,
  resolveDevisTotalTTC,
} from "@/lib/factures-progressive";
import { createFactureFromCommande } from "@/lib/commandes";
import type { AppData, Commande, Facture, SituationMode, TypeFacture } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type ProgressiveType = Extract<TypeFacture, "acompte" | "situation" | "solde">;

export function CommandeFactureModal({
  open,
  onClose,
  commande,
  data,
  initialType = "acompte",
  onCreated,
  ligneSituationTargets: ligneSituationTargetsProp,
}: {
  open: boolean;
  onClose: () => void;
  commande: Commande;
  data: AppData;
  initialType?: ProgressiveType;
  onCreated: (
    facture: Facture,
    ligneSituationTargets?: Record<string, number>,
  ) => void;
  ligneSituationTargets?: Record<string, number>;
}) {
  const devis = data.devis.find((item) => item.id === commande.devisId);
  const client = data.clients.find((item) => item.id === commande.clientId);
  const chantier = commande.chantierId
    ? data.chantiers.find((item) => item.id === commande.chantierId)
    : undefined;

  const [type, setType] = useState<ProgressiveType>(initialType);
  const [acompteMode, setAcompteMode] = useState<"pourcentage" | "montant">(
    "pourcentage",
  );
  const [acompteValeur, setAcompteValeur] = useState("30");
  const [situationMode, setSituationMode] =
    useState<SituationMode>("pourcentage");
  const [pourcentageAvancement, setPourcentageAvancement] = useState("50");
  const [situationQuantitePourcentage, setSituationQuantitePourcentage] =
    useState("50");
  const [situationMontantLibre, setSituationMontantLibre] = useState("");
  const [error, setError] = useState("");
  const [ligneSituationTargets, setLigneSituationTargets] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    if (!open || !devis) return;
    setType(initialType);
    setError("");
    setLigneSituationTargets(
      ligneSituationTargetsProp ??
        buildInitialLigneSituationTargets(devis, commande),
    );
  }, [open, initialType, devis, commande, ligneSituationTargetsProp]);

  const totalProjetTTC = useMemo(() => {
    if (!devis) return 0;
    return resolveDevisTotalTTC(devis, data.parametres.tva);
  }, [devis, data.parametres.tva]);

  const billingCtx = useMemo(() => {
    if (!totalProjetTTC) return null;
    return buildProgressiveBillingContext(data.factures, {
      devisId: commande.devisId,
      chantierId: commande.chantierId ?? chantier?.id,
      totalProjetTTC,
    });
  }, [commande, chantier?.id, data.factures, totalProjetTTC]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!devis) {
      setError("Devis source introuvable.");
      return;
    }

    const result = createFactureFromCommande({
      commande,
      devis,
      client,
      factures: data.factures,
      chantiers: data.chantiers,
      type,
      defaultTva: data.parametres.tva,
      parametres: data.parametres,
      acompteMode,
      acompteValeur: Number(acompteValeur) || 0,
      situationMode,
      pourcentageAvancement: Number(pourcentageAvancement) || 0,
      situationQuantitePourcentage: Number(situationQuantitePourcentage) || 0,
      situationMontantLibre: Number(situationMontantLibre) || 0,
      ligneSituationTargets: type === "situation" ? ligneSituationTargets : undefined,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onCreated(result.facture, type === "situation" ? ligneSituationTargets : undefined);
  }

  if (!devis) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Créer une ${TYPE_FACTURE_LABELS[type].toLowerCase()}`}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <section>
          <Label>Type de facture</Label>
          <Select
            value={type}
            onChange={(event) => setType(event.target.value as ProgressiveType)}
          >
            <option value="acompte">Facture d&apos;acompte</option>
            <option value="situation">Facture de situation</option>
            <option value="solde">Facture de solde</option>
          </Select>
        </section>

        {billingCtx && (
          <section className="rounded-2xl border border-border bg-card-elevated/60 p-4 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total commande (TTC)</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(billingCtx.totalDevisTTC)}
              </span>
            </p>
            <p className="mt-2 flex justify-between gap-4">
              <span className="text-muted-foreground">Déjà facturé</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(billingCtx.montantDejaFacture)}
              </span>
            </p>
            <p className="mt-2 flex justify-between gap-4 border-t border-border pt-2">
              <span className="text-muted-foreground">Reste à facturer</span>
              <span className="font-semibold tabular-nums text-primary">
                {formatCurrency(billingCtx.resteAFacturer)}
              </span>
            </p>
          </section>
        )}

        {type === "acompte" && (
          <section className="grid gap-4 sm:grid-cols-2">
            <section>
              <Label>Mode acompte</Label>
              <Select
                value={acompteMode}
                onChange={(event) =>
                  setAcompteMode(event.target.value as "pourcentage" | "montant")
                }
              >
                <option value="pourcentage">Pourcentage</option>
                <option value="montant">Montant libre</option>
              </Select>
            </section>
            <section>
              <Label>
                {acompteMode === "montant"
                  ? "Montant acompte (€)"
                  : "Pourcentage (%)"}
              </Label>
              <Input
                type="number"
                min={0}
                step={acompteMode === "montant" ? "0.01" : "1"}
                max={acompteMode === "pourcentage" ? 100 : undefined}
                value={acompteValeur}
                onChange={(event) => setAcompteValeur(event.target.value)}
              />
            </section>
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Cet acompte sera déduit automatiquement sur la facture de solde.
            </p>
          </section>
        )}

        {type === "situation" && (
          <section className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choisissez l&apos;avancement par ligne du devis. Le pourcentage déjà
              facturé est mémorisé et ne peut pas être dépassé (max. 100 %).
            </p>
            <CommandeLignesSituation
              devis={devis}
              commande={commande}
              defaultTva={data.parametres.tva}
              targets={ligneSituationTargets}
              onChangeTargets={setLigneSituationTargets}
            />
          </section>
        )}

        {type === "solde" && billingCtx && (
          <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
            <p className="flex justify-between gap-4 font-semibold text-foreground">
              <span>Reste à payer</span>
              <span className="tabular-nums text-primary">
                {formatCurrency(billingCtx.resteAFacturer)}
              </span>
            </p>
            {billingCtx.deductions.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-border/60 pt-3 text-muted-foreground">
                {billingCtx.deductions.map((deduction) => (
                  <li key={deduction.factureId} className="flex justify-between gap-4">
                    <span>
                      {TYPE_FACTURE_LABELS[deduction.typeFacture]}{" "}
                      {deduction.numero}
                    </span>
                    <span className="tabular-nums text-foreground">
                      − {formatCurrency(deduction.montant)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {error && (
          <p className="rounded-xl border btp-alert-error px-4 py-3 text-sm">
            {error}
          </p>
        )}

        <section className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit">Créer la facture</Button>
        </section>
      </form>
    </Modal>
  );
}
