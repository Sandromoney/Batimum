import type { AppRole } from "@/lib/auth-types";
import type { UserAccount } from "@/lib/account";
import { ACCOUNT_STORAGE_KEY } from "@/lib/account";
import { emptyAppData, scopedDataKey } from "@/lib/app-data-empty";
import { buildAuthenticatedFetchInit } from "@/lib/authenticated-api-fetch";
import { normalizeParametres } from "@/lib/parametres";
import type { AppData, Employe } from "@/lib/types";

export const EMPLOYEE_LOGIN_ERROR = "Identifiant ou mot de passe incorrect.";
export const EMPLOYEE_DISABLED_ERROR =
  "Ce compte employé est désactivé. Contactez votre dirigeant.";

export type EmployeeLoginBootstrap = {
  companyId: string;
  employe: Employe;
  parametres: Pick<AppData["parametres"], "entreprise" | "theme">;
  employes: Employe[];
  planning?: AppData["planning"];
  chantiers?: AppData["chantiers"];
  affectations?: AppData["affectations"];
  clients?: AppData["clients"];
};

function normalizeLogin(value: string): string {
  return value.trim().toLowerCase();
}

function readCompanyAppData(companyId: string): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(scopedDataKey(companyId));
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

function writeCompanyAppData(companyId: string, data: AppData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(scopedDataKey(companyId), JSON.stringify(data));
}

export function getEmployeLoginKey(
  employe: Pick<Employe, "identifiant">,
): string {
  return normalizeLogin(employe.identifiant ?? "");
}

export function findEmployeByLogin(
  data: AppData,
  identifier: string,
): Employe | undefined {
  const key = normalizeLogin(identifier);
  if (!key) return undefined;

  return data.employes.find(
    (employe) => normalizeLogin(employe.identifiant ?? "") === key,
  );
}

export function isEmployeActif(employe: Employe): boolean {
  return (employe.statut ?? "actif") === "actif";
}

export function employeDisplayLabel(employe: Employe): string {
  return [employe.prenom, employe.nom].filter(Boolean).join(" ").trim();
}

/** Enregistre les accès côté serveur (hash scrypt). */
export async function saveEmployeCredentials(
  loginKey: string,
  password: string | undefined,
  employeId: string,
  options?: { active?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalizeLogin(loginKey);
  if (!normalized) {
    return { ok: false, error: "Identifiant requis." };
  }
  if (password !== undefined && password.trim().length > 0 && password.trim().length < 6) {
    return {
      ok: false,
      error: "Le mot de passe doit contenir au moins 6 caractères.",
    };
  }

  const body: Record<string, unknown> = {
    employeId,
    login: normalized,
    active: options?.active !== false,
  };
  if (password !== undefined && password.trim().length >= 6) {
    body.password = password.trim();
  }

  try {
    const response = await fetch(
      "/api/employee-credentials",
      await buildAuthenticatedFetchInit({
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      success?: boolean;
    };

    if (response.ok && payload.success) {
      return { ok: true };
    }

    if (response.status === 409) {
      return {
        ok: false,
        error:
          payload.error ??
          "Cet identifiant est déjà utilisé. Veuillez en choisir un autre.",
      };
    }

    if (response.status === 401) {
      return {
        ok: false,
        error: "Veuillez vous reconnecter pour enregistrer les accès.",
      };
    }

    return {
      ok: false,
      error: payload.error ?? "Impossible d'enregistrer les accès employé.",
    };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer les accès employé." };
  }
}

export async function removeEmployeCredentials(
  loginKey: string,
  employeId?: string,
): Promise<void> {
  if (!employeId) return;

  try {
    await fetch(
      `/api/employee-credentials?employeId=${encodeURIComponent(employeId)}`,
      await buildAuthenticatedFetchInit({ method: "DELETE" }),
    );
  } catch {
    /* best-effort */
  }
}

export function buildEmployeUserAccount(
  employe: Employe,
  entreprise: string,
  companyId?: string,
): UserAccount {
  return {
    entreprise,
    utilisateur: employeDisplayLabel(employe),
    email: employe.identifiant?.trim() || "",
    telephone: employe.telephone?.trim() || "",
    subscriptionStatus: "active",
    createdAt: new Date().toISOString(),
    onboardingCompleted: true,
    role: "employe",
    employeId: employe.id,
    companyId,
    employeeLogin: employe.identifiant?.trim() || undefined,
  };
}

export function applyEmployeeBootstrap(bootstrap: EmployeeLoginBootstrap): AppData {
  const companyId = bootstrap.companyId;
  // Ne jamais fusionner avec les données d'un autre compte (legacy global).
  const base = emptyAppData({
    entreprise: bootstrap.parametres.entreprise,
    theme: bootstrap.parametres.theme,
  });
  const merged: AppData = {
    ...base,
    parametres: normalizeParametres({
      ...base.parametres,
      entreprise: bootstrap.parametres.entreprise ?? base.parametres.entreprise,
      theme: bootstrap.parametres.theme ?? base.parametres.theme,
    }),
    employes: bootstrap.employes.length > 0 ? bootstrap.employes : [],
    planning: Array.isArray(bootstrap.planning) ? bootstrap.planning : [],
    chantiers: Array.isArray(bootstrap.chantiers) ? bootstrap.chantiers : [],
    affectations: Array.isArray(bootstrap.affectations)
      ? bootstrap.affectations
      : [],
    clients: Array.isArray(bootstrap.clients) ? bootstrap.clients : [],
  };
  writeCompanyAppData(companyId, merged);
  return merged;
}

export async function fetchEmployeeSession(): Promise<{
  ok: boolean;
  account?: UserAccount;
  bootstrap?: EmployeeLoginBootstrap;
}> {
  try {
    const response = await fetch("/api/employee-auth/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      account?: UserAccount;
      bootstrap?: EmployeeLoginBootstrap;
      error?: string;
    };

    if (!response.ok || !payload.success || !payload.account || !payload.bootstrap) {
      return { ok: false };
    }

    applyEmployeeBootstrap(payload.bootstrap);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        ACCOUNT_STORAGE_KEY,
        JSON.stringify(payload.account),
      );
    }

    return {
      ok: true,
      account: payload.account,
      bootstrap: payload.bootstrap,
    };
  } catch {
    return { ok: false };
  }
}

export async function authenticateEmployeLogin(
  identifier: string,
  password: string,
): Promise<{
  ok: boolean;
  message: string;
  employe?: Employe;
  account?: UserAccount;
  bootstrap?: EmployeeLoginBootstrap;
}> {
  try {
    const response = await fetch("/api/employee-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      account?: UserAccount;
      bootstrap?: EmployeeLoginBootstrap;
    };

    if (response.status === 403) {
      return {
        ok: false,
        message: payload.error ?? EMPLOYEE_DISABLED_ERROR,
      };
    }

    if (!response.ok || !payload.success || !payload.account || !payload.bootstrap) {
      return {
        ok: false,
        message: payload.error ?? EMPLOYEE_LOGIN_ERROR,
      };
    }

    applyEmployeeBootstrap(payload.bootstrap);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        ACCOUNT_STORAGE_KEY,
        JSON.stringify(payload.account),
      );
    }

    return {
      ok: true,
      message: "Connexion employé réussie.",
      employe: payload.bootstrap.employe,
      account: payload.account,
      bootstrap: payload.bootstrap,
    };
  } catch {
    return { ok: false, message: EMPLOYEE_LOGIN_ERROR };
  }
}

