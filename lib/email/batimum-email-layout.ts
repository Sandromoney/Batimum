/**
 * Layout email premium Batimum — HTML table compatible Gmail / Outlook / Apple Mail.
 */

const BRAND_TEXT = "#111111";
const BRAND_ACCENT = "#2563EB";
const OUTER_BG = "#F3F4F6";
const CARD_BG = "#FFFFFF";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const BUTTON_BG = "#111111";
const BUTTON_TEXT = "#FFFFFF";
const FONT =
  "Arial, Helvetica, sans-serif";

const LOGO_PATH = "/logocomplet-batimum.png";

export function escapeEmailHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** URL publique stable pour le logo (évite localhost). */
export function getBatimumEmailLogoUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl && !/localhost|127\.0\.0\.1/i.test(appUrl)) {
    return `${appUrl}${LOGO_PATH}`;
  }
  return `https://batimum.fr${LOGO_PATH}`;
}

export function getBatimumAppUrl(path = ""): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const base =
    appUrl && !/localhost|127\.0\.0\.1/i.test(appUrl)
      ? appUrl
      : "https://batimum.fr";
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export type BatimumEmailButton = {
  label: string;
  href: string;
};

export type BatimumEmailLayoutInput = {
  title: string;
  preheader?: string;
  introHtml?: string;
  bodyHtml: string;
  button?: BatimumEmailButton;
  footerNote?: string;
  /** Affiche le code de vérification en grand. */
  codeBlock?: string;
};

function renderButton(button?: BatimumEmailButton): string {
  if (!button?.href || !button.label) return "";
  const href = escapeEmailHtml(button.href);
  const label = escapeEmailHtml(button.label);
  return `
          <tr>
            <td align="center" style="padding:28px 32px 8px 32px;">
              <a href="${href}" style="display:inline-block;background-color:${BUTTON_BG};color:${BUTTON_TEXT};font-family:${FONT};font-size:14px;font-weight:700;line-height:1.2;text-decoration:none;padding:14px 22px;border-radius:10px;">
                ${label}
              </a>
            </td>
          </tr>`;
}

function renderCode(code?: string): string {
  if (!code) return "";
  const safe = escapeEmailHtml(code);
  return `
          <tr>
            <td align="center" style="padding:24px 32px 8px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color:#EFF6FF;border:1px solid ${BRAND_ACCENT};border-radius:12px;padding:18px 28px;">
                    <span style="display:inline-block;font-size:32px;line-height:1;font-weight:700;letter-spacing:0.28em;color:${BRAND_TEXT};font-family:'Courier New',Courier,monospace;">
                      ${safe}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

export function buildBatimumEmailHtml(input: BatimumEmailLayoutInput): string {
  const logoUrl = escapeEmailHtml(getBatimumEmailLogoUrl());
  const title = escapeEmailHtml(input.title);
  const preheader = escapeEmailHtml(input.preheader ?? "");
  const intro = input.introHtml ?? "";
  const body = input.bodyHtml;
  const footer = input.footerNote
    ? `<p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};text-align:center;">${input.footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${OUTER_BG};font-family:${FONT};color:${BRAND_TEXT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>` : ""}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${OUTER_BG};margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:${CARD_BG};border-radius:16px;border:1px solid ${BORDER};overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 32px 16px 32px;">
              <img src="${logoUrl}" alt="Batimum" width="160" style="display:block;width:160px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
              <p style="margin:10px 0 0 0;font-size:11px;letter-spacing:0.22em;font-weight:700;color:${MUTED};font-family:${FONT};">BATIMUM</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0 32px;">
              <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700;color:${BRAND_TEXT};text-align:center;font-family:${FONT};">
                ${title}
              </h1>
            </td>
          </tr>
          ${
            intro
              ? `<tr><td style="padding:14px 32px 0 32px;"><div style="font-size:15px;line-height:1.65;color:${MUTED};text-align:center;font-family:${FONT};">${intro}</div></td></tr>`
              : ""
          }
          ${renderCode(input.codeBlock)}
          <tr>
            <td style="padding:18px 32px 0 32px;">
              <div style="font-size:15px;line-height:1.65;color:${BRAND_TEXT};font-family:${FONT};">
                ${body}
              </div>
            </td>
          </tr>
          ${renderButton(input.button)}
          ${
            footer
              ? `<tr><td style="padding:20px 32px 0 32px;">${footer}</td></tr>`
              : ""
          }
          <tr>
            <td style="padding:28px 32px 32px 32px;">
              <p style="margin:0;font-size:14px;line-height:1.5;color:${BRAND_TEXT};text-align:center;font-weight:600;font-family:${FONT};">
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

export function plainTextFromParagraphs(lines: string[]): string {
  return lines.filter((line) => line != null).join("\n");
}

export function paragraphsToEmailHtml(text: string): string {
  return escapeEmailHtml(text).replace(/\n/g, "<br>");
}

export const BATIMUM_EMAIL_FROM_FALLBACK = "Batimum <onboarding@resend.dev>";
