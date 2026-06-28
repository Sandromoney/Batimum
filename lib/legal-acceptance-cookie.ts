import { createHmac, timingSafeEqual } from "crypto";
import { getEmailOauthSecret } from "@/lib/email-provider/env-config";
import type { LegalAcceptance } from "@/lib/legal-acceptance";

export const TERMS_ACCEPTANCE_COOKIE = "btp_terms_acceptance";

function getSecret(): string {
  return getEmailOauthSecret() || "btp-email-oauth-dev-secret";
}

export function sealTermsAcceptance(payload: LegalAcceptance): string {
  const json = JSON.stringify(payload);
  const signature = createHmac("sha256", getSecret()).update(json).digest("base64url");
  return Buffer.from(JSON.stringify({ json, signature })).toString("base64url");
}

export function unsealTermsAcceptance(
  sealed: string | undefined | null,
): LegalAcceptance | null {
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

    return JSON.parse(parsed.json) as LegalAcceptance;
  } catch {
    return null;
  }
}
