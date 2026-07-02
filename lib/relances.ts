import type {
  AppData,
  Client,
  Devis,
  DevisRelanceNiveau,
  Facture,
  FactureRelanceNiveau,
  NotificationApp,
  Parametres,
  RelanceClient,
} from "@/lib/types";
import { getClientDisplayName } from "@/lib/clients";
import { computeDevisTvaRecap } from "@/lib/devis-tva";
import { isTvaClassique } from "@/lib/parametres";
import {
  applyDevisRelanceTemplate,
  buildDevisRelanceVariables,
  DEVIS_RELANCE_NIVEAU_LABELS,
  findDevisRelanceRegle,
  isDevisEligibleForRelances,
} from "@/lib/devis-relance-config";
import {
  appendDevisRelanceEntry,
  buildPendingDevisRelanceRecord,
} from "@/lib/devis-relances-auto";
import { appendCoordonneesBancairesToText } from "@/lib/coordonnees-bancaires";
import { getDevisPdfBase64 } from "@/lib/devis-pdf";
import {
  canSendClientDocument,
  formatEntrepriseSendGateMessage,
  getEntrepriseSendMissingFields,
} from "@/lib/entreprise-send-gate";
import { getFacturePdfBase64 } from "@/lib/facture-pdf";
import {
  EMAIL_EXPIRED_MESSAGE,
  EMAIL_NOT_CONNECTED_MESSAGE,
  fetchEmailConnectionStatus,
} from "@/lib/email-provider";
import { RELANCE_NIVEAU_LABELS } from "@/lib/facture-relances-auto";
import { markFactureEnvoyee, markFactureRelancee } from "@/lib/facture-statut";
import { formatCurrency, generateId } from "@/lib/utils";
import {
  buildDevisSignatureHtmlBlock,
  buildDevisSignaturePlainTextBlock,
} from "@/lib/devis-signature-url";

type RelanceTarget =
  | { documentType: "devis"; document: Devis }
  | { documentType: "facture"; document: Facture };

export type ReminderEmailPreview = {
  destinataire: string;
  objet: string;
  message: string;
  html?: string;
};

export type DevisEmailPayload = ReminderEmailPreview & {
  pdfBase64?: string;
  pdfFilename?: string;
  html?: string;
  replyToEmail?: string;
  allowFallback?: boolean;
};

async function ensureEmailConnectionReady(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const status = await fetchEmailConnectionStatus();
  if (status.connected) return { ok: true };
  return {
    ok: false,
    message: status.expired
      ? EMAIL_EXPIRED_MESSAGE
      : EMAIL_NOT_CONNECTED_MESSAGE,
  };
}

function resolveReplyToEmail(parametres: Parametres): string | undefined {
  return (
    parametres.email?.trim() ||
    parametres.emailFacturation?.trim() ||
    undefined
  );
}

function relanceMessage(target: RelanceTarget) {
  if (target.documentType === "devis") {
    return `Le devis ${target.document.numero} n'a toujours pas été signé.`;
  }

  return `Facture ${target.document.numero} en attente de paiement.`;
}

function shouldRelanceDevis(devis: Devis, factures: Facture[] = []) {
  return isDevisEligibleForRelances(devis, factures);
}

function getDevisReminderTotalTTC(devis: Devis, parametresTva = 20, tvaClassique = true) {
  if (typeof devis.montantTTC === "number" && devis.montantTTC > 0) {
    return devis.montantTTC;
  }

  const recap = computeDevisTvaRecap(devis, parametresTva, tvaClassique);
  return recap.totalTTC;
}

export function createRelanceClient(
  target: RelanceTarget,
  typeRelance: RelanceClient["typeRelance"],
) {
  const now = new Date().toISOString();
  const message = relanceMessage(target);
  const relance: RelanceClient = {
    id: generateId(),
    documentType: target.documentType,
    documentId: target.document.id,
    numero: target.document.numero,
    dateRelance: now,
    typeRelance,
    statut: typeRelance === "automatique" ? "preparee" : "envoyee_simulee",
    message,
    niveauRelance:
      target.documentType === "facture" && typeRelance === "manuelle"
        ? "manuelle"
        : undefined,
  };

  const notification: NotificationApp = {
    id: generateId(),
    relanceId: relance.id,
    titre: "Relance client",
    message,
    dateCreation: now,
    lue: false,
    type: "relance",
  };

  return { relance, notification };
}