/** Supprime le cookie session employé + compte local employé. */
export async function logoutEmploye(): Promise<void> {
  const maybeHasCookie =
    typeof document !== "undefined" &&
    document.cookie.includes("batimum_employee_session=");

  if (maybeHasCookie || typeof document === "undefined") {
    try {
      await fetch("/api/employee-auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* best-effort */
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (raw) {
        const account = JSON.parse(raw) as UserAccount;
        if (account?.role === "employe") {
          localStorage.removeItem(ACCOUNT_STORAGE_KEY);
        }
      }
    } catch {
      /* ignore */
    }
  }
}

/** Avant connexion dirigeant : ferme toute session employé active. */
export async function clearEmployeeSessionForDirectorLogin(): Promise<void> {
  await logoutEmploye();
}

/** Avant connexion employé : ferme toute session Supabase dirigeant. */
export async function clearDirectorSessionForEmployeeLogin(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (raw) {
        const account = JSON.parse(raw) as UserAccount;
        if (!account?.role || account.role !== "employe") {
          localStorage.removeItem(ACCOUNT_STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    }
  }

  try {
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch {
    /* best-effort */
  }
}

export function normalizeEmployeRecord(employe: Employe): Employe {
  const typesChantiersMaitrises = Array.isArray(employe.typesChantiersMaitrises)
    ? [...new Set(employe.typesChantiersMaitrises)]
    : undefined;

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
    specialitePrincipale: employe.specialitePrincipale?.trim() || undefined,
    coutHoraireInterne:
      typeof employe.coutHoraireInterne === "number" && employe.coutHoraireInterne > 0
        ? employe.coutHoraireInterne
        : undefined,
    typesChantiersMaitrises:
      typesChantiersMaitrises && typesChantiersMaitrises.length > 0
        ? typesChantiersMaitrises
        : undefined,
  };
}

export function getRoleFromCredentials(
  credentials: { role?: AppRole } | null,
): AppRole {
  return credentials?.role === "employe" ? "employe" : "admin";
}

/** Indique si l'identifiant correspond à un employé local (redirection page connexion dirigeant). */
export function isEmployeLoginIdentifier(identifier: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Parcourt les caches scoped company (jamais le blob global legacy).
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith("btp-gestion-data:")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw) as AppData;
      if (findEmployeByLogin(data, identifier)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function fetchEmployeAccessStatus(employeId: string): Promise<{
  configured: boolean;
  login: string | null;
  active?: boolean;
}> {
  try {
    const response = await fetch(
      `/api/employee-credentials?employeId=${encodeURIComponent(employeId)}`,
      await buildAuthenticatedFetchInit(),
    );
    if (!response.ok) {
      return { configured: false, login: null };
    }
    const body = (await response.json()) as {
      configured?: boolean;
      login?: string | null;
      active?: boolean;
    };
    return {
      configured: Boolean(body.configured),
      login: body.login ?? null,
      active: body.active,
    };
  } catch {
    return { configured: false, login: null };
  }
}
