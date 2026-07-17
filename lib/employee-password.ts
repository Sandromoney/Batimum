import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEYLEN = 64;

/** Hachage scrypt (Node crypto) — ne jamais stocker le mot de passe en clair. */
export function hashEmployeePassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyEmployeePassword(
  password: string,
  stored: string,
): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  try {
    const derived = scryptSync(password, salt, KEYLEN);
    const expected = Buffer.from(hashHex, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
