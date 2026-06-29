import type { Client, Devis, Parametres } from "@/lib/types";

export async function publishDevisSignatureLink(payload: {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
}): Promise<{
  signatureUrl: string;
  publicToken: string;
  error?: string;
}> {
  try {
    const response = await fetch("/api/devis/publish-signature", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as {
      signatureUrl?: string;
      publicToken?: string;
      error?: string;
    };

    if (!response.ok || !body.signatureUrl || !body.publicToken) {
      return {
        signatureUrl: "",
        publicToken: "",
        error: body.error ?? "Impossible de publier le lien de signature.",
      };
    }

    return {
      signatureUrl: body.signatureUrl,
      publicToken: body.publicToken,
    };
  } catch {
    return {
      signatureUrl: "",
      publicToken: "",
      error: "Impossible de publier le lien de signature.",
    };
  }
}
