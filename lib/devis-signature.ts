import { devisTotal } from "./data";
import { getDevisPdfBase64 } from "./devis-pdf";
import {
  appendDevisHistorique,
  getDevisDisplayStatut,
  markDevisEnvoye,
  markDevisSigned,
  type MarkDevisSignedInput,
} from "./devis-statut";
import {
  createDevisSignedNotification,
  sendDevisSignedNotifications,
} from "./relances";
import type { Client, Devis, NotificationApp, Parametres } from "./types";

export type CompleteDevisClientSignatureInput = {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  signature: string;
  signedBy: string;
  clientIp?: string;
  totalHT?: number;
  /** Ne pas envoyer les emails (flux signature publique serveur). */
  skipNotifications?: boolean;
};

export type CompleteDevisClientSignatureResult = {
  devis: Devis;
  pdfBase64: string;
  notification: NotificationApp;
  emails: Awaited<ReturnType<typeof sendDevisSignedNotifications>>;
  emailsSimulated: boolean;
};

export function isDevisOfficiallySigned(devis: Devis): boolean {
  return (
    devis.statut === "signe" &&
    Boolean(devis.signature && (devis.signedAt || devis.dateSignature))
  );
}

export function canClientSignDevis(devis: Devis): boolean {
  if (isDevisOfficiallySigned(devis)) return false;
  if (devis.statut === "refuse" || devis.statut === "archive") return false;
  if (getDevisDisplayStatut(devis) === "expire") return false;
  return true;
}

function prepareDevisForClientSignature(devis: Devis, actor: string): Devis {
  if (devis.statut === "brouillon") {
    return markDevisEnvoye(devis, actor);
  }
  return devis;
}

function appendOfficialPdfHistorique(
  devis: Devis,
  signedBy: string,
  clientIp?: string,
): Devis {
  return appendDevisHistorique(
    devis,
    {
      type: "modifie",
      label: "PDF signé généré (version officielle)",
      meta: {
        pdfOfficiel: "true",
        signataire: signedBy,
        ...(clientIp ? { clientIp } : {}),
      },
    },
    signedBy,
  );
}

function appendSignedPdfEmailHistorique(
  devis: Devis,
  label: string,
  destinataire: string,
  signedBy: string,
): Devis {
  return appendDevisHistorique(
    devis,
    {
      type: "envoye",
      label,
      meta: {
        destinataire,
        pdfOfficiel: "true",
        signataire: signedBy,
      },
    },
    signedBy,
  );
}

/** Finalise une signature client : statut signé, PDF officiel, emails, historique. */
export async function completeDevisClientSignature({
  devis,
  client,
  parametres,
  signature,
  signedBy,
  clientIp,
  totalHT,
  skipNotifications = false,
}: CompleteDevisClientSignatureInput): Promise<CompleteDevisClientSignatureResult> {
  if (!canClientSignDevis(devis)) {
    throw new Error("Ce devis ne peut pas être signé.");
  }

  const resolvedTotalHT = totalHT ?? devis.montantHT ?? devisTotal(devis);
  const trimmedSignedBy = signedBy.trim();

  let prepared = prepareDevisForClientSignature(devis, trimmedSignedBy);

  const signInput: MarkDevisSignedInput = {
    signature,
    signedBy: trimmedSignedBy,
    clientIp,
  };

  let signedDevis = markDevisSigned(prepared, signInput, trimmedSignedBy);
  if (signedDevis.statut !== "signe") {
    throw new Error("Impossible de passer le devis au statut signé.");
  }

  const pdfBase64 = await getDevisPdfBase64({
    devis: signedDevis,
    client,
    parametres,
    totalHT: resolvedTotalHT,
  });

  const now = new Date().toISOString();
  signedDevis = {
    ...signedDevis,
    signedPdfGeneratedAt: now,
  };

  signedDevis = appendOfficialPdfHistorique(signedDevis, trimmedSignedBy, clientIp);

  let emailResults: Awaited<ReturnType<typeof sendDevisSignedNotifications>> = {
    company: { success: false, simulated: false, message: "" },
    client: { success: false, simulated: false, message: "" },
    pdfBase64,
  };

  if (!skipNotifications) {
    emailResults = await sendDevisSignedNotifications({
      devis: signedDevis,
      client,
      parametres,
      totalHT: resolvedTotalHT,
      pdfBase64,
    });
  }

  const companyDest = parametres.email?.trim();
  const clientDest = client?.email?.trim();

  if (companyDest && (emailResults.company.success || emailResults.company.simulated)) {
    signedDevis = appendSignedPdfEmailHistorique(
      signedDevis,
      "PDF signé envoyé à l'entreprise",
      companyDest,
      trimmedSignedBy,
    );
  }

  if (clientDest && (emailResults.client.success || emailResults.client.simulated)) {
    signedDevis = appendSignedPdfEmailHistorique(
      signedDevis,
      "PDF signé envoyé au client",
      clientDest,
      trimmedSignedBy,
    );
  }

  const notification = createDevisSignedNotification({
    devis: signedDevis,
    clientName: trimmedSignedBy,
  });

  return {
    devis: signedDevis,
    pdfBase64,
    notification,
    emails: emailResults,
    emailsSimulated:
      emailResults.company.simulated || emailResults.client.simulated,
  };
}
