import { canAccessApp, getAccount, isLegacyAppUser } from "@/lib/account";
import { syncParametresForSave } from "@/lib/parametres";
import { getSupabaseSession } from "@/lib/supabase-auth";
import { saveUserSettings } from "@/lib/user-settings-client";
import type { Employe, Parametres } from "@/lib/types";

export type ParametresSaveResult = {
  ok: boolean;
  error?: string;
  /** Sauvegarde locale uniquement (session cloud indisponible). */
  localOnly?: boolean;
  parametres?: Parametres;
};

function canSaveParametresLocally(): boolean {
  if (typeof window === "undefined") return false;
  return isLegacyAppUser() || canAccessApp(getAccount());
}

/**
 * Sauvegarde globale des paramètres (toutes sections) :
 * cloud Supabase si session valide, sinon repli local pour les utilisateurs connectés à l'app.
 */
export async function saveParametresGlobally(payload: {
  parametres: Parametres;
  employes: Employe[];
}): Promise<ParametresSaveResult> {
  const synced = syncParametresForSave(payload.parametres);

  await getSupabaseSession();

  const result = await saveUserSettings({
    parametres: synced,
    employes: payload.employes,
  });

  if (result.ok) {
    return {
      ok: true,
      parametres: synced,
      localOnly: result.localOnly,
    };
  }

  if (result.sessionExpired && canSaveParametresLocally()) {
    return {
      ok: true,
      parametres: synced,
      localOnly: true,
    };
  }

  return {
    ok: false,
    error: result.error ?? "Impossible d'enregistrer les paramètres.",
  };
}
