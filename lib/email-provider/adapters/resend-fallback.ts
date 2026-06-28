import type { OutboundEmail, EmailSendResult } from "../types";

export async function sendViaResendFallback(
  email: OutboundEmail,
): Promise<EmailSendResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();

  if (!resendApiKey || !emailFrom) {
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
    return {
      ok: false,
      provider: "resend_fallback",
      message: `Erreur envoi secours : ${await response.text()}`,
    };
  }

  const result = (await response.json()) as { id?: string };
  return {
    ok: true,
    provider: "resend_fallback",
    message: "Email envoyé via l'adresse technique du SaaS (Reply-To entreprise).",
    messageId: result.id,
  };
}
