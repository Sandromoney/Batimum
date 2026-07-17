import type { OutboundEmail, EmailSendResult } from "../types";

const LOG_PREFIX = "[email-verification]";

export function logResendEnvPresence(): void {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();
  console.info(
    `${LOG_PREFIX} RESEND_API_KEY présente : ${resendApiKey ? "oui" : "non"}`,
  );
  console.info(
    `${LOG_PREFIX} EMAIL_FROM présent : ${emailFrom ? "oui" : "non"}`,
  );
}

export async function sendViaResendFallback(
  email: OutboundEmail,
): Promise<EmailSendResult> {
  logResendEnvPresence();

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();

  console.info(`${LOG_PREFIX} Tentative d'envoi email à : ${email.to}`);

  if (!resendApiKey || !emailFrom) {
    const missing = [
      !resendApiKey ? "RESEND_API_KEY" : null,
      !emailFrom ? "EMAIL_FROM" : null,
    ]
      .filter(Boolean)
      .join(", ");
    console.error(
      `${LOG_PREFIX} Erreur Resend : variables manquantes (${missing}). Ajoutez-les dans .env.local puis redémarrez le serveur.`,
    );
    return {
      ok: false,
      provider: "none",
      message:
        "Mode secours indisponible — configurez RESEND_API_KEY et EMAIL_FROM.",
      simulated: true,
    };
  }

  const body: Record<string, unknown> = {
    from: emailFrom,
    to: [email.to],
    subject: email.subject,
    text: email.text,
    reply_to: email.replyTo,
  };

  if (email.html) body.html = email.html;
  if (email.attachments?.length) {
    body.attachments = email.attachments.map((item) => ({
      filename: item.filename,
      content: item.contentBase64,
    }));
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `${LOG_PREFIX} Erreur Resend : HTTP ${response.status} — ${errorBody}`,
    );
    return {
      ok: false,
      provider: "resend_fallback",
      message: `Erreur envoi secours : ${errorBody}`,
    };
  }

  const result = (await response.json()) as { id?: string };
  console.info(
    `${LOG_PREFIX} Email envoyé via Resend à ${email.to} (id: ${result.id ?? "inconnu"}).`,
  );
  return {
    ok: true,
    provider: "resend_fallback",
    message: "Email envoyé via l'adresse technique du SaaS (Reply-To entreprise).",
    messageId: result.id,
  };
}
