import type { OutboundEmail } from "../types";
import type { StoredEmailOAuthTokens } from "../types";

export async function sendViaMicrosoft(
  tokens: StoredEmailOAuthTokens,
  email: OutboundEmail,
): Promise<{ messageId?: string }> {
  const attachments =
    email.attachments?.map((attachment) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: attachment.filename,
      contentType: attachment.mimeType ?? "application/pdf",
      contentBytes: attachment.contentBase64,
    })) ?? [];

  const body = {
    message: {
      subject: email.subject,
      body: {
        contentType: email.html ? "HTML" : "Text",
        content: email.html ?? email.text,
      },
      toRecipients: [{ emailAddress: { address: email.to } }],
      from: { emailAddress: { address: tokens.email } },
      replyTo: email.replyTo
        ? [{ emailAddress: { address: email.replyTo } }]
        : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    },
    saveToSentItems: true,
  };

  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return {};
}
