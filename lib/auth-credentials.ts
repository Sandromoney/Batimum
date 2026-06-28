const CREDENTIALS_KEY = "btp-gestion-credentials";
const PENDING_SIGNUP_KEY = "btp-pending-signup";

import type { AppRole } from "@/lib/auth-types";

export type AuthCredentials = {
  email: string;
  passwordHash: string;
  salt: string;
  emailVerified: boolean;
  authProvider?: "google" | "password";
  verificationCode?: string;
  verificationExpiresAt?: string;
  resetCode?: string;
  resetExpiresAt?: string;
  role?: AppRole;
  employeId?: string;
};

type CredentialsStore = Record<string, AuthCredentials>;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readStore(): CredentialsStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CredentialsStore;
  } catch {
    return {};
  }
}

function writeStore(store: CredentialsStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(store));
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function codeExpiresInMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function isCodeValid(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

export async function hashPassword(
  password: string,
  salt?: string,
): Promise<{ hash: string; salt: string }> {
  const usedSalt = salt ?? crypto.randomUUID();
  const data = new TextEncoder().encode(`${usedSalt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return { hash, salt: usedSalt };
}

export async function verifyPassword(
  password: string,
  credentials: AuthCredentials,
): Promise<boolean> {
  const { hash } = await hashPassword(password, credentials.salt);
  return hash === credentials.passwordHash;
}

export function getCredentials(email: string): AuthCredentials | null {
  const store = readStore();
  return store[normalizeEmail(email)] ?? null;
}

export function isEmailVerified(email: string): boolean {
  const credentials = getCredentials(email);
  if (!credentials) return false;
  return credentials.emailVerified;
}

export function isGoogleAuthAccount(email: string): boolean {
  const credentials = getCredentials(email);
  return credentials?.authProvider === "google";
}

export function saveGoogleSignupCredentials(email: string): void {
  const normalized = normalizeEmail(email);
  const store = readStore();
  store[normalized] = {
    email: normalized,
    passwordHash: "",
    salt: "",
    emailVerified: true,
    authProvider: "google",
  };
  writeStore(store);

  if (typeof window !== "undefined") {
    sessionStorage.setItem(PENDING_SIGNUP_KEY, normalized);
  }
}

export async function saveVerifiedPasswordCredentials(
  email: string,
  password: string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  const { hash, salt } = await hashPassword(password);
  const store = readStore();
  store[normalized] = {
    email: normalized,
    passwordHash: hash,
    salt,
    emailVerified: true,
    authProvider: "password",
  };
  writeStore(store);
}

export async function savePendingSignupCredentials(
  email: string,
  password: string,
): Promise<{ verificationCode: string }> {
  const normalized = normalizeEmail(email);
  const { hash, salt } = await hashPassword(password);
  const verificationCode = generateCode();
  const pending: AuthCredentials = {
    email: normalized,
    passwordHash: hash,
    salt,
    emailVerified: false,
    authProvider: "password",
    verificationCode,
    verificationExpiresAt: codeExpiresInMinutes(60 * 24),
  };

  const store = readStore();
  store[normalized] = pending;
  writeStore(store);

  if (typeof window !== "undefined") {
    sessionStorage.setItem(PENDING_SIGNUP_KEY, normalized);
  }

  return { verificationCode };
}

export function finalizePendingSignupCredentials(email: string): void {
  const normalized = normalizeEmail(email);
  const store = readStore();
  if (!store[normalized]) return;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(PENDING_SIGNUP_KEY, normalized);
  }
}

export function getPendingSignupEmail(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PENDING_SIGNUP_KEY);
}

export function clearPendingSignupEmail(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_SIGNUP_KEY);
}

export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<{ ok: boolean; message: string }> {
  const normalized = normalizeEmail(email);
  const store = readStore();
  const credentials = store[normalized];
  if (!credentials) {
    return { ok: false, message: "Aucun compte trouvé pour cet email." };
  }
  if (credentials.emailVerified) {
    return { ok: true, message: "Email déjà vérifié." };
  }
  if (
    credentials.verificationCode !== code.trim() ||
    !isCodeValid(credentials.verificationExpiresAt)
  ) {
    return { ok: false, message: "Code invalide ou expiré." };
  }

  store[normalized] = {
    ...credentials,
    emailVerified: true,
    verificationCode: undefined,
    verificationExpiresAt: undefined,
  };
  writeStore(store);
  clearPendingSignupEmail();
  return { ok: true, message: "Email vérifié avec succès." };
}

export async function authenticateCredentials(
  email: string,
  password: string,
): Promise<{ ok: boolean; message: string; credentials?: AuthCredentials }> {
  const normalized = normalizeEmail(email);
  const credentials = getCredentials(normalized);
  if (!credentials) {
    return { ok: false, message: "Email ou mot de passe incorrect." };
  }
  if (credentials.authProvider === "google") {
    return {
      ok: false,
      message: "Ce compte utilise Google. Cliquez sur « Continuer avec Google ».",
    };
  }
  const valid = await verifyPassword(password, credentials);
  if (!valid) {
    return { ok: false, message: "Email ou mot de passe incorrect." };
  }
  if (!credentials.emailVerified) {
    return {
      ok: false,
      message: "Vérifiez votre email avant de vous connecter.",
    };
  }
  return { ok: true, message: "Connexion réussie.", credentials };
}

export function requestPasswordReset(email: string): {
  ok: boolean;
  message: string;
  resetCode?: string;
} {
  const normalized = normalizeEmail(email);
  const store = readStore();
  const credentials = store[normalized];
  if (!credentials) {
    return {
      ok: true,
      message:
        "Si un compte existe pour cet email, un code de réinitialisation a été généré.",
    };
  }

  const resetCode = generateCode();
  store[normalized] = {
    ...credentials,
    resetCode,
    resetExpiresAt: codeExpiresInMinutes(30),
  };
  writeStore(store);

  return {
    ok: true,
    message: "Code de réinitialisation généré.",
    resetCode,
  };
}

export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ ok: boolean; message: string }> {
  const normalized = normalizeEmail(email);
  const store = readStore();
  const credentials = store[normalized];
  if (!credentials) {
    return { ok: false, message: "Aucun compte trouvé pour cet email." };
  }
  if (
    credentials.resetCode !== code.trim() ||
    !isCodeValid(credentials.resetExpiresAt)
  ) {
    return { ok: false, message: "Code invalide ou expiré." };
  }

  const { hash, salt } = await hashPassword(newPassword);
  store[normalized] = {
    ...credentials,
    passwordHash: hash,
    salt,
    resetCode: undefined,
    resetExpiresAt: undefined,
  };
  writeStore(store);
  return { ok: true, message: "Mot de passe mis à jour." };
}

export function getVerificationCodeForEmail(email: string): string | null {
  const credentials = getCredentials(email);
  if (!credentials?.verificationCode) return null;
  if (!isCodeValid(credentials.verificationExpiresAt)) return null;
  return credentials.verificationCode;
}
