"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateInput, Input, Select, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useDevisLocal } from "@/lib/hooks/use-devis-local";
import { getClientDisplayName } from "@/lib/clients";
import { ClientNameDisplay } from "@/components/client-name";
import { DevisEditorForm } from "@/components/devis-editor-form";
import { DevisLignesEditor } from "@/components/devis-lignes-editor";
import { DevisPreviewModal } from "@/components/devis-preview-modal";
import { EntityHistoriqueSection } from "@/components/entity-historique-section";
import { DevisQuickClientModal } from "@/components/devis-quick-client-modal";
import { EntrepriseSendGateModal } from "@/components/entreprise-send-gate-modal";
import {
  EmailConnectionBanner,
  resolveEmailSendDisabledTitle,
} from "@/components/email-connection-banner";
import { useEmailConnection } from "@/lib/hooks/use-email-connection";
import { useStore } from "@/lib/store";
import {
  patchLigneFields,
  createEmptyLigneDevis,
  createSectionLigne,
  ensureLeadingSectionLigne,
  hasSectionLigne,
  isSectionLigne,
} from "@/lib/devis-lignes";
import { downloadDevisPdf, downloadSignedDevisPdf, hasOfficialSignedDevisPdf } from "@/lib/devis-pdf";
import { loadSignedDevisPdf } from "@/lib/store";
import {
  buildDevisClientSendEmail,
  buildDevisReminderEmail,
  createManualDevisRelance,
  sendDevisToClient,
  sendReminderEmail,
} from "@/lib/relances";
import { publishDevisSignatureLink } from "@/lib/devis-public-signature-client";
import {
  calculateMontantTTC,
  DEVIS_STATUT_LABELS,
  duplicateDevis,
} from "@/lib/devis";
import {
  createChantierFromSignedDevis,
  findChantierForDevisId,
} from "@/lib/chantier-devis-link";
import {
  getEntrepriseSendMissingFields,
  hasDevisBeenSentToClient,
} from "@/lib/entreprise-send-gate";
import {
  applyManualDevisStatut,
  canTransitionDevisStatut,
  getAllowedManualStatuts,
  getDevisActorName,
  getDevisDisplayStatut,
  isDevisContentLocked,
  markDevisEnvoye,
  markDevisModifie,
  syncDevisExpireStatut,
  unlockSignedDevisExceptionally,
} from "@/lib/devis-statut";
import {
  computeDevisTvaRecap,
  propagateDevisTvaToLignes,
  resolveLigneDefaultTva,
  syncDevisMontantsFromLignes,
} from "@/lib/devis-tva";
import { isTvaClassique } from "@/lib/parametres";
import {
  createCommandeFromDevis,
  findCommandeByDevisId,
} from "@/lib/commandes";
import {
  appendChantierWithHistorique,
  appendCommandeWithHistorique,
  appendFactureWithHistorique,
} from "@/lib/historique-store";
import type { Client, Devis, LigneDevis, StatutDevis } from "@/lib/types";
import {
  hasValidationErrors,
  validateDevis,
  type ValidationErrors,
} from "@/lib/validations";
import {
  buildProgressiveBillingContext,
  canTransformDevisToFacture,
  createFactureFromDevis,
  createFactureProgressiveFromDevis,
  findFactureByDevisId,
  resolveDevisTotalTTC,
} from "@/lib/factures";
import { formatCurrency, formatDateTimeFR, generateId } from "@/lib/utils";
import {
  ArrowLeft,
  ClipboardList,
  Download,
  ExternalLink,
  Plus,
  Receipt,
  Send,
} from "lucide-react";

