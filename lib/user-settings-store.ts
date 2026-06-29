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
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      error: { message: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE },
    };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      error: { message: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE },
    };
  }

  const { connexionEmail: _ignored, ...parametresForStorage } = payload.parametres;

  const { error } = await supabase.from(USER_SETTINGS_TABLE).upsert(
    {
      user_id: userId,
      parametres: normalizeParametres(parametresForStorage),
      employes: payload.employes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    logGmailDbSupabaseError(error);
    return {
      error: {
        message: new GmailDbError(error).message,
        code: error.code,
      },
    };
  }

  return { error: null };
}
