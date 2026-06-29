import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getEmailOauthSecret } from "./env-config";

function getStateSecret(): string {
  return (
    getEmailOauthSecret() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "btp-email-oauth-state-dev-secret"
  );
}

function signOAuthNonce(nonce: string): string {
  return createHmac("sha256", getStateSecret()).update(nonce).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/** State envoyé à Google : nonce.signature */
export function createSignedOAuthState(): { state: string; nonce: string } {
  const nonce = randomBytes(24).toString("hex");
  const signature = signOAuthNonce(nonce);
  return { state: `${nonce}.${signature}`, nonce };
}

export type OAuthStateVerification =
  | {
      ok: true;
      nonce: string;
      method: "cookie" | "signature";
    }
  | {
      ok: false;
      reason: "missing" | "malformed" | "invalid-signature" | "cookie-mismatch";
    };

export function verifyOAuthState(
  receivedState: string | null,
  cookieNonce: string | null,
): OAuthStateVerification {
  if (!receivedState?.trim()) {
    return { ok: false, reason: "missing" };
  }

  const dotIndex = receivedState.lastIndexOf(".");
  if (dotIndex <= 0) {
    return { ok: false, reason: "malformed" };
  }

  const nonce = receivedState.slice(0, dotIndex);
  const signature = receivedState.slice(dotIndex + 1);
  const expectedSignature = signOAuthNonce(nonce);

  if (!safeEqual(signature, expectedSignature)) {
    return { ok: false, reason: "invalid-signature" };
  }

  if (cookieNonce) {
    if (!safeEqual(cookieNonce, nonce)) {
      return { ok: false, reason: "cookie-mismatch" };
    }
    return { ok: true, nonce, method: "cookie" };
  }

  return { ok: true, nonce, method: "signature" };
}