export function createManualDevisRelance(devis: Devis) {
  const relance = createRelanceClient({ documentType: "devis", document: devis }, "manuelle");
  return {
    ...relance,
    relance: {
      ...relance.relance,
      niveauRelanceDevis: "manuelle" as DevisRelanceNiveau,
      regleRelanceId: "manuelle",
    },
  };
}

export function createManualFactureRelance(facture: Facture) {
  return createRelanceClient(
    { documentType: "facture", document: facture },
    "manuelle",
  );
}

export function createDevisRefusalNotification({
  devis,
  clientName,
  refusalReason,
}: {
  devis: Devis;
  clientName: string;
  refusalReason?: string;
}): NotificationApp {
  const motif = refusalReason?.trim();
  return {
    id: generateId(),
    titre: "Devis refusé par le client",
    message: motif
      ? `${clientName} a refusé le devis ${devis.numero}. Motif : ${motif}.`
      : `${clientName} a refusé le devis ${devis.numero}.`,
    dateCreation: new Date().toISOString(),
    lue: false,
    type: "relance",
  };
}

export function buildDevisRefusalCompanyEmail({
  devis,
  client,
  parametres,
  refusalReason,
}: {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  refusalReason?: string;
}): ReminderEmailPreview {
  const clientName = getClientDisplayName(client);
  const motif = refusalReason?.trim();

  return {
    destinataire: parametres.email ?? "",
    objet: `Devis ${devis.numero} refusé par le client`,
    message: `Bonjour,

Le client ${clientName} a refusé le devis ${devis.numero} (${devis.titre}).${
      motif ? `\n\nMotif indiqué : ${motif}` : ""
    }

Consultez le devis dans Batimum pour le suivi commercial.

Cordialement,
Batimum`,
  };
}

export function createDevisSignedNotification({
  devis,
  clientName,
}: {
  devis: Devis;
  clientName: string;
}): NotificationApp {
  return {
    id: generateId(),
    titre: "Devis signé par le client",
    message: `${clientName} a signé électroniquement le devis ${devis.numero}. Le PDF signé a été envoyé par email.`,
    dateCreation: new Date().toISOString(),
    lue: false,
    type: "relance",
  };
}

export function buildDevisSignedCompanyEmail({
  devis,
  client,
  parametres,
  signedBy,
}: {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  signedBy: string;
}): ReminderEmailPreview {
  const clientName = getClientDisplayName(client);

  return {
    destinataire: parametres.email ?? "",
    objet: `Devis ${devis.numero} signé par ${signedBy}`,
    message: `Bonjour,

Le client ${clientName} a signé électroniquement le devis ${devis.numero} (${devis.titre}).

Signataire : ${signedBy}
Date : ${devis.signedAt ? new Date(devis.signedAt).toLocaleString("fr-FR") : "—"}

Veuillez trouver le devis signé en pièce jointe.

Consultez le devis dans Batimum pour le suivi commercial.

Cordialement,
Batimum`,
  };
}

export function buildDevisSignedClientEmail({
  devis,
  client,
  parametres,
  signedBy,
}: {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  signedBy: string;
}): ReminderEmailPreview {
  const clientName = getClientDisplayName(client);
  const entreprise = parametres.entreprise;

  return {
    destinataire: client?.email ?? "",
    objet: `Copie de votre devis signé ${devis.numero} — ${entreprise}`,
    message: `Bonjour ${clientName},

Merci d'avoir signé électroniquement le devis ${devis.numero} pour ${devis.titre}.

Signataire : ${signedBy}

Veuillez trouver en pièce jointe la copie du devis signé.

Cordialement,
${appendSignatureEmail(parametres)}`,
  };
}

