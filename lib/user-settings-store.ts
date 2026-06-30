import { cookies } from "next/headers";
import {
  GmailDbError,
  logGmailDbSupabaseError,
  SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE,
} from "@/lib/gmail-oauth-config";
import { normalizeParametres } from "@/lib/parametres";
import type { Employe, Parametres } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const USER_SETTINGS_TABLE = "user_settings";

export type UserSettingsPayload = {
  parametres: Parametres;
  employes: Employe[];
};

type UserSettingsRow = {
  user_id: string;
  parametres: Parametres | null;
  employes: Employe[] | null;
  updated_at: string;
};

async function getSupabaseForUserSettingsRead() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return createAdminClient();
  }
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

async function getSupabaseForUserSettingsWrite() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { supabase: createAdminClient(), mode: "service" as const };
  }
  const cookieStore = await cookies();
  return { supabase: createClient(cookieStore), mode: "session" as const };
}

export function formatUserSettingsError(error: {
  message: string;
  code?: string;
}): string {
  if (error.code === "42P01") {
    return "Table user_settings absente dans Supabase. Exécutez la migration 20250611100000_user_settings.sql.";
  }
  if (error.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    return `${error.message} (ou connectez-vous via Supabase pour enregistrer avec votre session).`;
  }
  if (error.code === "42501" || /permission denied|row-level security/i.test(error.message)) {
    return "Permission refusée sur user_settings. Vérifiez les policies RLS Supabase.";
  }
  return `Enregistrement impossible : ${error.message}`;
}

export async function loadUserSettingsFromSupabase(
  userId: string,
): Promise<{
  settings: UserSettingsPayload | null;
  error: { message: string; code?: string } | null;
}> {
  const supabase = await getSupabaseForUserSettingsRead();
  if (!supabase) {
    return {
      settings: null,
      error: { message: "Client Supabase indisponible." },
    };
  }

  const { data, error } = await supabase
    .from(USER_SETTINGS_TABLE)
    .select("parametres, employes, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logGmailDbSupabaseError(error);
    return {
      settings: null,
      error: {
        message: new GmailDbError(error).message,
        code: error.code,
      },
    };
  }

  if (!data) {
    return { settings: null, error: null };
  }

  const row = data as Pick<UserSettingsRow, "parametres" | "employes">;
  return {
    settings: {
      parametres: normalizeParametres(row.parametres ?? {}),
      employes: Array.isArray(row.employes) ? row.employes : [],
    },
    error: null,
  };
}

export async function saveUserSettingsToSupabase(
  userId: string,
  payload: UserSettingsPayload,
): Promise<{ error: { message: string; code?: string } | null }> {
  const { supabase, mode } = await getSupabaseForUserSettingsWrite();
  if (!supabase) {
    return {
      error: {
        message:
          mode === "service"
            ? SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE
            : "Client Supabase indisponible. Vérifiez NEXT_PUBLIC_SUPABASE_URL et la clé anon.",
      },
    };
  }

  const { connexionEmail: _ignored, ...parametresForStorage } = payload.parametres;

  const row = {
    user_id: userId,
    parametres: normalizeParametres(parametresForStorage),
    employes: payload.employes,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from(USER_SETTINGS_TABLE)
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    logGmailDbSupabaseError(error);
    console.error("[user-settings] save failed", { mode, code: error.code });
    return {
      error: {
        message: new GmailDbError(error).message,
        code: error.code,
      },
    };
  }

  console.log("[user-settings] save ok", { userId, mode });
  return { error: null };
}
