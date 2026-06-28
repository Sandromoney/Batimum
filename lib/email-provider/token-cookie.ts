import { createHmac, timingSafeEqual } from "crypto";
import { getEmailOauthSecret } from "./env-config";
import type { StoredEmailOAuthTokens } from "./types";
export const EMAIL_OAUTH_COOKIE = "btp_email_oauth";
export const EMAIL_OAUTH_STATE_COOKIE = "btp_oauth_state";
export { EMAIL_OAUTH_FLOW_COOKIE } from "./oauth-flow";

function getSecret(): string {
  return (
    getEmailOauthSecret() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    "btp-email-oauth-dev-secret"
  );
}
export function sealEmailOAuthTokens(payload: StoredEmailOAuthTokens): string {
  const json = JSON.stringify(payload);
  const signature = createHmac("sha256", getSecret()).update(json).digest("base64url");
  return Buffer.from(JSON.stringify({ json, signature })).toString("base64url");
}

export function unsealEmailOAuthTokens(
  sealed: string | undefined | null,
): StoredEmailOAuthTokens | null {
  if (!sealed) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(sealed, "base64url").toString("utf8"),
    ) as { json: string; signature: string };
    const expected = createHmac("sha256", getSecret())
      .update(parsed.json)
      .digest("base64url");

    const sigBuf = Buffer.from(parsed.signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    return JSON.parse(parsed.json) as StoredEmailOAuthTokens;
  } catch {
    return null;
  }
}

export function isTokenExpired(tokens: StoredEmailOAuthTokens): boolean {
  return Date.now() >= tokens.expiresAt - 60_000;
}