export async function sendDevisSignedNotifications({
  devis,
  client,
  parametres,
  totalHT,
  pdfBase64: providedPdfBase64,
}: {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  totalHT?: number;
  pdfBase64?: string;
}) {
  const signedBy = devis.signedBy ?? devis.nomSignataire ?? getClientDisplayName(client);
  const pdfBase64 =
    providedPdfBase64 ??
    (await getDevisPdfBase64({ devis, client, parametres, totalHT }));
  const pdfFilename = `${devis.numero}-devis-signe.pdf`;

  const companyEmail = buildDevisSignedCompanyEmail({
    devis,
    client,
    parametres,
    signedBy,
  });
  const clientEmail = buildDevisSignedClientEmail({
    devis,
    client,
    parametres,
    signedBy,
  });

  const companyDest = parametres.email?.trim();
  const clientDest = client?.email?.trim();

  const [company, clientResult] = await Promise.all([
    companyDest
      ? sendReminderEmail({
          ...companyEmail,
          destinataire: companyDest,
          pdfBase64,
          pdfFilename,
        })
      : Promise.resolve({
          success: false,
          simulated: false,
          message: "Email entreprise non configuré dans les paramètres.",
        }),
    clientDest
      ? sendReminderEmail({
          ...clientEmail,
          destinataire: clientDest,
          pdfBase64,
          pdfFilename,
        })
      : Promise.resolve({
          success: false,
          simulated: false,
          message: "Email client manquant.",
        }),
  ]);

  return { company, client: clientResult, pdfBase64 };
}

export function buildDevisClientSendEmail({
  devis,
  client,
  parametres,
  signatureUrl,
}: {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  signatureUrl: string;
}): DevisEmailPayload {
  const clientName = getClientDisplayName(client);
  const entreprise = parametres.entreprise;

  const message = appendCoordonneesBancairesToText(
    `Bonjour ${clientName},

Veuillez trouver ci-joint le devis ${devis.numero} pour ${devis.titre}.

${buildDevisSignaturePlainTextBlock(signatureUrl)}

Le devis est également joint à cet email au format PDF.

Nous restons à votre disposition pour toute question.

Cordialement,
${appendSignatureEmail(parametres)}`,
    parametres,
  );

  const signatureBlock = buildDevisSignatureHtmlBlock(signatureUrl);

  const html = `<!DOCTYPE html>
<html lang="fr">
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
  <p>Bonjour ${clientName},</p>
  <p>Veuillez trouver ci-joint le devis <strong>${devis.numero}</strong> pour ${devis.titre}.</p>
  <p>Le devis est joint à cet email au format PDF.</p>
  ${signatureBlock}
  <p>Nous restons à votre disposition pour toute question.</p>
  <p>Cordialement,<br>${appendSignatureEmail(parametres).replace(/\n/g, "<br>")}</p>
</body>
</html>`;

  return {
    destinataire: client?.email ?? "",
    objet: `Votre devis - ${entreprise}`,
    message,
    html,
  };
}

export async function sendDevisToClient({
  devis,
  client,
  parametres,
  signatureUrl,
  totalHT,
}: {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  signatureUrl: string;
  totalHT?: number;
}) {
  if (!canSendClientDocument(parametres)) {
    return {
      success: false,
      simulated: false,
      message: formatEntrepriseSendGateMessage(
        getEntrepriseSendMissingFields(parametres),
      ),
    };
  }

  const emailReady = await ensureEmailConnectionReady();
  if (!emailReady.ok) {
    return {
      success: false,
      simulated: false,
      message: emailReady.message,
    };
  }

  const email = buildDevisClientSendEmail({ devis, client, parametres, signatureUrl });
  const pdfBase64 = await getDevisPdfBase64({ devis, client, parametres, totalHT });
  const pdfFilename = `${devis.numero}-devis.pdf`;

  return sendReminderEmail({
    ...email,
    pdfBase64,
    pdfFilename,
    replyToEmail: resolveReplyToEmail(parametres),
  });
}

