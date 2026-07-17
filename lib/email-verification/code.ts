import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const EMAIL_VERIFICATION_CODE_TTL_MINUTES = 10;
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashVerificationCode(code: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${code.trim()}`).digest("hex");
}

export function createVerificationCodeSalt(): string {
  return randomBytes(16).toString("hex");
}

export function verificationCodesMatch(
  submittedCode: string,
  storedHash: string,
  salt: string,
): boolean {
  const submittedHash = hashVerificationCode(submittedCode, salt);
  const left = Buffer.from(submittedHash, "utf8");
  const right = Buffer.from(storedHash, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verificationCodeExpiresAt(
  minutes = EMAIL_VERIFICATION_CODE_TTL_MINUTES,
): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}
