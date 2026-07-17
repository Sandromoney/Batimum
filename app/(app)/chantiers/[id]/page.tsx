"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { MumIaContextButton } from "@/components/mum-ia-context-button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { DateInput, Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EntityHistoriqueSection } from "@/components/entity-historique-section";
import { ChantierAffectationsSummary } from "@/components/chantier-affectations-summary";
import { ChantierBeneficeSummary } from "@/components/chantier-benefice-summary";
import {
  ChantierRentabilitePanel,
  computeRentabiliteForChantier,
} from "@/components/chantier-rentabilite-panel";
import { ChantierTimeEntriesPanel } from "@/components/chantier-time-entries-panel";
import { syncChantierStatut } from "@/lib/chantier-statut";
import { resolveChantierHeuresPrevues } from "@/lib/pilotage";
import { useStore } from "@/lib/store";
import { getClientDisplayName } from "@/lib/clients";
import {
  calculateChantierAvancement,
  CHANTIER_STATUT_LABELS,
  getChantierEtapes,
  getChantierTypeLabel,
} from "@/lib/chantiers";
import {
  CATEGORIES_ACHAT,
  CATEGORIES_ACHAT_LABELS,
  computeChantierMarge,
  getChantierAchats,
} from "@/lib/chantier-marge";
import type { AchatChantier, CategorieAchatChantier, Chantier, EtapeChantier } from "@/lib/types";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import { FileText, Plus, Trash2 } from "lucide-react";

const ETAPE_IMPORTANCE_OPTIONS = [
  { label: "Faible", value: 1 },
  { label: "Moyenne", value: 2 },
  { label: "Forte", value: 3 },
];

