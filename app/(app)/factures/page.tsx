"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { BrandLogo } from "@/components/brand-logo";
import { DataTable, RowActions, Td, Tr } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { DateInput, Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import {
  applyFactureStatutChange,
  getFactureDisplayStatut,
  markFactureCreated,
  markFactureEnvoyee,
  markFacturePayee,
  markFactureRelancee,
} from "@/lib/facture-statut";
import { FactureRelancesPanel } from "@/components/facture-relances-panel";
import { EntrepriseSendGateModal } from "@/components/entreprise-send-gate-modal";
import {
  EmailConnectionBanner,
  EMAIL_SEND_DISABLED_MESSAGE,
} from "@/components/email-connection-banner";
import { useEmailConnection } from "@/lib/hooks/use-email-connection";
import { appendFactureRelanceEntry } from "@/lib/facture-relances-auto";
import {
  appendFactureWithHistorique,
  withFacturePaidHistorique,
} from "@/lib/historique-store";
import { useStore } from "@/lib/store";
import { getClientDisplayName } from "@/lib/clients";
import {
  buildFactureReminderEmail,
  createManualFactureRelance,
  sendFactureReminderEmail,
} from "@/lib/relances";
import {
  getEntrepriseSendMissingFields,
  hasFactureBeenSentToClient,
} from "@/lib/entreprise-send-gate";
import {
  createAvoirFromFacture,
  getAvoirsForFacture,
  getTotalAvoirTTC,
  syncFactureAfterAvoir,
} from "@/lib/avoirs";
import { downloadAvoirPdf } from "@/lib/avoir-pdf";
import type { Avoir, AvoirMode, Facture, StatutFacture } from "@/lib/types";
import {
  hasValidationErrors,
  validateFacture,
  validateFactureBillingPlafond,
  type ValidationErrors,
} from "@/lib/validations";
import { FactureProgressiveForm } from "@/components/facture-progressive-form";
import {
  applyProgressiveFactureFields,
  buildProgressiveBillingContext,
  factureMontantHT,
  generateNextNumeroFacture,
  normalizeTypeFacture,
  resolveTotalProjetTTC,
  TYPE_FACTURE_LABELS,
} from "@/lib/factures";
import { formatCurrency, formatDate, formatDateTimeFR, generateId } from "@/lib/utils";
import { Download, FileMinus, Plus, Trash2 } from "lucide-react";

const statuts: StatutFacture[] = [
  "brouillon",
  "envoyee",
  "en_attente",
  "en_retard",
  "payee",
];

const FACTURE_STATUT_LABELS: Record<StatutFacture, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  en_attente: "Impayée",
  en_retard: "En retard",
  payee: "Payée",
  avoir_partiel: "Avoir partiel",
  avoir_total: "Soldée par avoir",
};

