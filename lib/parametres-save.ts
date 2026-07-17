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
  console.log("[SAVE SETTINGS] méthode utilisée", "saveParametresGlobally");
  console.log("[SAVE SETTINGS] payload envoyé", {
    parametresKeys: Object.keys(synced).length,
    employesCount: payload.employes.length,
  });

  await getSupabaseSession();

  const result = await saveUserSettings({
    parametres: synced,
    employes: payload.employes,
  });
  console.log("[SAVE SETTINGS] réponse API/store", result);

  if (result.ok) {
    return {
      ok: true,
      parametres: synced,
      localOnly: false,
    };
  }

  // Pas de fallback silencieux pour les comptes Supabase Auth.
  const account = getAccount();
  if (account?.supabaseUserId) {
    return {
      ok: false,
      error: result.error ?? "Impossible d'enregistrer les paramètres sur Supabase.",
    };
  }

  if (result.sessionExpired && canSaveParametresLocally()) {
    return {
      ok: true,
      parametres: synced,
      localOnly: true,
    };
  }

  if (
    canSaveParametresLocally() &&
    !account?.supabaseUserId &&
    (result.permissionDenied ||
      result.networkError ||
      /permission denied|réessayez|impossible d'enregistrer/i.test(
        result.error ?? "",
      ))
  ) {
    console.warn(
      "[SAVE SETTINGS] fallback local activé (compte legacy sans Supabase)",
      result,
    );
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
