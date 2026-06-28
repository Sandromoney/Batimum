import type { OutboundEmail } from "./types";

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function buildMimeRawMessage(email: OutboundEmail): string {
  const boundary = `----=_Batimum_${Date.now()}`;
  const lines: string[] = [
    `From: ${email.from}`,
    `To: ${email.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(email.subject, "utf8").toString("base64")}?=`,
    "MIME-Version: 1.0",
  ];

  if (email.replyTo) {
    lines.push(`Reply-To: ${email.replyTo}`);
  }

  const hasHtml = Boolean(email.html?.trim());
  const hasAttachments = (email.attachments?.length ?? 0) > 0;

  if (!hasHtml && !hasAttachments) {
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(Buffer.from(email.text, "utf8").toString("base64"));
    return lines.join("\r\n");
  }

  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push("");

  const altBoundary = `${boundary}_alt`;
  lines.push(`--${boundary}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  lines.push("");
  lines.push(`--${altBoundary}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");
  lines.push(Buffer.from(email.text, "utf8").toString("base64"));

  if (hasHtml) {
    lines.push(`--${altBoundary}`);
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(Buffer.from(email.html ?? "", "utf8").toString("base64"));
  }

  lines.push(`--${altBoundary}--`);

  for (const attachment of email.attachments ?? []) {
    lines.push(`--${boundary}`);
    lines.push(
      `Content-Type: ${attachment.mimeType ?? "application/pdf"}; name="${attachment.filename}"`,
    );
    lines.push("Content-Transfer-Encoding: base64");
    lines.push(
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
    );
    lines.push("");
    lines.push(attachment.contentBase64);
  }

  lines.push(`--${boundary}--`);
  return lines.join("\r\n");
}

export function buildGmailRawMessage(email: OutboundEmail): string {
  return encodeBase64Url(buildMimeRawMessage(email));
}
