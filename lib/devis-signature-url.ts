/** URL publique de production pour les liens clients (emails, signature). */
export const BATIMUM_PRODUCTION_URL = "https://batimum.vercel.app";

/**
 * URL de base pour les liens envoyés aux clients.
 * Priorité : NEXT_PUBLIC_APP_URL → production Batimum (jamais localhost).
 */
export function getClientFacingAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return BATIMUM_PRODUCTION_URL;
}

/** Lien public de signature électronique d'un devis (token Supabase). */
export function buildDevisSignatureUrl(publicToken: string): string {
  const base = getClientFacingAppBaseUrl();
  return `${base}/signature/${encodeURIComponent(publicToken)}`;
}

export function buildDevisSignaturePlainTextBlock(signatureUrl: string): string {
  return `Pour signer votre devis en ligne, cliquez sur le lien ci-dessous :
${signatureUrl}

Si le lien ne s'ouvre pas, copiez cette adresse dans votre navigateur :
${signatureUrl}`;
}

export function buildDevisSignatureHtmlBlock(signatureUrl: string): string {
  const escapedUrl = signatureUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");

  return `<div style="margin: 28px 0; padding: 24px; border: 2px solid #2563eb; border-radius: 10px; background-color: #eff6ff; text-align: center;">
  <p style="margin: 0 0 8px; font-size: 18px; font-weight: bold; color: #1e3a8a;">Signez votre devis en ligne</p>
  <p style="margin: 0 0 20px; font-size: 14px; color: #374151;">Consultez le détail et validez électroniquement votre devis.</p>
  <a href="${escapedUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Signer le devis</a>
  <p style="margin: 20px 0 0; font-size: 13px; color: #4b5563; line-height: 1.6; text-align: left;">
    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
    <a href="${escapedUrl}" style="color: #2563eb; word-break: break-all;">${escapedUrl}</a>
  </p>
</div>`;
}
