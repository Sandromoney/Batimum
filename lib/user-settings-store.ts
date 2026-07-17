import {
  logGmailDbSupabaseError,
  type GmailDbSupabaseError,
} from "@/lib/gmail-oauth-config";
import { resolveSettingsAuthContext } from "@/lib/supabase-auth-server";
import {
  emptyOperationalPayload,
  emptyWorkspacePayload,
  normalizeOperationalPayload,
  normalizeWorkspacePayload,
  rowToWorkspace,
  WORKSPACE_SELECT_COLUMNS,
  workspaceToDbWrite,
  type CompanyWorkspacePayload,
  type UserSettingsOperationalPayload,
  type UserSettingsPayload,
} from "@/lib/user-settings-types";
import { createAdminClient } from "@/utils/supabase/admin";

export const USER_SETTINGS_TABLE = "user_settings";
export type {
  CompanyWorkspacePayload,
  UserSettingsOperationalPayload,
  UserSettingsPayload,
} from "@/lib/user-settings-types";

function mapUserSettingsDbError(error: GmailDbSupabaseError): {
  message: string;
  code?: string;
} {
  logGmailDbSupabaseError(error, "user-settings");
  return {
    message: error.message ?? "Erreur base de données",
    code: error.code,
  };
}

export function formatUserSettingsError(
  error: {
    message: string;
    code?: string;
  },
  options: { hasSession?: boolean } = {},
): string {
  const hasSession = options.hasSession ?? false;
  console.error("[user-settings] formatted error", { ...error, hasSession });

  if (!hasSession) {
    return "Impossible d'enregistrer les paramètres. Veuillez vous reconnecter.";
  }

  if (error.code === "42P01") {
    return "Impossible d'enregistrer les paramètres pour le moment.";
  }
  if (
    error.code === "42501" ||
    /permission denied|row-level security/i.test(error.message)
  ) {
    return "Droits Supabase manquants sur user_settings. Exécutez scripts/APPLY_COMPANY_WORKSPACE.sql dans le SQL Editor Supabase, puis réessayez.";
  }
  if (/column|PGRST204|42703/i.test(error.message) || error.code === "PGRST204") {
    return "Schéma Supabase incomplet. Exécutez scripts/APPLY_COMPANY_WORKSPACE.sql puis réessayez.";
  }
  if (/session|jwt|expir|unauthorized/i.test(error.message)) {
    return "Impossible d'enregistrer les paramètres. Veuillez vous reconnecter.";
  }
  return "Impossible d'enregistrer les paramètres.";
}

/**
 * Client admin après auth JWT vérifiée.
 * Évite les 42501 GRANT manquants tout en conservant l'isolation (filtre user_id).
 */
function getWorkspaceAdminClient() {
  const supabase = createAdminClient();
  if (!supabase) {
    return null;
  }
  return supabase;
}

function mapLegacyRow(row: Record<string, unknown>): CompanyWorkspacePayload {
  const base = emptyWorkspacePayload();
  return normalizeWorkspacePayload({
    ...base,
    parametres: (row.parametres as CompanyWorkspacePayload["parametres"]) ?? base.parametres,
    employes: Array.isArray(row.employes) ? row.employes : [],
    planning: Array.isArray(row.planning) ? row.planning : [],
    chantiers: Array.isArray(row.chantiers) ? row.chantiers : [],
    affectations: Array.isArray(row.affectations) ? row.affectations : [],
    clients: Array.isArray(row.clients) ? row.clients : [],
  });
}

export async function loadCompanyWorkspace(
  companyId: string,
): Promise<{
  workspace: CompanyWorkspacePayload | null;
  error: { message: string; code?: string } | null;
  missingColumns?: boolean;
}> {
  const supabase = getWorkspaceAdminClient();
  if (!supabase) {
    return {
      workspace: null,
      error: { message: "Client Supabase admin indisponible.", code: "admin_missing" },
    };
  }

  const full = await supabase
    .from(USER_SETTINGS_TABLE)
    .select(WORKSPACE_SELECT_COLUMNS)
    .eq("user_id", companyId)
    .maybeSingle();

  if (
    full.error &&
    (full.error.code === "42703" ||
      full.error.code === "PGRST204" ||
      /column/i.test(full.error.message))
  ) {
    const legacy = await supabase
      .from(USER_SETTINGS_TABLE)
      .select(
        "parametres, employes, planning, chantiers, affectations, clients, updated_at",
      )
      .eq("user_id", companyId)
      .maybeSingle();

    if (
      legacy.error &&
      (legacy.error.code === "42703" ||
        legacy.error.code === "PGRST204" ||
        /column/i.test(legacy.error.message))
    ) {
      const minimal = await supabase
        .from(USER_SETTINGS_TABLE)
        .select("parametres, employes, updated_at")
        .eq("user_id", companyId)
        .maybeSingle();
      if (minimal.error) {
        return {
          workspace: null,
          error: mapUserSettingsDbError(minimal.error),
          missingColumns: true,
        };
      }
      if (!minimal.data) return { workspace: null, error: null, missingColumns: true };
      return {
        workspace: mapLegacyRow(minimal.data as Record<string, unknown>),
        error: null,
        missingColumns: true,
      };
    }

    if (legacy.error) {
      return {
        workspace: null,
        error: mapUserSettingsDbError(legacy.error),
        missingColumns: true,
      };
    }
    if (!legacy.data) return { workspace: null, error: null, missingColumns: true };
    return {
      workspace: mapLegacyRow(legacy.data as Record<string, unknown>),
      error: null,
      missingColumns: true,
    };
  }

  if (full.error) {
    return { workspace: null, error: mapUserSettingsDbError(full.error) };
  }
  if (!full.data) return { workspace: null, error: null };

  return {
    workspace: rowToWorkspace(full.data as unknown as Record<string, unknown>),
    error: null,
  };
}