export default function ChantierDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, setData } = useStore();
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepWeight, setNewStepWeight] = useState(1);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);
  const [achatToDelete, setAchatToDelete] = useState<string | null>(null);
  const [achatError, setAchatError] = useState("");
  const [newAchat, setNewAchat] = useState({
    fournisseur: "",
    libelle: "",
    montantHT: "",
    tauxTVA: "20",
    date: new Date().toISOString().slice(0, 10),
    categorie: "materiaux" as CategorieAchatChantier,
  });

  const chantier = data.chantiers.find((item) => item.id === params.id);

  const etapes = useMemo(
    () => (chantier ? getChantierEtapes(chantier) : []),
    [chantier],
  );
  const avancement = calculateChantierAvancement(etapes);

  function updateChantier(patch: Partial<Chantier>) {
    if (!chantier) return;

    setData((prev) => ({
      ...prev,
      chantiers: prev.chantiers.map((item) =>
        item.id === chantier.id
          ? syncChantierStatut({ ...item, ...patch })
          : syncChantierStatut(item),
      ),
    }));
  }

  function updateEtapes(nextEtapes: EtapeChantier[]) {
    updateChantier({ etapes: nextEtapes });
  }

  function toggleStep(id: string) {
    updateEtapes(
      etapes.map((etape) =>
        etape.id === id ? { ...etape, fait: !etape.fait } : etape,
      ),
    );
  }

  function updateStepWeight(id: string, poids: number) {
    updateEtapes(
      etapes.map((etape) =>
        etape.id === id ? { ...etape, poids: Math.min(3, Math.max(1, poids)) } : etape,
      ),
    );
  }

  function addStep() {
    const titre = newStepTitle.trim();
    if (!titre) return;

    updateEtapes([
      ...etapes,
      {
        id: generateId(),
        titre,
        fait: false,
        poids: Math.min(3, Math.max(1, newStepWeight)),
      },
    ]);
    setNewStepTitle("");
    setNewStepWeight(1);
  }

  function removeStep(id: string) {
    updateEtapes(etapes.filter((etape) => etape.id !== id));
  }

  function addAchat() {
    if (!chantier) return;
    const montantHT = Number(newAchat.montantHT);
    if (!newAchat.fournisseur.trim() || !newAchat.libelle.trim() || !(montantHT > 0)) {
      setAchatError(
        "Renseignez le fournisseur, le libellé et un montant HT supérieur à 0.",
      );
      return;
    }
    setAchatError("");

    const achat: AchatChantier = {
      id: generateId(),
      fournisseur: newAchat.fournisseur.trim(),
      libelle: newAchat.libelle.trim(),
      montantHT,
      tauxTVA: Number(newAchat.tauxTVA) || 0,
      date: newAchat.date,
      categorie: newAchat.categorie,
    };

    updateChantier({ achats: [...getChantierAchats(chantier), achat] });
    setNewAchat({
      fournisseur: "",
      libelle: "",
      montantHT: "",
      tauxTVA: newAchat.tauxTVA,
      date: new Date().toISOString().slice(0, 10),
      categorie: newAchat.categorie,
    });
  }

  function removeAchat(id: string) {
    if (!chantier) return;
    updateChantier({
      achats: getChantierAchats(chantier).filter((achat) => achat.id !== id),
    });
  }

  if (!chantier) {
    return (
      <>
        <PageHeader
          title="Chantier introuvable"
          description="Ce chantier n'existe pas ou a été supprimé."
        />
        <Link
          href="/chantiers"
          className="text-sm font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
        >
          Retour aux chantiers
        </Link>
      </>
    );
  }

  const client = data.clients.find((item) => item.id === chantier.clientId);
  const devisLabel =
    chantier.devisNumber ??
    (chantier.devisId
      ? data.devis.find((item) => item.id === chantier.devisId)?.numero
      : undefined);
  const achats = getChantierAchats(chantier);
  const marge = computeChantierMarge(chantier, data.factures, data.avoirs);
  const devisLie = chantier.devisId
    ? data.devis.find((item) => item.id === chantier.devisId)
    : undefined;
  const rentabilite = computeRentabiliteForChantier(chantier, data);
  const heuresPrevues = resolveChantierHeuresPrevues(chantier, devisLie);

  return (
    <>
      <PageHeader
        title={chantier.nom}
        description="Suivi automatique de l'avancement et des statuts"
        action={
          <MumIaContextButton
            source="chantier"
            entityId={chantier.id}
            entityLabel={chantier.nom}
            description={devisLie?.descriptionChantier ?? chantier.nom}
            typeChantier={chantier.type}
            returnHref={`/chantiers/${chantier.id}`}
          />
        }
      />

      <section className="mb-6">
        <Link
          href="/chantiers"
          className="text-sm font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
        >
          Retour aux chantiers
        </Link>
      </section>

      <section className="mb-6">
        <ChantierBeneficeSummary rentabilite={rentabilite} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
        <Card>
          <header className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">
              Informations chantier
            </h2>
            <Badge label={CHANTIER_STATUT_LABELS[chantier.statut]} status={chantier.statut} />
          </header>

          <dl className="space-y-4 text-sm">
            {chantier.devisId && devisLabel ? (
              <section className="rounded-xl border border-border/60 bg-card-elevated/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Créé depuis le devis{" "}
                  <span className="font-medium text-foreground">
                    {devisLabel}
                  </span>
                </p>
                <Link
                  href={`/devis/${chantier.devisId}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary-hover"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Voir le devis
                </Link>
              </section>
            ) : null}
            <section className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Client</dt>
              <dd className="font-medium text-foreground">
                {getClientDisplayName(client)}
              </dd>
            </section>
            <section className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium text-foreground">
                {getChantierTypeLabel(chantier)}
              </dd>
            </section>
            <section className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Adresse</dt>
              <dd className="text-right font-medium text-foreground">
                {chantier.adresse || "—"}
              </dd>
            </section>
            <section className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Budget</dt>
              <dd className="font-semibold text-foreground">
                {formatCurrency(chantier.budget)}
              </dd>
            </section>
            <section className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Début</dt>
              <dd className="font-medium text-foreground">
                {formatDate(chantier.dateDebut)}
              </dd>
            </section>
            <section className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Fin prévue</dt>
              <dd className="font-medium text-foreground">
                {chantier.dateFin ? formatDate(chantier.dateFin) : "—"}
              </dd>
            </section>
          </dl>

          <section className="mt-8">
            <ProgressBar value={avancement} size="md" label="Avancement" />
          </section>
        </Card>

        <Card>
          <header className="mb-5">
            <h2 className="text-base font-semibold tracking-tight">
              Étapes du chantier
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Certaines étapes peuvent compter davantage dans l’avancement global.
            </p>
          </header>

          <ul className="space-y-3">
            {etapes.map((etape) => (
              <li
                key={etape.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card-elevated/40 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={etape.fait}
                  onChange={() => toggleStep(etape.id)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                  {etape.titre}
                </span>
                <section className="w-36">
                  <Label>Importance de l’étape</Label>
                  <Select
                    value={String(etape.poids)}
                    onChange={(event) =>
                      updateStepWeight(etape.id, Number(event.target.value))
                    }
                  >
                    {ETAPE_IMPORTANCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </section>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setStepToDelete(etape.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>

          <form
            className="mt-5 grid gap-3 rounded-xl border border-border/60 bg-card-elevated/40 p-4 sm:grid-cols-[1fr_10rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              addStep();
            }}
          >
            <section>
              <Label>Nouvelle étape</Label>
              <Input
                value={newStepTitle}
                onChange={(event) => setNewStepTitle(event.target.value)}
                placeholder="Ex : Contrôle final"
              />
            </section>
            <section>
              <Label>Importance de l’étape</Label>
              <Select
                value={String(newStepWeight)}
                onChange={(event) => setNewStepWeight(Number(event.target.value))}
              >
                {ETAPE_IMPORTANCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </section>
            <section className="flex items-end">
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </section>
          </form>
        </Card>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card>
          <header className="mb-5">
            <h2 className="text-base font-semibold tracking-tight">
              Achats chantier
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Suivez les dépenses liées à ce chantier.
            </p>
          </header>

          {achats.length === 0 ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Aucun achat enregistré.
            </p>
          ) : (
            <ul className="mb-5 space-y-2">
              {achats.map((achat) => (
                <li
                  key={achat.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card-elevated/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <section>
                    <p className="font-medium text-foreground">{achat.libelle}</p>
                    <p className="text-muted-foreground">
                      {achat.fournisseur} —{" "}
                      {CATEGORIES_ACHAT_LABELS[achat.categorie]} —{" "}
                      {formatDate(achat.date)}
                    </p>
                  </section>
                  <section className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(achat.montantHT)} HT
                    </span>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setAchatToDelete(achat.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </section>
                </li>
              ))}
            </ul>
          )}

          <form
            className="grid gap-3 rounded-xl border border-border/60 bg-card-elevated/40 p-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              addAchat();
            }}
          >
            <section>
              <Label>Fournisseur</Label>
              <Input
                value={newAchat.fournisseur}
                onChange={(event) =>
                  setNewAchat((current) => ({
                    ...current,
                    fournisseur: event.target.value,
                  }))
                }
                placeholder="Ex : Point P"
              />
            </section>
            <section>
              <Label>Libellé</Label>
              <Input
                value={newAchat.libelle}
                onChange={(event) =>
                  setNewAchat((current) => ({
                    ...current,
                    libelle: event.target.value,
                  }))
                }
                placeholder="Ex : Carrelage salle de bain"
              />
            </section>
            <section>
              <Label>Montant HT (€)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={newAchat.montantHT}
                onChange={(event) =>
                  setNewAchat((current) => ({
                    ...current,
                    montantHT: event.target.value,
                  }))
                }
                placeholder="0,00"
              />
            </section>
            <section>
              <Label>TVA (%)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={newAchat.tauxTVA}
                onChange={(event) =>
                  setNewAchat((current) => ({
                    ...current,
                    tauxTVA: event.target.value,
                  }))
                }
              />
            </section>
            <section>
              <Label>Date</Label>
              <DateInput
                value={newAchat.date}
                onChangeValue={(value) =>
                  setNewAchat((current) => ({ ...current, date: value }))
                }
              />
            </section>
            <section>
              <Label>Catégorie</Label>
              <Select
                value={newAchat.categorie}
                onChange={(event) =>
                  setNewAchat((current) => ({
                    ...current,
                    categorie: event.target.value as CategorieAchatChantier,
                  }))
                }
              >
                {CATEGORIES_ACHAT.map((categorie) => (
                  <option key={categorie} value={categorie}>
                    {CATEGORIES_ACHAT_LABELS[categorie]}
                  </option>
                ))}
              </Select>
            </section>
            <section className="sm:col-span-2">
              {achatError ? (
                <p className="mb-2 text-xs text-red-400">{achatError}</p>
              ) : null}
              <Button type="submit" className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Ajouter l&apos;achat
              </Button>
            </section>
          </form>
        </Card>

        <Card>
          <header className="mb-5">
            <h2 className="text-base font-semibold tracking-tight">
              Marge chantier
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estimation basée sur le budget, la facturation et les achats.
            </p>
          </header>

          <dl className="space-y-4 text-sm">
            <section className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Budget chantier</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {formatCurrency(marge.budget)}
              </dd>
            </section>
            <section className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Total facturé (net TTC)</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {formatCurrency(marge.totalFactureTTC)}
              </dd>
            </section>
            <section className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Total facturé (HT net)</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {formatCurrency(marge.totalFactureHT)}
              </dd>
            </section>
            <section className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Total achats (HT)</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {formatCurrency(marge.totalAchatsHT)}
              </dd>
            </section>
            <section className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <dt className="font-medium text-foreground">Marge estimée (HT)</dt>
              <dd
                className={`font-semibold tabular-nums ${
                  marge.margeEstimee >= 0 ? "text-primary" : "text-red-400"
                }`}
              >
                {formatCurrency(marge.margeEstimee)}
              </dd>
            </section>
            <section className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Taux de marge</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {marge.tauxMarge.toFixed(1)} %
              </dd>
            </section>
          </dl>
        </Card>
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChantierTimeEntriesPanel chantier={chantier} heuresPrevues={heuresPrevues} />
        <ChantierRentabilitePanel rentabilite={rentabilite} />
      </section>

      <ChantierAffectationsSummary chantier={chantier} data={data} />

      <Card className="mt-6">
        <header className="mb-4">
          <h2 className="text-base font-semibold tracking-tight">
            Historique du chantier
          </h2>
        </header>
        <EntityHistoriqueSection
          title="Historique du chantier"
          historique={chantier.historique ?? []}
          emptyLabel="Aucun événement enregistré pour ce chantier."
        />
      </Card>

      <ConfirmDialog
        open={Boolean(stepToDelete)}
        title="Confirmer la suppression"
        message="Cette action est définitive. Voulez-vous continuer ?"
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setStepToDelete(null)}
        onConfirm={() => {
          if (stepToDelete) removeStep(stepToDelete);
          setStepToDelete(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(achatToDelete)}
        title="Confirmer la suppression"
        message="Supprimer cet achat ?"
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setAchatToDelete(null)}
        onConfirm={() => {
          if (achatToDelete) removeAchat(achatToDelete);
          setAchatToDelete(null);
        }}
      />
    </>
  );
}
