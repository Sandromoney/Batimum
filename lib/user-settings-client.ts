import { getAccount } from "@/lib/account";
import { buildAuthenticatedFetchInit } from "@/lib/authenticated-api-fetch";
import { logSettingsClientAuthDebug } from "@/lib/settings-client-auth";
import type { AppData, Employe, Parametres } from "@/lib/types";
import type {
  CompanyWorkspacePayload,
  UserSettingsOperationalPayload,
} from "@/lib/user-settings-types";

export type UserSettingsResponse = {
  parametres: Parametres | null;
  employes: Employe[] | null;
  operational?: UserSettingsOperationalPayload | null;
  workspace?: CompanyWorkspacePayload | null;
  missingColumns?: boolean;
  error?: string;
  unauthorized?: boolean;
};

export type UserSettingsSaveResult = {
  ok: boolean;
  error?: string;
  sessionExpired?: boolean;
  permissionDenied?: boolean;
  networkError?: boolean;
  missingColumns?: boolean;
};

const SESSION_EXPIRED_MESSAGE =
  "Impossible d'enregistrer les paramètres. Veuillez vous reconnecter.";

export async function fetchUserSettings(): Promise<UserSettingsResponse> {
  const url = "/api/settings";
  try {
    await logSettingsClientAuthDebug(url);
    const response = await fetch(
      url,
      await buildAuthenticatedFetchInit({ cache: "no-store" }),
    );

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
  operational?: UserSettingsOperationalPayload;
  workspace?: Partial<CompanyWorkspacePayload>;
  appData?: AppData;
  localImportCompletedAt?: string | null;
}): Promise<UserSettingsSaveResult> {
  const url = "/api/settings";
  try {
    await logSettingsClientAuthDebug(url, payload);
    const response = await fetch(
      url,
      await buildAuthenticatedFetchInit({
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    );

    if (response.status === 401) {
      return {
        ok: false,
        sessionExpired: true,
        error: SESSION_EXPIRED_MESSAGE,
      };
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        missingColumns?: boolean;
      };
      console.error("[workspace-save] failed", {
        status: response.status,
        code: body.code,
        error: body.error,
        userId: getAccount()?.supabaseUserId,
      });
      return {
        ok: false,
        permissionDenied: response.status === 403 || response.status === 500,
        missingColumns: Boolean(body.missingColumns) || body.code === "PGRST204",
        error: body.error || "Impossible d'enregistrer les données.",
      };
    }

    const body = (await response.json().catch(() => ({}))) as {
      missingColumns?: boolean;
    };
    return { ok: true, missingColumns: Boolean(body.missingColumns) };
  } catch (error) {
    console.error("[workspace-save] network error", error);
    return {
      ok: false,
      networkError: true,
      error: "Impossible d'enregistrer les données (réseau).",
    };
  }
}