export async function saveCompanyWorkspace(
  companyId: string,
  payload: CompanyWorkspacePayload,
): Promise<{ error: { message: string; code?: string } | null; missingColumns?: boolean }> {
  const supabase = getWorkspaceAdminClient();
  if (!supabase) {
    return {
      error: { message: "Client Supabase admin indisponible.", code: "admin_missing" },
    };
  }

  const write = workspaceToDbWrite(payload);
  const { data: existing, error: selectError } = await supabase
    .from(USER_SETTINGS_TABLE)
    .select("user_id")
    .eq("user_id", companyId)
    .maybeSingle();

  if (selectError) {
    return { error: mapUserSettingsDbError(selectError) };
  }

  let result = existing
    ? await supabase
        .from(USER_SETTINGS_TABLE)
        .update(write)
        .eq("user_id", companyId)
    : await supabase.from(USER_SETTINGS_TABLE).insert({
        user_id: companyId,
        ...write,
      });

  // Fallback progressif si colonnes métier absentes
  if (
    result.error &&
    (result.error.code === "42703" ||
      result.error.code === "PGRST204" ||
      /column/i.test(result.error.message))
  ) {
    const operationalWrite = {
      parametres: write.parametres,
      employes: write.employes,
      planning: write.planning,
      chantiers: write.chantiers,
      affectations: write.affectations,
      clients: write.clients,
      updated_at: write.updated_at,
    };
    result = existing
      ? await supabase
          .from(USER_SETTINGS_TABLE)
          .update(operationalWrite)
          .eq("user_id", companyId)
      : await supabase.from(USER_SETTINGS_TABLE).insert({
          user_id: companyId,
          ...operationalWrite,
        });

    if (
      result.error &&
      (result.error.code === "42703" ||
        result.error.code === "PGRST204" ||
        /column/i.test(result.error.message))
    ) {
      const minimalWrite = {
        parametres: write.parametres,
        employes: write.employes,
        updated_at: write.updated_at,
      };
      result = existing
        ? await supabase
            .from(USER_SETTINGS_TABLE)
            .update(minimalWrite)
            .eq("user_id", companyId)
        : await supabase.from(USER_SETTINGS_TABLE).insert({
            user_id: companyId,
            ...minimalWrite,
          });

      if (result.error) {
        return {
          error: mapUserSettingsDbError(result.error),
          missingColumns: true,
        };
      }
      return {
        error: {
          message:
            "Schéma Supabase incomplet (devis/factures absents). Exécutez scripts/APPLY_COMPANY_WORKSPACE.sql.",
          code: "PGRST204",
        },
        missingColumns: true,
      };
    }

    if (result.error) {
      return {
        error: mapUserSettingsDbError(result.error),
        missingColumns: true,
      };
    }
    return {
      error: {
        message:
          "Schéma Supabase incomplet (devis/factures absents). Exécutez scripts/APPLY_COMPANY_WORKSPACE.sql.",
        code: "PGRST204",
      },
      missingColumns: true,
    };
  }

  if (result.error) {
    return { error: mapUserSettingsDbError(result.error) };
  }

  return { error: null };
}

/** Compat : lecture settings (parametres + operational + workspace). */
export async function loadUserSettingsFromSupabase(
  userId: string,
  _request?: Request | null,
): Promise<{
  settings: UserSettingsPayload | null;
  error: { message: string; code?: string } | null;
}> {
  const { workspace, error } = await loadCompanyWorkspace(userId);
  if (error) return { settings: null, error };
  if (!workspace) return { settings: null, error: null };

  return {
    settings: {
      parametres: workspace.parametres,
      employes: workspace.employes,
      operational: {
        planning: workspace.planning,
        chantiers: workspace.chantiers,
        affectations: workspace.affectations,
        clients: workspace.clients,
      },
      workspace,
    },
    error: null,
  };
}

export async function loadUserSettingsForCompanyAdmin(
  companyId: string,
): Promise<UserSettingsPayload | null> {
  const { workspace, error } = await loadCompanyWorkspace(companyId);
  if (error || !workspace) return null;
  return {
    parametres: workspace.parametres,
    employes: workspace.employes,
    operational: {
      planning: workspace.planning,
      chantiers: workspace.chantiers,
      affectations: workspace.affectations,
      clients: workspace.clients,
    },
    workspace,
  };
}

export async function saveUserSettingsToSupabase(
  userId: string,
  payload: UserSettingsPayload,
  _request?: Request | null,
): Promise<{ error: { message: string; code?: string } | null }> {
  const existing = await loadCompanyWorkspace(userId);
  const base = existing.workspace ?? emptyWorkspacePayload();
  const operational = normalizeOperationalPayload(
    payload.operational ?? {
      planning: base.planning,
      chantiers: base.chantiers,
      affectations: base.affectations,
      clients: base.clients,
    },
  );

  const merged = normalizeWorkspacePayload({
    ...base,
    ...payload.workspace,
    parametres: payload.parametres,
    employes: payload.employes,
    planning: payload.workspace?.planning ?? operational.planning,
    chantiers: payload.workspace?.chantiers ?? operational.chantiers,
    affectations: payload.workspace?.affectations ?? operational.affectations,
    clients: payload.workspace?.clients ?? operational.clients,
  });

  const { error } = await saveCompanyWorkspace(userId, merged);
  return { error };
}

/** Vérifie que le request JWT correspond au companyId avant write admin. */
export async function assertWorkspaceOwner(
  request: Request,
  companyId: string,
): Promise<boolean> {
  const auth = await resolveSettingsAuthContext(request);
  return Boolean(auth && auth.user.id === companyId);
}