export function buildDevisReminderEmail({
  devis,
  client,
  parametres,
  signatureUrl,
  regleId,
  niveauRelance = "manuelle",
}: {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  signatureUrl: string;
  regleId?: string;
  niveauRelance?: DevisRelanceNiveau;
}): ReminderEmailPreview {
  const variables = buildDevisRelanceVariables({
    devis,
    client,
    parametres,
    signatureUrl,
  });

  const regle =
    (regleId ? findDevisRelanceRegle(parametres, regleId) : undefined) ??
    (niveauRelance === "j7" || niveauRelance === "j14" || niveauRelance === "j21"
      ? findDevisRelanceRegle(parametres, niveauRelance)
      : undefined);

  const sujet = regle
    ? applyDevisRelanceTemplate(regle.sujet, variables)
    : `Relance concernant votre devis ${devis.numero}`;

  const messageBody = regle
    ? applyDevisRelanceTemplate(regle.message, variables)
    : `Bonjour ${variables.nom_client},

Nous nous permettons de revenir vers vous concernant le devis ${devis.numero} (${variables.montant_devis} TTC).

${buildDevisSignaturePlainTextBlock(signatureUrl)}

Nous restons à votre disposition pour toute question ou précision.

Cordialement,
${appendSignatureEmail(parametres)}`;

  const signatureBlock = buildDevisSignatureHtmlBlock(signatureUrl);

  return {
    destinataire: client?.email ?? "",
    objet: sujet,
    message: messageBody,
    html: `<!DOCTYPE html>
<html lang="fr">
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
  <p>${messageBody.replace(/\n/g, "<br>")}</p>
  ${signatureUrl ? signatureBlock : ""}
</body>
</html>`,
  };
}

function appendSignatureEmail(parametres: Parametres): string {
  const lines = [
    parametres.entreprise,
    parametres.telephone,
    parametres.email,
  ].filter(Boolean);
  const signature = parametres.signatureEmail?.trim();
  if (signature) {
    lines.push("", signature);
  }
  return lines.join("\n");
}

export function buildFactureReminderEmail({
  facture,
  client,
  parametres,
  niveauRelance = "manuelle",
}: {
  facture: Facture;
  client?: Client;
  parametres: Parametres;
  niveauRelance?: FactureRelanceNiveau;
}): ReminderEmailPreview {
  const clientName = getClientDisplayName(client);
  const montant = formatCurrency(facture.montant);
  const echeance = facture.dateEcheance
    ? new Date(`${facture.dateEcheance}T12:00:00`).toLocaleDateString("fr-FR")
    : "—";

  const introByNiveau: Record<FactureRelanceNiveau, string> = {
    avant_echeance_3j: `Nous vous rappelons que la facture ${facture.numero} d'un montant de ${montant} TTC arrive à échéance le ${echeance}.`,
    jour_echeance: `La facture ${facture.numero} d'un montant de ${montant} TTC arrive à échéance aujourd'hui (${echeance}).`,
    apres_echeance_7j: `Sauf erreur de notre part, la facture ${facture.numero} d'un montant de ${montant} TTC, échue le ${echeance}, reste impayée.`,
    apres_echeance_15j: `Malgré notre précédent rappel, la facture ${facture.numero} (${montant} TTC, échéance ${echeance}) demeure en attente de règlement.`,
    apres_echeance_30j: `Dernier rappel avant action contentieuse : la facture ${facture.numero} (${montant} TTC, échéance ${echeance}) n'a toujours pas été réglée.`,
    manuelle: `Sauf erreur de notre part, la facture ${facture.numero} d'un montant de ${montant} TTC reste en attente de règlement.`,
  };

  const objetByNiveau: Record<FactureRelanceNiveau, string> = {
    avant_echeance_3j: `Rappel — facture ${facture.numero} à échéance prochaine`,
    jour_echeance: `Échéance aujourd'hui — facture ${facture.numero}`,
    apres_echeance_7j: `Relance — facture ${facture.numero} impayée`,
    apres_echeance_15j: `Seconde relance — facture ${facture.numero}`,
    apres_echeance_30j: `Dernier rappel — facture ${facture.numero}`,
    manuelle: `Relance facture ${facture.numero} en attente de règlement`,
  };

  return {
    destinataire: client?.email ?? "",
    objet: objetByNiveau[niveauRelance],
    message: appendCoordonneesBancairesToText(
      `Bonjour ${clientName},

${introByNiveau[niveauRelance]}

Nous vous remercions de bien vouloir procéder au paiement dans les meilleurs délais.

Cordialement,
${appendSignatureEmail(parametres)}`,
      parametres,
    ),
  };
}

