import type { Employe, Parametres } from "@/lib/types";

export type UserSettingsResponse = {
  parametres: Parametres | null;
  employes: Employe[] | null;
  error?: string;
  unauthorized?: boolean;
};

export async function fetchUserSettings(): Promise<UserSettingsResponse> {
  try {
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
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch("/api/settings", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return {
        ok: false,
        error: body.error ?? "Impossible d'enregistrer les paramètres",
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer les paramètres" };
  }
}
