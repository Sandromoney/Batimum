import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { getEmailOauthSecret } from "@/lib/email-provider/env-config";

function getEncryptionKey(): Buffer {
  const secret =
    getEmailOauthSecret() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    "btp-email-oauth-dev-secret";
  return scryptSync(secret, "btp-email-oauth-salt", 32);
}

export function encryptEmailToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptEmailToken(encoded: string): string {
  const buffer = Buffer.from(encoded, "base64url");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
