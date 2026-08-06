import "@/lib/stripe-tls-dev";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getSupabaseUrl,
} from "@/lib/gmail-oauth-config";
import {
  appDataToWorkspace,
  emptyWorkspacePayload,
} from "@/lib/user-settings-types";
import { freshCompanyParametres } from "@/lib/parametres";
import { USER_SETTINGS_TABLE } from "@/lib/user-settings-store";
import type { Parametres } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export type ProvisionDirectorInput = {
  email: string;
  password: string;
  entreprise?: string;
  utilisateur?: string;
  telephone?: string;
  siret?: string;
  parametres?: Partial<Parametres>;
};

export type ProvisionDirectorResult =
  | {
      ok: true;
      userId: string;
      created: boolean;
      email: string;
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) return null;

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as { users?: User[]; user?: User };
  if (payload.user?.id) return payload.user;
  const match = payload.users?.find(
    (item) => (item.email || "").toLowerCase() === email,
  );
  return match ?? null;
}

async function ensureCompanyWorkspace(
  userId: string,
  email: string,
  input: ProvisionDirectorInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Configuration Supabase admin manquante." };
  }

  const existing = await admin
    .from(USER_SETTINGS_TABLE)
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.data) {
    return { ok: true };
  }

  const parametres = freshCompanyParametres({
    ...input.parametres,
    entreprise: input.entreprise?.trim() || input.parametres?.entreprise || "",
    utilisateur:
      input.utilisateur?.trim() || input.parametres?.utilisateur || "",
    email,
    telephone: input.telephone?.trim() || input.parametres?.telephone || "",
    siret: input.siret?.replace(/\D/g, "") || input.parametres?.siret || "",
  });

  const workspace = appDataToWorkspace({
    ...emptyWorkspacePayload(),
    parametres,
  });

  const withWorkspace = await admin.from(USER_SETTINGS_TABLE).insert({
    user_id: userId,
    parametres,
    employes: [],
    workspace,
    updated_at: new Date().toISOString(),
  });

  if (!withWorkspace.error) {
    return { ok: true };
  }

  const withoutWorkspace = await admin.from(USER_SETTINGS_TABLE).insert({
    user_id: userId,
    parametres,
    employes: [],
    updated_at: new Date().toISOString(),
  });

  if (withoutWorkspace.error) {
    return { ok: false, error: withoutWorkspace.error.message };
  }

  return { ok: true };
}

/**
 * Crée (ou retrouve) un utilisateur Supabase Auth dirigeant + workspace
 * isolé `user_settings.user_id = user.id` avec numérotation par défaut.
 */
export async function provisionDirectorAccount(
  input: ProvisionDirectorInput,
): Promise<ProvisionDirectorResult> {
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Email invalide.", code: "invalid_email" };
  }
  if (!password || password.length < 8) {
    return {
      ok: false,
      error: "Le mot de passe doit contenir au moins 8 caractères.",
      code: "invalid_password",
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "Configuration Supabase admin manquante.",
      code: "supabase_admin",
    };
  }

  const metadata = {
    entreprise: input.entreprise?.trim() || "",
    utilisateur: input.utilisateur?.trim() || "",
    telephone: input.telephone?.trim() || "",
    siret: input.siret?.replace(/\D/g, "") || "",
  };

  let user = await findAuthUserByEmail(email);
  let created = false;

  if (!user) {
    const createdUser = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (createdUser.error || !createdUser.data.user) {
      // Course possible : l'utilisateur a été créé entre-temps.
      user = await findAuthUserByEmail(email);
      if (!user) {
        return {
          ok: false,
          error: createdUser.error?.message ?? "Création utilisateur impossible.",
          code: "create_user",
        };
      }
    } else {
      user = createdUser.data.user;
      created = true;
    }
  }

  if (!created) {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        ...metadata,
      },
    });
    if (updated.error || !updated.data.user) {
      return {
        ok: false,
        error: updated.error?.message ?? "Mise à jour utilisateur impossible.",
        code: "update_user",
      };
    }
    user = updated.data.user;
  }

  const workspace = await ensureCompanyWorkspace(user.id, email, input);
  if (!workspace.ok) {
    return { ok: false, error: workspace.error, code: "workspace_init" };
  }

  return { ok: true, userId: user.id, created, email };
}
