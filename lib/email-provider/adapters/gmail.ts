import { buildGmailRawMessage } from "../mime";
import type { OutboundEmail, StoredEmailOAuthTokens } from "../types";

export async function sendViaGmail(
  tokens: StoredEmailOAuthTokens,
  email: OutboundEmail,
): Promise<{ messageId?: string }> {
  const raw = buildGmailRawMessage({
    ...email,
    from: email.from || tokens.email,
  });

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const result = (await response.json()) as { id?: string };
  return { messageId: result.id };
}
