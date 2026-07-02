import { canAccessApp, getAccount, isLegacyAppUser } from "@/lib/account";
import {
  getSupabaseSession,
  isSupabaseAuthenticatedAccount,
} from "@/lib/supabase-auth";
import type { Employe, Parametres } from "@/lib/types";

export type UserSettingsResponse = {
  parametres: Parametres | null;
  employes: Employe[] | null;
  error?: string;
  unauthorized?: boolean;
};

export type UserSettingsSaveResult = {
  ok: boolean;
  error?: string;
  localOnly?: boolean;
  sessionExpired?: boolean;
};

function resolveUnauthorizedSaveError(): string {
  const account = getAccount();
  if (isLegacyAppUser() || canAccessApp(account)) {
    return "";
  }
  if (isSupabaseAuthenticatedAccount(account)) {
    return "Votre session a expiré. Reconnectez-vous pour synchroniser vos paramètres.";
  }
  return "Votre session a expiré. Reconnectez-vous.";
}

export async function fetchUserSettings(): Promise<UserSettingsResponse> {
  try {
    await getSupabaseSession();

    const response = await fetch("/api/settings", {
      cache: "no-store",
      credentials: "same-origin",
    });

    if (response.status === 401) {
      return { parametres: null, employes: null, unauthorized: true };
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return {
        parametres: null,
        employes: null,
        error: body.error ?? "Impossible de charger les paramètres.",
      };
    }

    return (await response.json()) as UserSettingsResponse;
  } catch {
    return {
      parametres: null,
      employes: null,
      error: "Impossible de charger les paramètres.",
    };
  }
}

export async function saveUserSettings(payload: {
  parametres: Parametres;
  employes: Employe[];
}): Promise<UserSettingsSaveResult> {
  try {
    await getSupabaseSession();

    const response = await fetch("/api/settings", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      const canUseLocalFallback =
        typeof window !== "undefined" &&
        (isLegacyAppUser() || canAccessApp(getAccount()));

      if (canUseLocalFallback) {
        return { ok: true, localOnly: true, sessionExpired: true };
      }

      const message = resolveUnauthorizedSaveError();
      return {
        ok: false,
        sessionExpired: true,
        error: message || "Votre session a expiré. Reconnectez-vous.",
      };
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      const apiError = body.error ?? "";
      if (/non authentifi/i.test(apiError)) {
        return {
          ok: false,
          sessionExpired: true,
          error: resolveUnauthorizedSaveError() || "Votre session a expiré. Reconnectez-vous.",
        };
      }
      return {
        ok: false,
        error: apiError || "Impossible d'enregistrer les paramètres",
      };
    }

    return { ok: true };
  } catch {
    if (typeof window !== "undefined" && (isLegacyAppUser() || canAccessApp(getAccount()))) {
      return { ok: true, localOnly: true };
    }
    return { ok: false, error: "Impossible d'enregistrer les paramètres" };
  }
}