export async function sendFactureReminderEmail({
  facture,
  client,
  parametres,
  niveauRelance = "manuelle",
}: {
  facture: Facture;
  client?: Client;
  parametres: Parametres;
  niveauRelance?: FactureRelanceNiveau;
}) {
  if (!canSendClientDocument(parametres)) {
    return {
      success: false,
      simulated: false,
      message: formatEntrepriseSendGateMessage(
        getEntrepriseSendMissingFields(parametres),
      ),
    };
  }

  const emailReady = await ensureEmailConnectionReady();
  if (!emailReady.ok) {
    return {
      success: false,
      simulated: false,
      message: emailReady.message,
    };
  }

  const email = buildFactureReminderEmail({
    facture,
    client,
    parametres,
    niveauRelance,
  });
  const pdfBase64 = await getFacturePdfBase64({ facture, client, parametres });
  return sendReminderEmail({
    ...email,
    pdfBase64,
    pdfFilename: `${facture.numero}-facture.pdf`,
    replyToEmail: resolveReplyToEmail(parametres),
  });
}

export async function processPendingFactureRelanceEmails(data: AppData) {
  const pending = data.relances.filter(
    (relance) =>
      relance.documentType === "facture" &&
      relance.statut === "preparee" &&
      relance.typeRelance === "automatique",
  );
  if (pending.length === 0) {
    return { data, sentCount: 0 };
  }

  if (!canSendClientDocument(data.parametres)) {
    return { data, sentCount: 0 };
  }

  let nextData = data;
  let sentCount = 0;

  for (const relance of pending) {
    const facture = nextData.factures.find((item) => item.id === relance.documentId);
    if (!facture || facture.relancesDesactivees) continue;
    if (["payee", "avoir_total", "avoir_partiel"].includes(facture.statut)) continue;

    const client = nextData.clients.find((item) => item.id === facture.clientId);
    const niveau = relance.niveauRelance ?? "manuelle";
    const result = await sendFactureReminderEmail({
      facture,
      client,
      parametres: nextData.parametres,
      niveauRelance: niveau,
    });

    const statut: RelanceClient["statut"] = result.success
      ? result.simulated
        ? "envoyee_simulee"
        : "envoyee"
      : "envoyee_simulee";

    nextData = {
      ...nextData,
      factures: nextData.factures.map((item) =>
        item.id === facture.id
          ? markFactureRelancee(markFactureEnvoyee(item), {
              label: RELANCE_NIVEAU_LABELS[niveau],
              meta: { niveauRelance: niveau },
            })
          : item,
      ),
      relances: nextData.relances.map((item) =>
        item.id === relance.id ? { ...item, statut } : item,
      ),
      notifications: [
        ...nextData.notifications,
        {
          id: generateId(),
          relanceId: relance.id,
          titre: "Relance facture envoyée",
          message: `${RELANCE_NIVEAU_LABELS[niveau]} — ${facture.numero}`,
          dateCreation: new Date().toISOString(),
          lue: false,
          type: "relance" as const,
        },
      ],
    };
    sentCount += 1;
  }

  return { data: nextData, sentCount };
}

export async function sendReminderEmail(email: DevisEmailPayload) {
  try {
    const response = await fetch("/api/send-reminder-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinataire: email.destinataire,
        objet: email.objet,
        message: email.message,
        html: email.html,
        pdfBase64: email.pdfBase64,
        pdfFilename: email.pdfFilename,
        replyToEmail: email.replyToEmail,
        allowFallback: email.allowFallback ?? false,
      }),
    });
    const result = (await response.json()) as {
      success: boolean;
      simulated?: boolean;
      message?: string;
      expired?: boolean;
    };

    return {
      success: result.success,
      simulated: result.simulated ?? false,
      message: result.message ?? "Envoi email indisponible.",
      expired: result.expired ?? false,
    };
  } catch {
    return {
      success: false,
      simulated: false,
      message: "Envoi email indisponible.",
      expired: false,
    };
  }
}

