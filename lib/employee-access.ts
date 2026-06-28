import type { AppRole } from "@/lib/auth-types";
import {
  getCredentials,
  hashPassword,
  verifyPassword,
  type AuthCredentials,
} from "@/lib/auth-credentials";
import type { UserAccount } from "@/lib/account";
import { ACCOUNT_STORAGE_KEY } from "@/lib/account";
import type { AppData, Employe } from "@/lib/types";

const CREDENTIALS_KEY = "btp-gestion-credentials";
const DATA_KEY = "btp-gestion-data";

function normalizeLogin(value: string): string {
  return value.trim().toLowerCase();
}

function readCredentialsStore(): Record<string, AuthCredentials> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, AuthCredentials>;
  } catch {
    return {};
  }
}

function writeCredentialsStore(store: Record<string, AuthCredentials>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(store));
}

function readAppData(): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

export function getEmployeLoginKey(
  employe: Pick<Employe, "email" | "identifiant">,
): string {
  const email = employe.email?.trim();
  if (email) return normalizeLogin(email);
  const identifiant = employe.identifiant?.trim();
  if (identifiant) return normalizeLogin(identifiant);
  return "";
}

export function findEmployeByLogin(
  data: AppData,
  identifier: string,
): Employe | undefined {
  const key = normalizeLogin(identifier);
  if (!key) return undefined;

  return data.employes.find((employe) => {
    const email = employe.email?.trim().toLowerCase();
    const identifiant = employe.identifiant?.trim().toLowerCase();
    return email === key || identifiant === key;
  });
}

export function isEmployeActif(employe: Employe): boolean {
  return (employe.statut ?? "actif") === "actif";
}

export function employeDisplayLabel(employe: Employe): string {
  return [employe.prenom, employe.nom].filter(Boolean).join(" ").trim();
}

export async function saveEmployeCredentials(
  loginKey: string,
  password: string,
  employeId: string,
): Promise<void> {
  const normalized = normalizeLogin(loginKey);
  const { hash, salt } = await hashPassword(password);
  const store = readCredentialsStore();

  store[normalized] = {
    email: normalized,
    passwordHash: hash,
    salt,
    emailVerified: true,
    role: "employe",
    employeId,
  };

  writeCredentialsStore(store);
}

export async function removeEmployeCredentials(loginKey: string): Promise<void> {
  const normalized = normalizeLogin(loginKey);
  const store = readCredentialsStore();
  delete store[normalized];
  writeCredentialsStore(store);
}

export function buildEmployeUserAccount(
  employe: Employe,
  entreprise: string,
): UserAccount {
  return {
    entreprise,
    utilisateur: employeDisplayLabel(employe),
    email: employe.email?.trim() || employe.identifiant?.trim() || "",
    telephone: employe.telephone?.trim() || "",
    subscriptionStatus: "active",
    createdAt: new Date().toISOString(),
    onboardingCompleted: true,
    role: "employe",
    employeId: employe.id,
  };
}

export async function authenticateEmployeLogin(
  identifier: string,
  password: string,
): Promise<{
  ok: boolean;
  message: string;
  employe?: Employe;
  account?: UserAccount;
}> {
  const data = readAppData();
  if (!data) {
    return { ok: false, message: "Données application indisponibles." };
  }

  const employe = findEmployeByLogin(data, identifier);
  if (!employe) {
    return { ok: false, message: "Identifiants employés incorrects." };
  }

  if (!isEmployeActif(employe)) {
    return { ok: false, message: "Ce compte employé est désactivé." };
  }

  const loginKey = getEmployeLoginKey(employe);
  if (!loginKey) {
    return { ok: false, message: "Identifiants employés incorrects." };
  }

  const credentials = getCredentials(loginKey);
  if (
    !credentials ||
    credentials.role !== "employe" ||
    credentials.employeId !== employe.id
  ) {
    return { ok: false, message: "Identifiants employés incorrects." };
  }

  const authenticated = await verifyPassword(password, credentials);
  if (!authenticated) {
    return { ok: false, message: "Identifiants employés incorrects." };
  }

  const account = buildEmployeUserAccount(employe, data.parametres.entreprise);

  if (typeof window !== "undefined") {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  }

  return {
    ok: true,
    message: "Connexion employé réussie.",
    employe,
    account,
  };
}

export function normalizeEmployeRecord(employe: Employe): Employe {
  return {
    ...employe,
    prenom: employe.prenom?.trim() ?? "",
    nom: employe.nom?.trim() ?? "",
    email: employe.email?.trim() || undefined,
    identifiant: employe.identifiant?.trim() || undefined,
    telephone: employe.telephone?.trim() || undefined,
    statut: employe.statut === "desactive" ? "desactive" : "actif",
    photo: employe.photo || undefined,
    poste: employe.poste || undefined,
  };
}

export function getRoleFromCredentials(
  credentials: AuthCredentials | null,
): AppRole {
  return credentials?.role === "employe" ? "employe" : "admin";
}

export function isEmployeLoginIdentifier(identifier: string): boolean {
  const data = readAppData();
  if (data && findEmployeByLogin(data, identifier)) {
    return true;
  }

  const credentials = getCredentials(identifier);
  return credentials?.role === "employe";
}