export default function DevisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const emailConnection = useEmailConnection();
  const [clientLinkCopied, setClientLinkCopied] = useState(false);
  const [relanceModalOpen, setRelanceModalOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderSendMessage, setReminderSendMessage] = useState("");
  const [sendingToClient, setSendingToClient] = useState(false);
  const [sendClientMessage, setSendClientMessage] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [confirmSendToClientOpen, setConfirmSendToClientOpen] = useState(false);
  const [sendSuccessFlash, setSendSuccessFlash] = useState(false);
  const [ligneToDelete, setLigneToDelete] = useState<string | null>(null);
  const [confirmRealEmailOpen, setConfirmRealEmailOpen] = useState(false);
  const [confirmRelanceOpen, setConfirmRelanceOpen] = useState(false);
  const [confirmTransformOpen, setConfirmTransformOpen] = useState(false);
  const [acompteModalOpen, setAcompteModalOpen] = useState(false);
  const [acompteMode, setAcompteMode] = useState<"pourcentage" | "montant">(
    "pourcentage",
  );
  const [acompteValeur, setAcompteValeur] = useState("30");
  const [acompteError, setAcompteError] = useState("");
  const [confirmUnlockSignedOpen, setConfirmUnlockSignedOpen] = useState(false);
  const [confirmCreateChantierOpen, setConfirmCreateChantierOpen] = useState(false);
  const [confirmManualStatutOpen, setConfirmManualStatutOpen] = useState(false);
  const [pendingManualStatut, setPendingManualStatut] = useState<StatutDevis | null>(
    null,
  );
  const [chantierCreatedMessage, setChantierCreatedMessage] = useState("");
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [entrepriseGateOpen, setEntrepriseGateOpen] = useState(false);
  const [entrepriseGateMissing, setEntrepriseGateMissing] = useState<
    ReturnType<typeof getEntrepriseSendMissingFields>
  >([]);
  const [entrepriseGateFirstSend, setEntrepriseGateFirstSend] = useState(false);
  const [transformMessage, setTransformMessage] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showValidationToast, setShowValidationToast] = useState(false);
  const id = typeof params.id === "string" ? params.id : "";
  const { data, setData: setStoreData } = useStore();
  const { devis, clients, setDevis } = useDevisLocal();
  const lignesSeededRef = useRef<string | null>(null);
  const invalidClass = "border-red-500 focus:border-red-500 focus:ring-red-500/20";

  const devisItem = devis.find((d) => d.id === id);

  const MIN_LIGNES_SAISIE = 10;

  const devisActor = getDevisActorName(data.parametres.utilisateur);

  function applyDevisChange(updater: (devis: Devis) => Devis) {
    if (!devisItem) return;
    setDevis((prev) =>
      prev.map((d) =>
        d.id === devisItem.id
          ? syncDevisExpireStatut(updater(d), devisActor)
          : d,
      ),
    );
  }

  function updateDevis(patch: Partial<Devis>) {
    if (!devisItem || isDevisContentLocked(devisItem)) return;

    applyDevisChange((current) => {
      let next = { ...current, ...patch };
      if (patch.tauxTVA !== undefined) {
        next = propagateDevisTvaToLignes(next, patch.tauxTVA);
        Object.assign(
          next,
          syncDevisMontantsFromLignes(next, data.parametres.tva),
        );
      }
      if (current.statut !== "brouillon") {
        next = markDevisModifie(next, devisActor);
      }
      return next;
    });
  }

  function updateLignes(nextLignes: LigneDevis[]) {
    if (!devisItem || isDevisContentLocked(devisItem)) return;

    const montants = syncDevisMontantsFromLignes(
      { ...devisItem, lignes: nextLignes },
      data.parametres.tva,
    );

    applyDevisChange((current) => {
      let next = {
        ...current,
        lignes: nextLignes,
        ...montants,
      };
      if (current.statut !== "brouillon") {
        next = markDevisModifie(next, devisActor);
      }
      return next;
    });
  }

  function addLigne() {
    if (!devisItem) return;

    const defaultTva = resolveLigneDefaultTva(devisItem, data.parametres.tva);

    updateLignes([
      ...devisItem.lignes,
      {
        id: generateId(),
        description: "",
        designation: "",
        quantite: 1,
        unite: "u",
        prixUnitaire: 0,
        tauxTVA: defaultTva,
        typeLigne: "ligne",
      },
    ]);
  }

  function addSectionLigne() {
    if (!devisItem) return;

    updateLignes([...devisItem.lignes, createSectionLigne()]);
  }

  function updateLigne(idLigne: string, patch: Partial<LigneDevis>) {
    if (!devisItem) return;

    updateLignes(
      devisItem.lignes.map((ligne) =>
        ligne.id === idLigne ? patchLigneFields(ligne, patch) : ligne,
      ),
    );
  }

  function removeLigne(idLigne: string) {
    if (!devisItem) return;

    const removed = devisItem.lignes.find((ligne) => ligne.id === idLigne);
    let nextLignes = devisItem.lignes.filter((ligne) => ligne.id !== idLigne);

    if (removed && isSectionLigne(removed) && !hasSectionLigne(nextLignes)) {
      nextLignes = ensureLeadingSectionLigne(nextLignes);
    }

    updateLignes(nextLignes);
  }

  function reorderLignes(fromIndex: number, toIndex: number) {
    if (!devisItem) return;
    const next = [...devisItem.lignes];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    updateLignes(next);
  }

  useEffect(() => {
    if (!devisItem || devisItem.statut !== "brouillon") return;
    if (lignesSeededRef.current === devisItem.id) return;
    lignesSeededRef.current = devisItem.id;

    if (devisItem.lignes.length >= MIN_LIGNES_SAISIE) return;

    const defaultTva = resolveLigneDefaultTva(devisItem, data.parametres.tva);
    const extra = Array.from(
      { length: MIN_LIGNES_SAISIE - devisItem.lignes.length },
      () => ({
        ...createEmptyLigneDevis(defaultTva),
        id: generateId(),
      }),
    );

    const nextLignes = [...devisItem.lignes, ...extra];
    const montants = syncDevisMontantsFromLignes(
      { ...devisItem, lignes: nextLignes },
      data.parametres.tva,
    );

    setDevis((prev) =>
      prev.map((d) =>
        d.id === devisItem.id ? { ...d, lignes: nextLignes, ...montants } : d,
      ),
    );
  }, [devisItem, data.parametres.tva, setDevis]);

  useEffect(() => {
    if (!devisItem) return;
    const synced = syncDevisExpireStatut(devisItem, devisActor);
    if (synced.statut === devisItem.statut) return;
    setDevis((prev) =>
      prev.map((d) => (d.id === devisItem.id ? synced : d)),
    );
  }, [devisItem, setDevis, devisActor]);

  useEffect(() => {
    if (!devisItem) return;

    void fetch(`/api/devis/${devisItem.id}/signature-sync`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          body: {
            updated?: boolean;
            devis?: typeof devisItem;
            signatureUrl?: string;
          } | null,
        ) => {
          if (body?.signatureUrl) {
            setSignatureUrl(body.signatureUrl);
          }
          if (body?.updated && body.devis) {
            applyDevisChange(() => body.devis!);
          }
        },
      )
      .catch(() => undefined);
  }, [devisItem?.id]);

  function validateCurrentDevis() {
    if (!devisItem) return {};
    const client = clients.find((clientItem) => clientItem.id === devisItem.clientId);
    const nextErrors = validateDevis(devisItem, client);
    setErrors(nextErrors);
    setShowValidationToast(hasValidationErrors(nextErrors));
    return nextErrors;
  }

  if (!devisItem) {
    return (
      <>
        <Link
          href="/devis"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux devis
        </Link>
        <p className="text-muted-foreground">Devis introuvable.</p>
      </>
    );
  }

  const defaultTva = resolveLigneDefaultTva(devisItem, data.parametres.tva);
  const tvaRecap = computeDevisTvaRecap(
    devisItem,
    data.parametres.tva,
    isTvaClassique(data.parametres),
  );
  const total = tvaRecap.totalHT;
  const totalTTC = tvaRecap.totalTTC;
  const montantTVA = tvaRecap.tvaTotale;
  const client = clients.find((clientItem) => clientItem.id === devisItem.clientId);
  const isSigned = Boolean(devisItem.signature && devisItem.dateSignature);
  const displayStatut = getDevisDisplayStatut(devisItem);
  const canShowRelances = devisItem.statut !== "brouillon";
  const canTransformToFacture = canTransformDevisToFacture(devisItem);
  const factureFromDevis = findFactureByDevisId(data.factures, devisItem.id);
  const chantierLie =
    findChantierForDevisId(data.chantiers, devisItem.id) ??
    data.chantiers.find((chantier) => chantier.clientId === devisItem.clientId);
  const canCreateChantierFromDevis =
    devisItem.statut === "signe" && !findChantierForDevisId(data.chantiers, devisItem.id);
  const totalProjetTTC = resolveDevisTotalTTC(devisItem, data.parametres.tva);
  const billingCtx = buildProgressiveBillingContext(data.factures, {
    devisId: devisItem.id,
    chantierId: chantierLie?.id,
    totalProjetTTC,
  });
  const canCreateSolde = canTransformToFacture && billingCtx.resteAFacturer > 0;
  const commandeLie = findCommandeByDevisId(data.commandes ?? [], devisItem.id);
  const relancesDevis = data.relances
    .filter(
      (relance) =>
        relance.documentType === "devis" && relance.documentId === devisItem.id,
    )
    .sort((a, b) => b.dateRelance.localeCompare(a.dateRelance));
  const reminderEmail = buildDevisReminderEmail({
    devis: devisItem,
    client,
    parametres: data.parametres,
    signatureUrl,
  });

  function requestManualStatutChange(nextStatut: StatutDevis) {
    if (!devisItem || devisItem.statut === nextStatut) return;
    setPendingManualStatut(nextStatut);
    setConfirmManualStatutOpen(true);
  }

  function confirmManualStatutChange() {
    if (!devisItem || !pendingManualStatut) return;
    if (!canTransitionDevisStatut(devisItem.statut, pendingManualStatut)) {
      setPendingManualStatut(null);
      setConfirmManualStatutOpen(false);
      return;
    }
    applyDevisChange((current) =>
      applyManualDevisStatut(current, pendingManualStatut, devisActor),
    );
    setPendingManualStatut(null);
    setConfirmManualStatutOpen(false);
  }

  const clientHasEmail = Boolean(client?.email?.trim());
  const canSendDevisEmail =
    clientHasEmail && emailConnection.connected && !emailConnection.loading;
  const devisSendDisabledTitle = resolveEmailSendDisabledTitle({
    emailConnected: emailConnection.connected,
    clientHasEmail,
  });

  function ensureEntrepriseReadyForDevisSend(): boolean {
    const missing = getEntrepriseSendMissingFields(data.parametres);
    if (missing.length === 0) return true;
    setEntrepriseGateMissing(missing);
    setEntrepriseGateFirstSend(!hasDevisBeenSentToClient(data.devis));
    setEntrepriseGateOpen(true);
    return false;
  }

  function requestSendToClient() {
    if (!devisItem) return;
    if (hasValidationErrors(validateCurrentDevis())) return;
    if (!ensureEntrepriseReadyForDevisSend()) return;
    if (!clientHasEmail) {
      setSendClientMessage(
        "Ajoutez l'email du client pour envoyer le devis (champ conseillé dans la fiche client).",
      );
      return;
    }
    setConfirmSendToClientOpen(true);
  }

  async function handleSendToClient() {
    if (!devisItem) return;

    setSendingToClient(true);
    setSendClientMessage("");
    setSendSuccessFlash(false);
    setClientLinkCopied(false);

    const published = await publishDevisSignatureLink({
      devis: devisItem,
      client,
      parametres: data.parametres,
    });

    if (!published.signatureUrl) {
      setSendClientMessage(
        published.error ??
          "Impossible de générer le lien de signature public.",
      );
      setSendingToClient(false);
      return;
    }

    setSignatureUrl(published.signatureUrl);

    const result = await sendDevisToClient({
      devis: devisItem,
      client,
      parametres: data.parametres,
      signatureUrl: published.signatureUrl,
      totalHT: total,
    });

    if (result.success) {
      applyDevisChange((current) => markDevisEnvoye(current, devisActor));
      setSendSuccessFlash(true);
      setSendClientMessage("Devis envoyé à l'instant");
      setTimeout(() => setSendSuccessFlash(false), 5000);

      if (result.simulated) {
        await downloadDevisPdf({
          devis: devisItem,
          client,
          parametres: data.parametres,
          totalHT: total,
        });
        const email = buildDevisClientSendEmail({
          devis: devisItem,
          client,
          parametres: data.parametres,
          signatureUrl: published.signatureUrl,
        });
        await navigator.clipboard?.writeText(
          `À: ${email.destinataire}\nObjet: ${email.objet}\n\n${email.message}`,
        );
        setClientLinkCopied(true);
      }
    } else {
      setSendClientMessage(
        result.message ?? "Impossible d'envoyer le devis au client.",
      );
    }

    setSendingToClient(false);
  }

  async function handleCopyReminderEmail() {
    await navigator.clipboard?.writeText(
      `À: ${reminderEmail.destinataire}
Objet: ${reminderEmail.objet}

${reminderEmail.message}`,
    );
    setEmailCopied(true);
  }

  async function handleSendReminderEmail() {
    setReminderSending(true);
    setReminderSendMessage("");
    const result = await sendReminderEmail(reminderEmail);
    setReminderSendMessage(result.message ?? "Envoi réel non configuré");
    setReminderSending(false);
  }

  function handleTransformToFacture() {
    if (!devisItem) return;

    if (factureFromDevis) {
      setTransformMessage("Une facture existe déjà pour ce devis.");
      return;
    }

    if (hasValidationErrors(validateCurrentDevis())) {
      setTransformMessage(
        "Complétez le devis (lignes et montants) avant de le transformer en facture.",
      );
      return;
    }

    const created = createFactureFromDevis({
      devis: devisItem,
      client,
      factures: data.factures,
      chantiers: data.chantiers,
      defaultTva: data.parametres.tva,
      parametres: data.parametres,
    });

    if (!created.ok) {
      setTransformMessage(created.error);
      return;
    }

    setStoreData((previous) => {
      const slice = appendFactureWithHistorique(previous, created.facture);
      return { ...previous, ...slice };
    });
    setTransformMessage("");
    setConfirmTransformOpen(false);
    router.push("/factures");
  }

  function handleCreateProgressiveFacture(
    type: "acompte" | "solde",
    acompteMode?: "montant" | "pourcentage",
    acompteValeur?: number,
  ) {
    if (!devisItem) return;

    const created = createFactureProgressiveFromDevis({
      devis: devisItem,
      client,
      factures: data.factures,
      chantiers: data.chantiers,
      type,
      defaultTva: data.parametres.tva,
      parametres: data.parametres,
      acompteMode,
      acompteValeur,
    });

    if (!created.ok) {
      setTransformMessage(created.error);
      return;
    }

    setStoreData((previous) => {
      const slice = appendFactureWithHistorique(previous, created.facture);
      return { ...previous, ...slice };
    });
    setTransformMessage("");
    setAcompteModalOpen(false);
    setAcompteError("");
    router.push("/factures");
  }

  function handleCreateCommande() {
    if (!devisItem) return;
    if (hasValidationErrors(validateCurrentDevis())) return;

    const created = createCommandeFromDevis({
      devis: devisItem,
      chantiers: data.chantiers,
      commandes: data.commandes ?? [],
      defaultTva: data.parametres.tva,
      parametres: data.parametres,
    });

    if (!created) {
      setTransformMessage(
        "Impossible de créer la commande. Vérifiez le statut du devis et les montants.",
      );
      return;
    }

    setStoreData((previous) => {
      const slice = appendCommandeWithHistorique(previous, {
        devis: devisItem,
        commande: created,
      });
      return { ...previous, ...slice };
    });
    setTransformMessage("");
    router.push(`/commandes/${created.id}`);
  }

  function handleSubmitAcompte() {
    const valeur = Number(acompteValeur);
    if (!(valeur > 0)) {
      setAcompteError("Saisissez un montant ou un pourcentage valide.");
      return;
    }
    if (acompteMode === "pourcentage" && valeur > 100) {
      setAcompteError("Le pourcentage ne peut pas dépasser 100 %.");
      return;
    }
    if (
      acompteMode === "montant" &&
      valeur > billingCtx.resteAFacturer + 0.01
    ) {
      setAcompteError("Le montant dépasse le restant à facturer.");
      return;
    }
    if (acompteMode === "pourcentage") {
      const montantEstime =
        Math.round(totalProjetTTC * (valeur / 100) * 100) / 100;
      if (montantEstime > billingCtx.resteAFacturer + 0.01) {
        setAcompteError("Le montant dépasse le restant à facturer.");
        return;
      }
    }
    handleCreateProgressiveFacture("acompte", acompteMode, valeur);
  }

  async function handleRelanceClient() {
    if (!devisItem) return;

    await sendReminderEmail(reminderEmail);
    const { relance, notification } = createManualDevisRelance(devisItem);
    setStoreData((previous) => ({
      ...previous,
      devis: previous.devis.map((devis) =>
        devis.id === devisItem.id &&
        ["envoye", "accepte"].includes(devis.statut)
          ? { ...devis, statut: "en_attente" }
          : devis,
      ),
      relances: [...previous.relances, relance],
      notifications: [...previous.notifications, notification],
    }));
    setRelanceModalOpen(false);
    setEmailCopied(false);
  }

  async function handleDownloadPdf() {
    if (!devisItem) return;
    if (hasValidationErrors(validateCurrentDevis())) return;

    if (hasOfficialSignedDevisPdf(devisItem)) {
      await handleDownloadSignedPdf();
      return;
    }

    await downloadDevisPdf({
      devis: devisItem,
      client,
      parametres: data.parametres,
      totalHT: total,
    });
  }

  function handleOpenPreview() {
    if (!devisItem) return;
    if (hasValidationErrors(validateCurrentDevis())) return;
    setPreviewOpen(true);
  }

  async function handleDownloadSignedPdf() {
    if (!devisItem) return;

    await downloadSignedDevisPdf({
      devis: devisItem,
      client,
      parametres: data.parametres,
      totalHT: total,
    });
  }

  function pushDuplicatedDevis(copy: Devis) {
    setStoreData((previous) => ({
      ...previous,
      devis: [copy, ...previous.devis],
    }));
    router.push(`/devis/${copy.id}`);
  }

  function handleDuplicateDevis() {
    if (!devisItem) return;
    pushDuplicatedDevis(duplicateDevis(devisItem, data.devis, data.parametres));
  }

  function handleCreateNewVersion() {
    if (!devisItem) return;
    pushDuplicatedDevis(
      duplicateDevis(devisItem, data.devis, data.parametres, {
        titreSuffix: "(nouvelle version)",
      }),
    );
  }

  function handleUnlockSignedExceptionally() {
    if (!devisItem) return;
    applyDevisChange((current) =>
      unlockSignedDevisExceptionally(current, devisActor),
    );
    setConfirmUnlockSignedOpen(false);
  }

  function handleCreateChantierFromSignedDevis() {
    if (!devisItem) return;
    const chantier = createChantierFromSignedDevis(
      devisItem,
      client,
      data.chantiers,
    );
    if (!chantier) return;

    setStoreData((previous) => {
      const slice = appendChantierWithHistorique(previous, {
        chantier,
        devis: devisItem,
      });
      return { ...previous, ...slice };
    });
    setChantierCreatedMessage(`Chantier « ${chantier.nom} » créé.`);
    setConfirmCreateChantierOpen(false);
    router.push(`/chantiers/${chantier.id}`);
  }

  const isDraft = devisItem.statut === "brouillon";
  const isContentLocked = isDevisContentLocked(devisItem);
  const allowedManualStatuts = getAllowedManualStatuts(devisItem.statut);

  return (
    <>
      {isDraft ? (
        <>
          <EmailConnectionBanner
            className="mb-4"
            connected={emailConnection.connected}
            expired={emailConnection.expired}
            email={emailConnection.email}
            loading={emailConnection.loading}
          />
          <DevisEditorForm
          devis={devisItem}
          client={client}
          clients={clients}
          tvaRecap={tvaRecap}
          defaultTva={defaultTva}
          errors={errors}
          invalidClass={invalidClass}
          showValidationToast={showValidationToast}
          onUpdateDevis={updateDevis}
          onQuickClientOpen={() => setQuickClientOpen(true)}
          onAddLigne={addLigne}
          onAddSection={addSectionLigne}
          onUpdateLigne={updateLigne}
          onRemoveLigne={(id) => setLigneToDelete(id)}
          onReorderLignes={reorderLignes}
          onSaveDraft={() => undefined}
          onPreview={handleOpenPreview}
          onSendToClient={requestSendToClient}
          canSendToClient={canSendDevisEmail}
          sendToClientDisabledTitle={devisSendDisabledTitle}
          displayStatut={displayStatut}
          onRequestStatutChange={requestManualStatutChange}
          allowedManualStatuts={allowedManualStatuts}
          onValidate={() => {
            if (hasValidationErrors(validateCurrentDevis())) return;
            setShowValidationToast(false);
          }}
        />
        </>
      ) : (
        <>
          <Link
            href="/devis"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux devis
          </Link>

          <PageHeader
            title={devisItem.titre}
            description={`${devisItem.numero} · ${getClientDisplayName(client)}`}
            action={
              <Badge
                label={DEVIS_STATUT_LABELS[displayStatut]}
                status={displayStatut}
              />
            }
          />

          <EmailConnectionBanner
            className="mb-6"
            connected={emailConnection.connected}
            expired={emailConnection.expired}
            email={emailConnection.email}
            loading={emailConnection.loading}
          />

          <Card className="mb-6">
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Total HT
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {formatCurrency(total)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Total TTC
                </dt>
                <dd className="mt-1 font-semibold tabular-nums text-primary">
                  {formatCurrency(totalTTC)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Client
                </dt>
                <dd className="mt-1">
                  <ClientNameDisplay client={client} />
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Statut
                </dt>
                <dd className="mt-1">
                  <Select
                    value={devisItem.statut}
                    className="mt-1 max-w-xs"
                    disabled={devisItem.statut === "archive"}
                    onChange={(event) =>
                      requestManualStatutChange(event.target.value as StatutDevis)
                    }
                  >
                    {allowedManualStatuts.map((statut) => (
                      <option key={statut} value={statut}>
                        {DEVIS_STATUT_LABELS[statut]}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Auto / manuel
                  </p>
                  {displayStatut !== devisItem.statut && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Affiché : {DEVIS_STATUT_LABELS[displayStatut]}
                    </p>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Signature
                </dt>
                <dd className="mt-1 font-medium">
                  {isSigned ? "Signé" : "En attente"}
                </dd>
              </div>
            </dl>
          </Card>

          {isContentLocked && (
            <Card className="mb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {devisItem.statut === "signe"
                    ? "Ce devis est signé et verrouillé. Les lignes sont en lecture seule."
                    : "Ce devis est verrouillé. Les lignes sont en lecture seule."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCreateNewVersion}>
                    Créer une nouvelle version
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleDuplicateDevis}>
                    Dupliquer
                  </Button>
                  {devisItem.statut === "signe" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmUnlockSignedOpen(true)}
                    >
                      Déverrouiller exceptionnellement
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {isContentLocked && devisItem.lignes.length > 0 && (
            <Card className="mb-6">
              <h2 className="mb-4 text-base font-semibold tracking-tight">Lignes du devis</h2>
              <DevisLignesEditor
                lignes={devisItem.lignes}
                defaultTva={defaultTva}
                errors={{}}
                invalidClass=""
                readOnly
                onReorder={() => undefined}
                onUpdateLigne={() => undefined}
                onRemoveLigne={() => undefined}
              />
            </Card>
          )}
        </>
      )}

      {!isDraft && (
        <>
      <Card className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <section>
            <h2 className="text-base font-semibold tracking-tight">Facturation</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Créez une facture classique, un acompte (% ou montant fixe) ou une
              facture de solde depuis ce devis accepté/signé. Les déductions
              s&apos;affichent automatiquement sur le solde.
            </p>
          </section>
          <section className="flex shrink-0 flex-col gap-2 sm:items-end">
            {factureFromDevis ? (
              <>
                <p className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
                  Facture classique déjà créée — {factureFromDevis.numero}
                </p>
                <ButtonLink href="/factures" variant="secondary" size="sm">
                  <Receipt className="h-4 w-4" />
                  Voir les factures
                </ButtonLink>
              </>
            ) : canTransformToFacture ? (
              <Button onClick={() => setConfirmTransformOpen(true)}>
                <Receipt className="h-4 w-4" />
                Transformer en facture
              </Button>
            ) : (
              <p className="max-w-sm text-sm text-muted-foreground">
                Disponible lorsque le devis est au statut « Accepté » ou « Signé ».
              </p>
            )}
            {canTransformToFacture && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setAcompteMode("pourcentage");
                    setAcompteValeur("30");
                    setAcompteError("");
                    setAcompteModalOpen(true);
                  }}
                >
                  Facture d&apos;acompte
                </Button>
                {canCreateSolde && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCreateProgressiveFacture("solde")}
                  >
                    Facture de solde ({formatCurrency(billingCtx.resteAFacturer)})
                  </Button>
                )}
              </>
            )}
          </section>
        </div>
        {canTransformToFacture && totalProjetTTC > 0 && (
          <section className="mt-4 rounded-xl border border-border bg-card-elevated/50 p-4 text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total devis (TTC)</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(totalProjetTTC)}
              </span>
            </p>
            <p className="mt-2 flex justify-between gap-4">
              <span className="text-muted-foreground">Déjà facturé</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(billingCtx.montantDejaFacture)}
              </span>
            </p>
            {billingCtx.montantAcomptes > 0 && (
              <p className="mt-2 flex justify-between gap-4">
                <span className="text-muted-foreground">Dont acomptes</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(billingCtx.montantAcomptes)}
                </span>
              </p>
            )}
            <p className="mt-2 flex justify-between gap-4 border-t border-border pt-2">
              <span className="text-muted-foreground">Reste à facturer</span>
              <span className="font-semibold tabular-nums text-primary">
                {formatCurrency(billingCtx.resteAFacturer)}
              </span>
            </p>
          </section>
        )}
        {transformMessage && !factureFromDevis && (
          <p className="mt-4 btp-alert-warning px-4 py-3 text-sm">
            {transformMessage}
          </p>
        )}
      </Card>

      <Card className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <section>
            <h2 className="text-base font-semibold tracking-tight">Commande</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Passez ce devis accepté ou signé en commande pour suivre la
              facturation progressive (acompte, situation, solde).
            </p>
          </section>
          <section className="flex shrink-0 flex-col gap-2 sm:items-end">
            {commandeLie ? (
              <>
                <p className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
                  Commande {commandeLie.numero}
                </p>
                <ButtonLink href={`/commandes/${commandeLie.id}`} variant="secondary" size="sm">
                  <ClipboardList className="h-4 w-4" />
                  Voir la commande
                </ButtonLink>
              </>
            ) : canTransformToFacture ? (
              <Button onClick={handleCreateCommande}>
                <ClipboardList className="h-4 w-4" />
                Passer en commande
              </Button>
            ) : (
              <p className="max-w-sm text-sm text-muted-foreground">
                Disponible lorsque le devis est au statut « Accepté » ou « Signé ».
              </p>
            )}
          </section>
        </div>
      </Card>

      <Card className="mt-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <section>
            <h2 className="text-base font-semibold tracking-tight">
              Signature électronique
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Lien public à partager au client pour signer ce devis en ligne.
            </p>
          </section>
          <section className="flex flex-col gap-2 sm:flex-row">
            {!isSigned && (
              <>
                <Button
                  variant="secondary"
                  disabled={sendingToClient || !canSendDevisEmail}
                  title={devisSendDisabledTitle}
                  onClick={() => requestSendToClient()}
                >
                  <Send className="h-4 w-4" />
                  {sendingToClient ? "Envoi en cours…" : "Envoyer au client"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (hasValidationErrors(validateCurrentDevis())) return;
                    const url = signatureUrl;
                    if (url) {
                      window.open(url, "_blank", "noopener,noreferrer");
                      return;
                    }
                    void publishDevisSignatureLink({
                      devis: devisItem,
                      client,
                      parametres: data.parametres,
                    }).then((published) => {
                      if (published.signatureUrl) {
                        setSignatureUrl(published.signatureUrl);
                        window.open(published.signatureUrl, "_blank", "noopener,noreferrer");
                      }
                    });
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Voir lien client
                </Button>
              </>
            )}
            {isSigned ? (
              <Button variant="secondary" onClick={() => void handleDownloadSignedPdf()}>
                <Download className="h-4 w-4" />
                Télécharger PDF signé
              </Button>
            ) : (
              <Button variant="secondary" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4" />
                Télécharger PDF
              </Button>
            )}
            {canCreateChantierFromDevis && (
              <Button
                variant="secondary"
                onClick={() => setConfirmCreateChantierOpen(true)}
              >
                Créer un chantier
              </Button>
            )}
            {canShowRelances && !isSigned && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEmailCopied(false);
                  setReminderSendMessage("");
                  setRelanceModalOpen(true);
                }}
              >
                Relancer le client
              </Button>
            )}
          </section>
        </div>

        <section className="mt-5 grid gap-4 rounded-2xl border border-border bg-card-elevated/60 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              État signature
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {isSigned ? "Signé" : "Non signé"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Signataire
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {devisItem.signedBy ?? devisItem.nomSignataire ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Date envoi
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {devisItem.sentAt ? formatDateTimeFR(devisItem.sentAt) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Date signature
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {devisItem.signedAt || devisItem.dateSignature
                ? formatDateTimeFR(devisItem.signedAt ?? devisItem.dateSignature!)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Client
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {getClientDisplayName(client)}
            </p>
          </div>
        </section>

        {chantierCreatedMessage && (
          <p className="mt-4 text-sm text-primary">{chantierCreatedMessage}</p>
        )}

        {isSigned && (devisItem.signedPdfBase64 || loadSignedDevisPdf(devisItem.id)) && (
          <p className="mt-4 text-sm text-muted-foreground">
            Le PDF signé est enregistré dans Batimum. L&apos;entreprise et le
            client ont reçu une copie par email lors de la signature.
          </p>
        )}

        {sendClientMessage && !isSigned && (
          <p className="mt-4 text-sm text-muted-foreground">{sendClientMessage}</p>
        )}

        {clientLinkCopied && (
          <p className="mt-4 text-sm text-primary">
            Email copié dans le presse-papier et PDF téléchargé. Statut du devis : Envoyé.
          </p>
        )}

        <EntityHistoriqueSection
          title="Historique du devis"
          historique={devisItem.historique ?? []}
          emptyLabel="Aucun événement enregistré pour ce devis."
        />

        {canShowRelances && !isSigned && (
          <section className="mt-6">
            <h3 className="mb-3 text-sm font-semibold tracking-tight">
              Historique des relances
            </h3>
            {relancesDevis.length === 0 ? (
              <p className="rounded-xl border border-border bg-card-elevated/60 px-4 py-3 text-sm text-muted-foreground">
                Aucune relance envoyée pour ce devis.
              </p>
            ) : (
              <ul className="space-y-2">
                {relancesDevis.map((relance) => (
                  <li
                    key={relance.id}
                    className="rounded-xl border border-border bg-card-elevated/60 px-4 py-3 text-sm"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-medium text-foreground">
                        {relance.typeRelance === "automatique"
                          ? "Relance automatique"
                          : "Relance manuelle"}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDateTimeFR(relance.dateRelance)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{relance.message}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-primary">
                      {relance.statut === "envoyee_simulee"
                        ? "Envoyée simulée"
                        : "Préparée"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </Card>

      <footer className="mt-6">
        <Button variant="secondary" onClick={() => router.push("/devis")}>
          Retour à la liste
        </Button>
      </footer>
        </>
      )}

      <Modal
        open={canShowRelances && relanceModalOpen}
        onClose={() => {
          setRelanceModalOpen(false);
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
            <p className="btp-alert-warning px-4 py-3 text-sm">
              {reminderSendMessage}
            </p>
          )}

          <section className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={handleCopyReminderEmail}>
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
                  : devisSendDisabledTitle
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
              onClick={() => setRelanceModalOpen(false)}
            >
              Fermer
            </Button>
          </section>
        </section>
      </Modal>

      <ConfirmDialog
        open={Boolean(ligneToDelete)}
        title="Confirmer la suppression"
        message="Cette action est définitive. Voulez-vous continuer ?"
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setLigneToDelete(null)}
        onConfirm={() => {
          if (ligneToDelete) removeLigne(ligneToDelete);
          setLigneToDelete(null);
        }}
      />

      <ConfirmDialog
        open={confirmSendToClientOpen}
        title="Envoyer le devis au client"
        message={
          client?.email
            ? `Voulez-vous envoyer ce devis à ${client.email} ?`
            : "Voulez-vous envoyer ce devis au client ?"
        }
        confirmLabel="Confirmer l'envoi"
        onCancel={() => setConfirmSendToClientOpen(false)}
        onConfirm={() => {
          setConfirmSendToClientOpen(false);
          void handleSendToClient();
        }}
      />

      <ConfirmDialog
        open={confirmRealEmailOpen}
        message="Confirmer l’envoi de l’email de relance ?"
        confirmLabel="Confirmer"
        onCancel={() => setConfirmRealEmailOpen(false)}
        onConfirm={() => {
          setConfirmRealEmailOpen(false);
          void handleSendReminderEmail();
        }}
      />

      <ConfirmDialog
        open={confirmRelanceOpen}
        message="Confirmer la relance simulée et l’ajout à l’historique ?"
        confirmLabel="Confirmer"
        onCancel={() => setConfirmRelanceOpen(false)}
        onConfirm={() => {
          setConfirmRelanceOpen(false);
          void handleRelanceClient();
        }}
      />

      <ConfirmDialog
        open={confirmCreateChantierOpen}
        title="Créer un chantier depuis ce devis"
        message="Un chantier « À planifier » sera créé avec le client, l'adresse, le budget et les lignes principales du devis signé."
        confirmLabel="Créer le chantier"
        onCancel={() => setConfirmCreateChantierOpen(false)}
        onConfirm={handleCreateChantierFromSignedDevis}
      />

      <ConfirmDialog
        open={confirmUnlockSignedOpen}
        title="Déverrouiller exceptionnellement"
        message="Le déverrouillage annulera la signature et repassera le devis en brouillon. Continuer ?"
        confirmLabel="Déverrouiller"
        variant="danger"
        onCancel={() => setConfirmUnlockSignedOpen(false)}
        onConfirm={handleUnlockSignedExceptionally}
      />

      <ConfirmDialog
        open={confirmManualStatutOpen}
        title="Modifier le statut du devis"
        message="Vous êtes sur le point de modifier le statut d'un devis. Continuer ?"
        confirmLabel="Continuer"
        onCancel={() => {
          setConfirmManualStatutOpen(false);
          setPendingManualStatut(null);
        }}
        onConfirm={confirmManualStatutChange}
      />

      <ConfirmDialog
        open={confirmTransformOpen}
        title="Transformer en facture"
        message="Créer une facture à partir de ce devis ? Client, lignes, montants HT/TVA/TTC, adresse et description chantier seront repris. Statut initial : En attente."
        confirmLabel="Créer la facture"
        onCancel={() => setConfirmTransformOpen(false)}
        onConfirm={handleTransformToFacture}
      />

      <Modal
        open={acompteModalOpen}
        onClose={() => setAcompteModalOpen(false)}
        title="Facture d'acompte"
      >
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Reste à facturer : {formatCurrency(billingCtx.resteAFacturer)}
          </p>
          <section>
            <Label>Mode</Label>
            <Select
              value={acompteMode}
              onChange={(event) =>
                setAcompteMode(event.target.value as "pourcentage" | "montant")
              }
            >
              <option value="pourcentage">Pourcentage du devis</option>
              <option value="montant">Montant TTC libre</option>
            </Select>
          </section>
          <section>
            <Label>
              {acompteMode === "pourcentage" ? "Pourcentage (%)" : "Montant TTC (€)"}
            </Label>
            <Input
              type="number"
              min="0"
              step={acompteMode === "pourcentage" ? "1" : "0.01"}
              value={acompteValeur}
              onChange={(event) => setAcompteValeur(event.target.value)}
            />
          </section>
          {acompteError && (
            <p className="text-sm text-red-400">{acompteError}</p>
          )}
          <section className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAcompteModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="button" onClick={handleSubmitAcompte}>
              Créer la facture d&apos;acompte
            </Button>
          </section>
        </section>
      </Modal>

      <DevisPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        pdfOptions={
          devisItem
            ? {
                devis: devisItem,
                client,
                parametres: data.parametres,
                totalHT: total,
              }
            : null
        }
        onDownload={handleDownloadPdf}
        onSendToClient={requestSendToClient}
        canSendToClient={canSendDevisEmail}
        sendToClientDisabledTitle={devisSendDisabledTitle}
      />

      <DevisQuickClientModal
        open={quickClientOpen}
        onClose={() => setQuickClientOpen(false)}
        onCreated={(newClientId) => updateDevis({ clientId: newClientId })}
      />

      <EntrepriseSendGateModal
        open={entrepriseGateOpen}
        onClose={() => setEntrepriseGateOpen(false)}
        missing={entrepriseGateMissing}
        context="devis"
        isFirstSend={entrepriseGateFirstSend}
      />
    </>
  );
}
