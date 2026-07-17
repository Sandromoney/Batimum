export const VERIFICATION_EMAIL_SUBJECT =
  "Votre code de vérification Batimum";

const BRAND_LOGO_SRC = "/logocomplet-batimum.png";

const EMERALD = "#10B981";
const EMERALD_DARK = "#047857";
const BACKGROUND = "#F8FAF8";
const TEXT = "#1F2937";
const MUTED = "#6B7280";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Origine publique pour le logo (évite localhost dans les emails de prod). */
export function getVerificationEmailLogoUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl && !/localhost|127\.0\.0\.1/i.test(appUrl)) {
    return `${appUrl}${BRAND_LOGO_SRC}`;
  }
  return `https://batimum.fr${BRAND_LOGO_SRC}`;
}

export function buildVerificationEmailText(code: string): string {
  return [
    "Vérifiez votre adresse email",
    "",
    "Voici votre code de vérification Batimum :",
    "",
    code,
    "",
    "Ce code est valable 10 minutes.",
    "",
    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
    "",
    "L'équipe Batimum",
  ].join("\n");
}

export function buildVerificationEmailHtml(code: string): string {
  const safeCode = escapeHtml(code);
  const logoUrl = escapeHtml(getVerificationEmailLogoUrl());

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${VERIFICATION_EMAIL_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background-color:${BACKGROUND};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BACKGROUND};margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background-color:#FFFFFF;border-radius:16px;border:1px solid #E5E7EB;overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 32px 20px 32px;">
              <img src="${logoUrl}" alt="Batimum" width="160" style="display:block;width:160px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:600;color:${TEXT};text-align:center;">
                Vérifiez votre adresse email
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0 32px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};text-align:center;">
                Voici votre code de vérification Batimum&nbsp;:
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 8px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color:#F0FDF4;border:1px solid ${EMERALD};border-radius:12px;padding:18px 28px;">
                    <span style="display:inline-block;font-size:32px;line-height:1;font-weight:700;letter-spacing:0.28em;color:${EMERALD_DARK};font-family:'Courier New',Courier,monospace;">
                      ${safeCode}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0 32px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};text-align:center;">
                Ce code est valable <strong style="color:${EMERALD_DARK};font-weight:600;">10&nbsp;minutes</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};text-align:center;">
                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px 32px;">
              <p style="margin:0;font-size:14px;line-height:1.5;color:${TEXT};text-align:center;font-weight:500;">
                L'équipe Batimum
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