export default function FacturesPage() {
  const { data, setData } = useStore();
  const emailConnection = useEmailConnection();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Facture | null>(null);
  const [relanceTarget, setRelanceTarget] = useState<Facture | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderSendMessage, setReminderSendMessage] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showValidationToast, setShowValidationToast] = useState(false);
  const [factureToDelete, setFactureToDelete] = useState<string | null>(null);
  const [confirmPaidOpen, setConfirmPaidOpen] = useState(false);
  const [confirmRealEmailOpen, setConfirmRealEmailOpen] = useState(false);
  const [confirmRelanceOpen, setConfirmRelanceOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [avoirTarget, setAvoirTarget] = useState<Facture | null>(null);
  const [avoirMode, setAvoirMode] = useState<AvoirMode>("total");
  const [avoirMontant, setAvoirMontant] = useState("");
  const [avoirMotif, setAvoirMotif] = useState("");
  const [avoirError, setAvoirError] = useState("");
  const [entrepriseGateOpen, setEntrepriseGateOpen] = useState(false);
  const [entrepriseGateMissing, setEntrepriseGateMissing] = useState<
    ReturnType<typeof getEntrepriseSendMissingFields>
  >([]);
  const [entrepriseGateFirstSend, setEntrepriseGateFirstSend] = useState(false);
  const invalidClass = "border-red-500 focus:border-red-500 focus:ring-red-500/20";

  function openCreate() {
    setForm({
      id: generateId(),
      numero: generateNextNumeroFacture(data.factures, data.parametres),
      clientId: data.clients[0]?.id ?? "",
      typeFacture: "classique",
      montant: 0,
      statut: "en_attente",
      dateEmission: new Date().toISOString().slice(0, 10),
      dateEcheance: "",
      datePaiement: "",
      acompteMode: "pourcentage",
      acompteValeur: 30,
      pourcentageAvancement: 50,
    });
    setErrors({});
    setShowValidationToast(false);
    setOpen(true);
  }

  function save() {
    if (!form) return;

    const devisId = form.devisLieId ?? form.devisSourceId;
    const chantierId = form.chantierLieId ?? form.chantierId;
    const devisLie = devisId
      ? data.devis.find((devis) => devis.id === devisId)
      : undefined;
    const chantierLie = chantierId
      ? data.chantiers.find((chantier) => chantier.id === chantierId)
      : undefined;
    const totalProjetTTC = resolveTotalProjetTTC(
      devisLie,
      chantierLie,
      data.parametres.tva,
    );
    const factureType = normalizeTypeFacture(form.typeFacture);

    let factureForValidation = form;
    if (factureType !== "classique" && devisId && totalProjetTTC > 0) {
      const ctx = buildProgressiveBillingContext(data.factures, {
        devisId,
        chantierId,
        totalProjetTTC,
        excludeFactureId: form.id,
      });
      factureForValidation = applyProgressiveFactureFields(
        form,
        ctx,
        totalProjetTTC,
      );
    }

    const nextErrors = validateFacture(factureForValidation);
    const billingErrors = validateFactureBillingPlafond(factureForValidation, {
      factures: data.factures,
      devis: devisLie,
      chantier: chantierLie,
      defaultTva: data.parametres.tva,
    });
    const mergedErrors = { ...nextErrors, ...billingErrors };
    setErrors(mergedErrors);
    if (hasValidationErrors(mergedErrors)) {
      setShowValidationToast(true);
      return;
    }
    setData((prev) => {
      const exists = prev.factures.some((f) => f.id === form.id);
      const previous = prev.factures.find((f) => f.id === form.id);
      let factureToSave = factureForValidation;

      if (!exists) {
        factureToSave = markFactureCreated(
          applyFactureStatutChange(factureForValidation, factureForValidation.statut),
        );
      } else if (previous && previous.statut !== factureForValidation.statut) {
        factureToSave = applyFactureStatutChange(
          factureForValidation,
          factureForValidation.statut,
        );
      }

      let historiqueSlice = {
        devis: prev.devis,
        commandes: prev.commandes ?? [],
        clients: prev.clients,
        chantiers: prev.chantiers,
        factures: exists
          ? prev.factures.map((f) => (f.id === form.id ? factureToSave : f))
          : [...prev.factures, factureToSave],
      };

      if (!exists) {
        historiqueSlice = appendFactureWithHistorique(historiqueSlice, factureToSave);
      } else if (
        previous?.statut !== "payee" &&
        factureToSave.statut === "payee"
      ) {
        historiqueSlice = withFacturePaidHistorique(historiqueSlice, factureToSave);
      }

      return {
        ...prev,
        ...historiqueSlice,
      };
    });
    setOpen(false);
  }

  function remove(id: string) {
    setData((prev) => ({
      ...prev,
      factures: prev.factures.filter((f) => f.id !== id),
      avoirs: prev.avoirs.filter((avoir) => avoir.factureId !== id),
    }));
  }

  function openAvoirModal(facture: Facture) {
    setAvoirTarget(facture);
    setAvoirMode("total");
    setAvoirMontant("");
    setAvoirMotif("");
    setAvoirError("");
  }

  function saveAvoir() {
    if (!avoirTarget) return;

    const created = createAvoirFromFacture({
      facture: avoirTarget,
      avoirs: data.avoirs,
      parametres: data.parametres,
      mode: avoirMode,
      montantPartielTTC:
        avoirMode === "partiel" ? Number(avoirMontant) : undefined,
      motif: avoirMotif,
    });

    if (!created) {
      setAvoirError(
        avoirMode === "partiel"
          ? "Montant invalide ou supérieur au reste à créditer."
          : "Impossible de créer l'avoir (montant déjà crédité).",
      );
      return;
    }

    setData((prev) => {
      const nextAvoirs = [...prev.avoirs, created];
      return {
        ...prev,
        avoirs: nextAvoirs,
        factures: prev.factures.map((facture) =>
          facture.id === avoirTarget.id
            ? syncFactureAfterAvoir(facture, nextAvoirs)
            : facture,
        ),
      };
    });

    if (form?.id === avoirTarget.id) {
      setForm((current) =>
        current
          ? syncFactureAfterAvoir(current, [...data.avoirs, created])
          : current,
      );
    }

    setAvoirTarget(null);
  }

  async function handleDownloadAvoirPdf(avoir: Avoir) {
    const client = data.clients.find((item) => item.id === avoir.clientId);
    await downloadAvoirPdf(avoir, client, data.parametres);
  }

  function markFormAsPaid() {
    if (!form) return;
    setForm(markFacturePayee(form));
  }

  function openEditFacture(facture: Facture) {
    const devisId = facture.devisLieId ?? facture.devisSourceId;
    const chantierId = facture.chantierLieId ?? facture.chantierId;
    const devisLie = devisId
      ? data.devis.find((devis) => devis.id === devisId)
      : undefined;
    const chantierLie = chantierId
      ? data.chantiers.find((chantier) => chantier.id === chantierId)
      : undefined;
    const totalProjetTTC = resolveTotalProjetTTC(
      devisLie,
      chantierLie,
      data.parametres.tva,
    );
    const ctx =
      normalizeTypeFacture(facture.typeFacture) !== "classique" &&
      totalProjetTTC > 0
        ? buildProgressiveBillingContext(data.factures, {
            devisId,
            chantierId,
            totalProjetTTC,
            excludeFactureId: facture.id,
          })
        : null;
    setForm(applyProgressiveFactureFields(facture, ctx, totalProjetTTC));
    setErrors({});
    setShowValidationToast(false);
    setOpen(true);
  }

  function ensureEntrepriseReadyForFactureSend(): boolean {
    const missing = getEntrepriseSendMissingFields(data.parametres);
    if (missing.length === 0) return true;
    setEntrepriseGateMissing(missing);
    setEntrepriseGateFirstSend(
      !hasFactureBeenSentToClient(data.factures, data.relances),
    );
    setEntrepriseGateOpen(true);
    return false;
  }

  function openRelanceFacture(facture: Facture) {
    if (!ensureEntrepriseReadyForFactureSend()) return;
    setRelanceTarget(facture);
    setEmailCopied(false);
    setReminderSendMessage("");
  }

  async function copyRelanceEmail() {
    if (!relanceTarget) return;

    const client = data.clients.find((c) => c.id === relanceTarget.clientId);
    const email = buildFactureReminderEmail({
      facture: relanceTarget,
      client,
      parametres: data.parametres,
    });

    await navigator.clipboard?.writeText(
      `À: ${email.destinataire}
Objet: ${email.objet}

${email.message}`,
    );
    setEmailCopied(true);
  }

  async function sendRelanceEmail() {
    if (!reminderEmail || !relanceTarget) return;
    if (!ensureEntrepriseReadyForFactureSend()) return;

    setReminderSending(true);
    setReminderSendMessage("");
    const result = await sendFactureReminderEmail({
      facture: relanceTarget,
      client: data.clients.find((c) => c.id === relanceTarget.clientId),
      parametres: data.parametres,
      niveauRelance: "manuelle",
    });
    setReminderSendMessage(result.message ?? "Envoi réel non configuré");
    if (result.success && relanceTarget) {
      setData((prev) => ({
        ...prev,
        factures: prev.factures.map((item) =>
          item.id === relanceTarget.id
            ? markFactureRelancee(
                markFactureEnvoyee(appendFactureRelanceEntry(item, "manuelle")),
                { label: "Relance manuelle envoyée", meta: { niveauRelance: "manuelle" } },
              )
            : item,
        ),
      }));
    }
    setReminderSending(false);
  }

  async function relancerFacture(facture: Facture) {
    if (!ensureEntrepriseReadyForFactureSend()) return;

    const client = data.clients.find((c) => c.id === facture.clientId);

    await sendFactureReminderEmail({
      facture,
      client,
      parametres: data.parametres,
      niveauRelance: "manuelle",
    });
    const { relance, notification } = createManualFactureRelance(facture);
    setData((prev) => ({
      ...prev,
      factures: prev.factures.map((item) =>
        item.id === facture.id
          ? markFactureRelancee(
              markFactureEnvoyee(appendFactureRelanceEntry(item, "manuelle")),
              { label: "Relance manuelle envoyée", meta: { niveauRelance: "manuelle" } },
            )
          : item,
      ),
      relances: [...prev.relances, relance],
      notifications: [...prev.notifications, notification],
    }));
    setRelanceTarget(null);
    setEmailCopied(false);
  }

  const relanceClient = relanceTarget
    ? data.clients.find((client) => client.id === relanceTarget.clientId)
    : undefined;
  const reminderEmail = relanceTarget
    ? buildFactureReminderEmail({
        facture: relanceTarget,
        client: relanceClient,
        parametres: data.parametres,
      })
    : null;
  const isExistingFormFacture = form
    ? data.factures.some((facture) => facture.id === form.id)
    : false;
  const formDevisSource = form?.devisSourceId
    ? data.devis.find((devis) => devis.id === form.devisSourceId)
    : undefined;

  const filteredFactures = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.factures;

    return data.factures.filter((f) => {
      const client = data.clients.find((c) => c.id === f.clientId);
      const haystack = [
        f.numero,
        getClientDisplayName(client),
        FACTURE_STATUT_LABELS[f.statut],
        formatCurrency(f.montant),
        formatDate(f.dateEmission),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data.clients, data.factures, search]);

  return (
    <>
      <PageHeader
        title="Factures"
        description="Facturation et suivi des paiements"
        action={
          <Button onClick={openCreate} disabled={!data.clients.length}>
            <Plus className="h-4 w-4" />
            Nouvelle facture
          </Button>
        }
      />

      <EmailConnectionBanner
        className="mb-6"
        connected={emailConnection.connected}
        expired={emailConnection.expired}
        email={emailConnection.email}
        loading={emailConnection.loading}
      />

      <section className="mb-4 max-w-sm">
        <Input
          placeholder="Rechercher une facture (n°, client, statut, montant, date)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <DataTable
        headers={[
          "N°",
          "Type",
          "Client",
          "Devis",
          "Montant",
          "Statut",
          "Émission",
          "Échéance",
          "Paiement",
          "",
        ]}
      >
        {filteredFactures.map((f) => {
          const client = data.clients.find((c) => c.id === f.clientId);
          const devisSource = f.devisSourceId
            ? data.devis.find((devis) => devis.id === f.devisSourceId)
            : undefined;
          const avoirsFacture = getAvoirsForFacture(data.avoirs, f.id);
          const resteApresAvoir =
            f.montant - getTotalAvoirTTC(data.avoirs, f.id);
          return (
            <Tr
              key={f.id}
              onClick={() => openEditFacture(f)}
              ariaLabel={`Voir la facture ${f.numero}`}
            >
              <Td className="font-mono text-xs">{f.numero}</Td>
              <Td>
                <Badge
                  label={TYPE_FACTURE_LABELS[normalizeTypeFacture(f.typeFacture)]}
                  status={normalizeTypeFacture(f.typeFacture)}
                />
              </Td>
              <Td>{getClientDisplayName(client)}</Td>
              <Td className="text-xs text-muted-foreground">
                {devisSource ? (
                  <Link
                    href={`/devis/${devisSource.id}`}
                    className="font-mono text-primary transition-colors hover:text-primary-hover"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {devisSource.numero}
                  </Link>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="font-semibold">
                {formatCurrency(f.montant)}
                {avoirsFacture.length > 0 && (
                  <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                    Net : {formatCurrency(Math.max(0, resteApresAvoir))}
                  </p>
                )}
              </Td>
              <Td>
                <Badge
                  label={FACTURE_STATUT_LABELS[getFactureDisplayStatut(f)]}
                  status={getFactureDisplayStatut(f)}
                />
              </Td>
              <Td>{formatDate(f.dateEmission)}</Td>
              <Td>
                {f.dateEcheance ? formatDate(f.dateEcheance) : "—"}
              </Td>
              <Td>
                {f.datePaiement ? formatDate(f.datePaiement) : "—"}
              </Td>
              <Td>
                <RowActions>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditFacture(f)}
                  >
                    Éditer
                  </Button>
                  {f.statut !== "avoir_total" && resteApresAvoir > 0.01 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openAvoirModal(f)}
                    >
                      <FileMinus className="h-4 w-4" />
                      Avoir
                    </Button>
                  )}
                  {f.statut !== "payee" && f.statut !== "avoir_total" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openRelanceFacture(f)}
                    >
                      Relancer
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setFactureToDelete(f.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </RowActions>
              </Td>
            </Tr>
          );
        })}
      </DataTable>

      {filteredFactures.length === 0 && (
        <p className="mt-4 text-center text-muted-foreground">
          {data.factures.length === 0
            ? "Aucune facture."
            : "Aucun résultat trouvé."}
        </p>
      )}

      {form && (
        <Modal open={open} onClose={() => setOpen(false)} title="Facture">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {showValidationToast && (
              <p className="rounded-xl border btp-alert-error px-4 py-3 text-sm">
                Veuillez corriger les champs en rouge.
              </p>
            )}
            <FactureProgressiveForm
              form={form}
              data={data}
              errors={errors}
              invalidClass={invalidClass}
              onChange={setForm}
            />

            {form.devisSourceId && (
              <section className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">
                  Issue du devis{" "}
                  {formDevisSource ? (
                    <Link
                      href={`/devis/${form.devisSourceId}`}
                      className="font-mono text-primary hover:text-primary-hover"
                    >
                      {formDevisSource.numero}
                    </Link>
                  ) : (
                    <span className="font-mono text-muted-foreground">
                      {form.devisSourceId}
                    </span>
                  )}
                </p>
                {form.descriptionChantier && (
                  <p className="mt-1 text-muted-foreground">
                    {form.descriptionChantier}
                  </p>
                )}
                {form.adresse && (
                  <p className="mt-1 text-muted-foreground">{form.adresse}</p>
                )}
              </section>
            )}
            <section className="grid gap-4 sm:grid-cols-2">
              <section>
                <Label>N° facture</Label>
                <Input
                  value={form.numero}
                  className={errors.numero ? invalidClass : undefined}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                />
                {errors.numero && (
                  <p className="mt-1 text-sm text-red-400">{errors.numero}</p>
                )}
              </section>
              <section>
                <Label>Client</Label>
                <Select
                  value={form.clientId}
                  className={errors.clientId ? invalidClass : undefined}
                  onChange={(e) =>
                    setForm({ ...form, clientId: e.target.value })
                  }
                >
                  {data.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getClientDisplayName(c)}
                    </option>
                  ))}
                </Select>
                {errors.clientId && (
                  <p className="mt-1 text-sm text-red-400">{errors.clientId}</p>
                )}
              </section>
              <section>
                <Label>Montant TTC (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  readOnly={
                    normalizeTypeFacture(form.typeFacture) === "acompte" ||
                    normalizeTypeFacture(form.typeFacture) === "situation" ||
                    normalizeTypeFacture(form.typeFacture) === "solde"
                  }
                  value={form.montant === 0 ? "" : form.montant}
                  placeholder="0,00"
                  className={errors.montant ? invalidClass : undefined}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      montant: e.target.value === "" ? 0 : Number(e.target.value),
                      montantTTC:
                        e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                />
                {errors.montant && (
                  <p className="mt-1 text-sm text-red-400">{errors.montant}</p>
                )}
              </section>
              <section>
                <Label>Statut</Label>
                <Select
                  value={form.statut}
                  className={errors.statut ? invalidClass : undefined}
                  onChange={(e) => {
                    const nextStatut = e.target.value as StatutFacture;
                    if (nextStatut === "payee" && form.statut !== "payee") {
                      setConfirmPaidOpen(true);
                      return;
                    }
                    setForm({
                      ...form,
                      statut: nextStatut,
                      datePaiement: form.datePaiement,
                    });
                  }}
                >
                  {statuts.map((s) => (
                    <option key={s} value={s}>
                      {FACTURE_STATUT_LABELS[s]}
                    </option>
                  ))}
                </Select>
                {errors.statut && (
                  <p className="mt-1 text-sm text-red-400">{errors.statut}</p>
                )}
              </section>
              <section>
                <Label>Date émission</Label>
                <DateInput
                  value={form.dateEmission}
                  className={errors.dateEmission ? invalidClass : undefined}
                  onChangeValue={(value) => setForm({ ...form, dateEmission: value })}
                />
                {errors.dateEmission && (
                  <p className="mt-1 text-sm text-red-400">{errors.dateEmission}</p>
                )}
              </section>
              <section>
                <Label>Date échéance</Label>
                <DateInput
                  value={form.dateEcheance}
                  className={errors.dateEcheance ? invalidClass : undefined}
                  onChangeValue={(value) => setForm({ ...form, dateEcheance: value })}
                />
                {errors.dateEcheance && (
                  <p className="mt-1 text-sm text-red-400">{errors.dateEcheance}</p>
                )}
              </section>
              <section>
                <Label>Date paiement</Label>
                <DateInput
                  value={form.datePaiement ?? ""}
                  className={errors.datePaiement ? invalidClass : undefined}
                  onChangeValue={(value) => setForm({ ...form, datePaiement: value })}
                />
                {errors.datePaiement && (
                  <p className="mt-1 text-sm text-red-400">{errors.datePaiement}</p>
                )}
              </section>
            </section>
            {form.lignes && form.lignes.length > 0 && (
              <section className="rounded-2xl border border-border bg-card-elevated/60 p-4">
                <h3 className="mb-3 text-sm font-semibold tracking-tight">
                  Lignes reprises du devis
                </h3>
                <ul className="space-y-2 text-sm">
                  {form.lignes.map((ligne) => (
                    <li
                      key={ligne.id}
                      className="flex flex-col gap-1 border-b border-border/60 pb-2 last:border-0 sm:flex-row sm:justify-between"
                    >
                      <span className="text-foreground">{ligne.description}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {ligne.quantite} {ligne.unite ?? "u"} ×{" "}
                        {formatCurrency(ligne.prixUnitaire)} ={" "}
                        {formatCurrency(ligne.quantite * ligne.prixUnitaire)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex justify-between gap-4 border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Total HT</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      form.montantHT ?? factureMontantHT(form),
                    )}
                  </span>
                </p>
                {typeof form.tauxTVA === "number" && (
                  <p className="mt-1 flex justify-between gap-4 text-sm text-muted-foreground">
                    <span>TVA ({form.tauxTVA}%)</span>
                    <span>
                      {formatCurrency(
                        (form.montantTTC ?? form.montant) -
                          (form.montantHT ?? factureMontantHT(form)),
                      )}
                    </span>
                  </p>
                )}
              </section>
            )}
            {isExistingFormFacture &&
              getAvoirsForFacture(data.avoirs, form.id).length > 0 && (
                <section className="rounded-2xl border border-border bg-card-elevated/60 p-4">
                  <h3 className="mb-3 text-sm font-semibold tracking-tight">
                    Avoirs liés
                  </h3>
                  <ul className="space-y-2">
                    {getAvoirsForFacture(data.avoirs, form.id).map((avoir) => (
                      <li
                        key={avoir.id}
                        className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <section>
                          <p className="font-mono font-medium text-foreground">
                            {avoir.numero}
                          </p>
                          <p className="text-muted-foreground">
                            {avoir.mode === "total" ? "Total" : "Partiel"} —{" "}
                            {formatCurrency(avoir.montantTTC)} —{" "}
                            {formatDate(avoir.dateEmission)}
                          </p>
                          {avoir.motif && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {avoir.motif}
                            </p>
                          )}
                        </section>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleDownloadAvoirPdf(avoir)}
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            {isExistingFormFacture && (
              <FactureRelancesPanel
                facture={form}
                client={data.clients.find((c) => c.id === form.clientId)}
                parametres={data.parametres}
                allFactures={data.factures}
                relances={data.relances}
                canSendEmail={emailConnection.connected}
                emailSendDisabledTitle={EMAIL_SEND_DISABLED_MESSAGE}
                onSendRelance={() => openRelanceFacture(form)}
                onToggleRelancesDesactivees={(disabled) =>
                  setForm({ ...form, relancesDesactivees: disabled })
                }
              />
            )}
            <section className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </section>
          </form>
        </Modal>
      )}

      {relanceTarget && reminderEmail && (
        <Modal
          open={Boolean(relanceTarget)}
          onClose={() => {
            setRelanceTarget(null);
            setReminderSendMessage("");
          }}
          title="Relance client"
        >
          <section className="space-y-5">
            <div className="rounded-2xl border border-border bg-card-elevated/70 p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <BrandLogo imageClassName="h-10" showSubtitle={false} />
                <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Email simulé
                </span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Prévisualisation prête pour un futur envoi réel. Aucun email n’est
                envoyé pour l’instant.
              </p>
            </div>

            <section>
              <Label>Destinataire</Label>
              <Input readOnly value={reminderEmail.destinataire || "Email client manquant"} />
            </section>
            <section>
              <Label>Objet</Label>
              <Input readOnly value={reminderEmail.objet} />
            </section>
            <section>
              <Label>Message</Label>
              <textarea
                readOnly
                value={reminderEmail.message}
                className="mt-1 min-h-64 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none transition-colors focus:border-primary"
              />
            </section>

            {emailCopied && (
              <p className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
                Email copié dans le presse-papiers.
              </p>
            )}

            {reminderSendMessage && (
              <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-warning-foreground">
                {reminderSendMessage}
              </p>
            )}

            <section className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={copyRelanceEmail}>
                Copier l’email
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmRealEmailOpen(true)}
                disabled={reminderSending || !emailConnection.connected}
                title={
                  emailConnection.connected
                    ? undefined
                    : EMAIL_SEND_DISABLED_MESSAGE
                }
              >
                {reminderSending ? "Envoi…" : "Envoyer l’email"}
              </Button>
              <Button type="button" onClick={() => setConfirmRelanceOpen(true)}>
                Marquer comme relancé
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRelanceTarget(null)}
              >
                Fermer
              </Button>
            </section>
          </section>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(factureToDelete)}
        title="Confirmer la suppression"
        message="Cette action est définitive. Voulez-vous continuer ?"
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setFactureToDelete(null)}
        onConfirm={() => {
          if (factureToDelete) remove(factureToDelete);
          setFactureToDelete(null);
        }}
      />

      <ConfirmDialog
        open={confirmPaidOpen}
        message="Confirmer le marquage de cette facture comme payée ?"
        confirmLabel="Confirmer"
        onCancel={() => setConfirmPaidOpen(false)}
        onConfirm={() => {
          markFormAsPaid();
          setConfirmPaidOpen(false);
        }}
      />

      <ConfirmDialog
        open={confirmRealEmailOpen}
        message="Confirmer l’envoi de l’email de relance ?"
        confirmLabel="Confirmer"
        onCancel={() => setConfirmRealEmailOpen(false)}
        onConfirm={() => {
          setConfirmRealEmailOpen(false);
          void sendRelanceEmail();
        }}
      />

      <ConfirmDialog
        open={confirmRelanceOpen}
        message="Confirmer la relance simulée et l’ajout à l’historique ?"
        confirmLabel="Confirmer"
        onCancel={() => setConfirmRelanceOpen(false)}
        onConfirm={() => {
          setConfirmRelanceOpen(false);
          if (relanceTarget) void relancerFacture(relanceTarget);
        }}
      />

      {avoirTarget && (
        <Modal
          open={Boolean(avoirTarget)}
          onClose={() => setAvoirTarget(null)}
          title={`Créer un avoir — ${avoirTarget.numero}`}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveAvoir();
            }}
          >
            <p className="text-sm text-muted-foreground">
              Montant facture : {formatCurrency(avoirTarget.montant)} — Déjà
              crédité :{" "}
              {formatCurrency(getTotalAvoirTTC(data.avoirs, avoirTarget.id))} —
              Reste :{" "}
              {formatCurrency(
                Math.max(
                  0,
                  avoirTarget.montant -
                    getTotalAvoirTTC(data.avoirs, avoirTarget.id),
                ),
              )}
            </p>
            <section>
              <Label>Type d&apos;avoir</Label>
              <Select
                value={avoirMode}
                onChange={(event) =>
                  setAvoirMode(event.target.value as AvoirMode)
                }
              >
                <option value="total">Avoir total (reste à créditer)</option>
                <option value="partiel">Avoir partiel</option>
              </Select>
            </section>
            {avoirMode === "partiel" && (
              <section>
                <Label>Montant TTC à créditer (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={avoirMontant}
                  onChange={(event) => setAvoirMontant(event.target.value)}
                  placeholder="0,00"
                />
              </section>
            )}
            <section>
              <Label>Motif (optionnel)</Label>
              <Input
                value={avoirMotif}
                onChange={(event) => setAvoirMotif(event.target.value)}
                placeholder="Ex : Retour matériaux, erreur de facturation…"
              />
            </section>
            {avoirError && (
              <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
                {avoirError}
              </p>
            )}
            <section className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAvoirTarget(null)}
              >
                Annuler
              </Button>
              <Button type="submit">Créer l&apos;avoir</Button>
            </section>
          </form>
        </Modal>
      )}

      <EntrepriseSendGateModal
        open={entrepriseGateOpen}
        onClose={() => setEntrepriseGateOpen(false)}
        missing={entrepriseGateMissing}
        context="facture"
        isFirstSend={entrepriseGateFirstSend}
      />
    </>
  );
}
