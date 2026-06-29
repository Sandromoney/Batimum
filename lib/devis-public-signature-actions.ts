import { devisTotal } from "@/lib/data";
import {
  loadDevisPublicSignatureByToken,
  updateDevisPublicSignatureByToken,
  type DevisPublicSignatureRow,
} from "@/lib/devis-public-signature-store";
import { completeDevisClientSignature } from "@/lib/devis-signature";
import { loadEmailConnectionTokensForUserId } from "@/lib/email-connection-store";
import { emailProviderService } from "@/lib/email-provider";
import { sealEmailOAuthTokens } from "@/lib/email-provider/token-cookie";
import {
  buildDevisRefusalCompanyEmail,
  buildDevisSignedClientEmail,
  buildDevisSignedCompanyEmail,
  createDevisRefusalNotification,
} from "@/lib/relances";
import {
  markDevisRefusedByClient,
} from "@/lib/devis-statut";
import type { Client, Devis } from "@/lib/types";

async function sendEmailAsOwner(
  userId: string,
  payload: {
    destinataire: string;
    objet: string;
    message: string;
    html?: string;
    pdfBase64?: string;
    pdfFilename?: string;
    replyToEmail?: string;
  },
) {
  const tokens = await loadEmailConnectionTokensForUserId(userId);
  if (!tokens) {
    return {
      success: false,
      simulated: false,
      message: "Connexion email entreprise indisponible.",
    };
  }

  const result = await emailProviderService.send(
    {
      from: "",
      to: payload.destinataire,
      subject: payload.objet,
      text: payload.message,
      html: payload.html,
      replyTo: payload.replyToEmail,
      attachments:
        payload.pdfBase64 && payload.pdfFilename
          ? [
              {
                filename: payload.pdfFilename,
                contentBase64: payload.pdfBase64,
                mimeType: "application/pdf",
              },
            ]
          : undefined,
    },
    {
      sealedTokens: sealEmailOAuthTokens(tokens),
      replyToEmail: payload.replyToEmail,
    },
  );

  return {
    success: result.ok,
    simulated: result.simulated ?? false,
    message: result.message,
  };
}

export async function completePublicDevisSignature({
  publicToken,
  signature,
  signedBy,
  clientIp,
}: {
  publicToken: string;
  signature: string;
  signedBy: string;
  clientIp?: string;
}): Promise<{
  devis: Devis;
  error: string | null;
}> {
  const { row, error: loadError } =
    await loadDevisPublicSignatureByToken(publicToken);

  if (loadError) {
    return { devis: {} as Devis, error: loadError.message };
  }

  if (!row) {
    return { devis: {} as Devis, error: "Devis introuvable." };
  }

  if (row.status !== "pending") {
    return { devis: row.devis, error: "Ce devis a déjà été traité." };
  }

  try {
    const totalHT = row.devis.montantHT ?? devisTotal(row.devis);
    const result = await completeDevisClientSignature({
      devis: row.devis,
      client: row.client ?? undefined,
      parametres: row.parametres,
      signature,
      signedBy,
      clientIp,
      totalHT,
      skipNotifications: true,
    });

    const updateError = await updateDevisPublicSignatureByToken(publicToken, {
      status: "signed",
      devis: result.devis,
      signature_data: signature,
      signed_by: signedBy.trim(),
      signed_at: result.devis.signedAt ?? new Date().toISOString(),
      client_ip: clientIp ?? null,
    });

    if (updateError.error) {
      return { devis: result.devis, error: updateError.error.message };
    }

    const signedByLabel =
      result.devis.signedBy ?? result.devis.nomSignataire ?? signedBy.trim();
    const pdfFilename = `${result.devis.numero}-devis-signe.pdf`;

    const companyEmail = buildDevisSignedCompanyEmail({
      devis: result.devis,
      client: row.client ?? undefined,
      parametres: row.parametres,
      signedBy: signedByLabel,
    });
    const clientEmail = buildDevisSignedClientEmail({
      devis: result.devis,
      client: row.client ?? undefined,
      parametres: row.parametres,
      signedBy: signedByLabel,
    });

    const companyDest = row.parametres.email?.trim();
    const clientDest = row.client?.email?.trim();
    const replyTo = row.parametres.email?.trim();

    await Promise.all([
      companyDest
        ? sendEmailAsOwner(row.user_id, {
            ...companyEmail,
            destinataire: companyDest,
            pdfBase64: result.pdfBase64,
            pdfFilename,
            replyToEmail: replyTo,
          })
        : Promise.resolve(null),
      clientDest
        ? sendEmailAsOwner(row.user_id, {
            ...clientEmail,
            destinataire: clientDest,
            pdfBase64: result.pdfBase64,
            pdfFilename,
            replyToEmail: replyTo,
          })
        : Promise.resolve(null),
    ]);

    return { devis: result.devis, error: null };
  } catch (error) {
    return {
      devis: row.devis,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de finaliser la signature.",
    };
  }
}

export async function refusePublicDevisSignature({
  publicToken,
  refusedBy,
  refusalReason,
  clientIp,
}: {
  publicToken: string;
  refusedBy: string;
  refusalReason?: string;
  clientIp?: string;
}): Promise<{ devis: Devis; error: string | null }> {
  const { row, error: loadError } =
    await loadDevisPublicSignatureByToken(publicToken);

  if (loadError) {
    return { devis: {} as Devis, error: loadError.message };
  }

  if (!row) {
    return { devis: {} as Devis, error: "Devis introuvable." };
  }

  if (row.status !== "pending") {
    return { devis: row.devis, error: "Ce devis a déjà été traité." };
  }

  const refusedDevis = markDevisRefusedByClient(row.devis, {
    refusedBy,
    refusalReason,
    clientIp,
  });

  const updateError = await updateDevisPublicSignatureByToken(publicToken, {
    status: "refused",
    devis: refusedDevis,
    refused_at: refusedDevis.refusedAt ?? new Date().toISOString(),
    refused_by: refusedBy,
    refusal_reason: refusalReason ?? null,
    client_ip: clientIp ?? null,
  });

  if (updateError.error) {
    return { devis: refusedDevis, error: updateError.error.message };
  }

  const companyEmail = buildDevisRefusalCompanyEmail({
    devis: refusedDevis,
    client: row.client ?? undefined,
    parametres: row.parametres,
    refusalReason,
  });

  const companyDest = row.parametres.email?.trim();
  if (companyDest) {
    await sendEmailAsOwner(row.user_id, {
      ...companyEmail,
      destinataire: companyDest,
      replyToEmail: companyDest,
    });
  }

  void createDevisRefusalNotification({
    devis: refusedDevis,
    clientName: refusedBy,
    refusalReason,
  });

  return { devis: refusedDevis, error: null };
}

export type PublicDevisSignatureView = {
  devis: Devis;
  client: Client | null;
  parametres: DevisPublicSignatureRow["parametres"];
  status: DevisPublicSignatureRow["status"];
};

export function toPublicDevisSignatureView(
  row: DevisPublicSignatureRow,
): PublicDevisSignatureView {
  return {
    devis: row.devis,
    client: row.client,
    parametres: row.parametres,
    status: row.status,
  };
}