export async function sendDevisReminderEmail({
  devis,
  client,
  parametres,
  signatureUrl,
  regleId,
  niveauRelance = "manuelle",
}: {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  signatureUrl: string;
  regleId?: string;
  niveauRelance?: DevisRelanceNiveau;
}) {
  if (!canSendClientDocument(parametres)) {
    return {
      success: false,
      simulated: false,
      message: formatEntrepriseSendGateMessage(
        getEntrepriseSendMissingFields(parametres),
      ),
    };
  }

  const emailReady = await ensureEmailConnectionReady();
  if (!emailReady.ok) {
    return {
      success: false,
      simulated: false,
      message: emailReady.message,
    };
  }

  const email = buildDevisReminderEmail({
    devis,
    client,
    parametres,
    signatureUrl,
    regleId,
    niveauRelance,
  });

  return sendReminderEmail({
    ...email,
    replyToEmail: resolveReplyToEmail(parametres),
  });
}

export async function processPendingDevisRelanceEmails(data: AppData) {
  const pending = data.relances.filter(
    (relance) =>
      relance.documentType === "devis" &&
      relance.statut === "preparee" &&
      relance.typeRelance === "automatique",
  );
  if (pending.length === 0) {
    return { data, sentCount: 0 };
  }

  if (!canSendClientDocument(data.parametres)) {
    return { data, sentCount: 0 };
  }

  let nextData = data;
  let sentCount = 0;

  for (const relance of pending) {
    const devis = nextData.devis.find((item) => item.id === relance.documentId);
    if (!devis || devis.relancesDesactivees) continue;
    if (!isDevisEligibleForRelances(devis, nextData.factures)) continue;

    const client = nextData.clients.find((item) => item.id === devis.clientId);
    const published = await publishDevisSignatureLinkForRelance({
      devis,
      client,
      parametres: nextData.parametres,
    });

    const niveau = relance.niveauRelanceDevis ?? "personnalise";
    const result = await sendDevisReminderEmail({
      devis,
      client,
      parametres: nextData.parametres,
      signatureUrl: published.signatureUrl,
      regleId: relance.regleRelanceId,
      niveauRelance: niveau,
    });

    const statut: RelanceClient["statut"] = result.success
      ? result.simulated
        ? "envoyee_simulee"
        : "envoyee"
      : "envoyee_simulee";

    const label =
      DEVIS_RELANCE_NIVEAU_LABELS[niveau] ?? "Relance automatique devis";

    nextData = {
      ...nextData,
      devis: nextData.devis.map((item) =>
        item.id === devis.id
          ? appendDevisRelanceEntry(
              item,
              relance.regleRelanceId ?? niveau,
              niveau,
            )
          : item,
      ),
      relances: nextData.relances.map((item) =>
        item.id === relance.id ? { ...item, statut, message: label } : item,
      ),
      notifications: [
        ...nextData.notifications,
        {
          id: generateId(),
          relanceId: relance.id,
          titre: "Relance devis envoyée",
          message: `${label} — ${devis.numero}`,
          dateCreation: new Date().toISOString(),
          lue: false,
          type: "relance" as const,
        },
      ],
    };
    sentCount += 1;
  }

  return { data: nextData, sentCount };
}

async function publishDevisSignatureLinkForRelance({
  devis,
  client,
  parametres,
}: {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
}) {
  const { publishDevisSignatureLink } = await import(
    "@/lib/devis-public-signature-client"
  );
  const published = await publishDevisSignatureLink({ devis, client, parametres });
  return { signatureUrl: published.signatureUrl ?? "" };
}

export function buildAutomaticDevisRelances(data: AppData) {
  return { relances: [] as RelanceClient[], notifications: [] as NotificationApp[] };
}

