import type { SupabaseClient } from "@supabase/supabase-js";

import {
  GmailDbError,
  logGmailDbSupabaseError,
  SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE,
} from "@/lib/gmail-oauth-config";
import {
  hashEmployeePassword,
  verifyEmployeePassword,
} from "@/lib/employee-password";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase-auth-server";
import { createAdminClient } from "@/utils/supabase/admin";

export const EMPLOYEE_ACCOUNTS_TABLE = "employee_accounts";

export type EmployeeAccountRow = {
  id: string;
  company_id: string;
  employe_id: string;
  employee_login: string;
  employee_password_hash: string;
  employee_account_active: boolean;
  created_at: string;
  updated_at: string;
};

const DUPLICATE_LOGIN_ERROR =
  "Cet identifiant est déjà utilisé. Veuillez en choisir un autre.";

export function normalizeEmployeeLogin(value: string): string {
  return value.trim().toLowerCase();
}

function mapRow(row: unknown): EmployeeAccountRow | null {
  if (!row || typeof row !== "object") return null;
  const item = row as EmployeeAccountRow;
  if (!item.company_id || !item.employe_id || !item.employee_login) return null;
  return item;
}

async function getStoreClient(
  request?: Request,
): Promise<SupabaseClient | null> {
  if (request) {
    const authClient = await createAuthenticatedSupabaseClient(request);
    if (authClient) return authClient;
  }
  return createAdminClient();
}

export async function findEmployeeAccountsByLogin(
  login: string,
  request?: Request,
): Promise<EmployeeAccountRow[]> {
  const normalized = normalizeEmployeeLogin(login);
  if (!normalized) return [];

  const supabase = await getStoreClient(request);
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("employee_account_find_by_login", {
    p_login: normalized,
  });

  if (!error) {
    const rows: unknown[] = Array.isArray(data) ? data : [];
    return rows
      .map((row) => mapRow(row))
      .filter((row): row is EmployeeAccountRow => Boolean(row));
  }

  if (error.code !== "PGRST202") {
    logGmailDbSupabaseError(error);
  }

  const fallback = await supabase
    .from(EMPLOYEE_ACCOUNTS_TABLE)
    .select("*")
    .ilike("employee_login", normalized);

  if (fallback.error) {
    logGmailDbSupabaseError(fallback.error);
    return [];
  }

  return (fallback.data ?? [])
    .map((row) => mapRow(row))
    .filter((row): row is EmployeeAccountRow => Boolean(row));
}

export async function getEmployeeAccountForEmploye(
  companyId: string,
  employeId: string,
  request?: Request,
): Promise<EmployeeAccountRow | null> {
  const supabase = await getStoreClient(request);
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("employee_account_get", {
    p_company_id: companyId,
    p_employe_id: employeId,
  });

  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    return mapRow(row);
  }

  if (error.code !== "PGRST202") {
    logGmailDbSupabaseError(error);
  }

  const fallback = await supabase
    .from(EMPLOYEE_ACCOUNTS_TABLE)
    .select("*")
    .eq("company_id", companyId)
    .eq("employe_id", employeId)
    .maybeSingle();

  if (fallback.error) {
    logGmailDbSupabaseError(fallback.error);
    return null;
  }

  return mapRow(fallback.data);
}

export async function isEmployeeLoginTakenGlobally(
  login: string,
  excludeCompanyId?: string,
  excludeEmployeId?: string,
  request?: Request,
): Promise<boolean> {
  const normalized = normalizeEmployeeLogin(login);
  if (!normalized) return false;

  const supabase = await getStoreClient(request);
  if (!supabase) return false;

  const { data, error } = await supabase.rpc("employee_account_login_taken", {
    p_login: normalized,
    p_exclude_company_id: excludeCompanyId ?? null,
    p_exclude_employe_id: excludeEmployeId ?? null,
  });

  if (!error) {
    return Boolean(data);
  }

  if (error.code !== "PGRST202") {
    logGmailDbSupabaseError(error);
  }

  const rows = await findEmployeeAccountsByLogin(normalized, request);
  return rows.some(
    (row) =>
      !(
        excludeCompanyId &&
        excludeEmployeId &&
        row.company_id === excludeCompanyId &&
        row.employe_id === excludeEmployeId
      ),
  );
}

export async function upsertEmployeeAccount(
  params: {
    companyId: string;
    employeId: string;
    login: string;
    password?: string;
    active?: boolean;
  },
  request?: Request,
): Promise<{ ok: boolean; error?: string }> {
  const login = normalizeEmployeeLogin(params.login);
  if (!login) {
    return { ok: false, error: "Identifiant requis." };
  }

  const existing = await getEmployeeAccountForEmploye(
    params.companyId,
    params.employeId,
    request,
  );

  const passwordInput = params.password?.trim() ?? "";
  if (!existing && passwordInput.length < 6) {
    return {
      ok: false,
      error: "Le mot de passe doit contenir au moins 6 caractères.",
    };
  }
  if (existing && passwordInput.length > 0 && passwordInput.length < 6) {
    return {
      ok: false,
      error: "Le mot de passe doit contenir au moins 6 caractères.",
    };
  }

  const taken = await isEmployeeLoginTakenGlobally(
    login,
    params.companyId,
    params.employeId,
    request,
  );
  if (taken) {
    return { ok: false, error: DUPLICATE_LOGIN_ERROR };
  }

  const supabase = await getStoreClient(request);
  if (!supabase) {
    return { ok: false, error: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE };
  }

  const passwordHash =
    passwordInput.length >= 6
      ? hashEmployeePassword(passwordInput)
      : existing?.employee_password_hash;
  if (!passwordHash) {
    return {
      ok: false,
      error: "Le mot de passe doit contenir au moins 6 caractères.",
    };
  }

  const active = params.active !== false;

  const { error } = await supabase.rpc("employee_account_upsert", {
    p_company_id: params.companyId,
    p_employe_id: params.employeId,
    p_login: login,
    p_password_hash: passwordHash,
    p_active: active,
  });

  if (!error) {
    return { ok: true };
  }

  if (error.code === "PGRST202") {
    const now = new Date().toISOString();
    const fallback = await supabase.from(EMPLOYEE_ACCOUNTS_TABLE).upsert(
      {
        company_id: params.companyId,
        employe_id: params.employeId,
        employee_login: login,
        employee_password_hash: passwordHash,
        employee_account_active: active,
        updated_at: now,
      },
      { onConflict: "company_id,employe_id" },
    );
    if (fallback.error) {
      logGmailDbSupabaseError(fallback.error);
      if (fallback.error.code === "23505") {
        return { ok: false, error: DUPLICATE_LOGIN_ERROR };
      }
      return { ok: false, error: new GmailDbError(fallback.error).message };
    }
    return { ok: true };
  }

  logGmailDbSupabaseError(error);
  if (error.code === "23505") {
    return { ok: false, error: DUPLICATE_LOGIN_ERROR };
  }
  return { ok: false, error: new GmailDbError(error).message };
}

export async function deleteEmployeeAccount(
  companyId: string,
  employeId: string,
  request?: Request,
): Promise<void> {
  const supabase = await getStoreClient(request);
  if (!supabase) return;

  const { error } = await supabase.rpc("employee_account_delete", {
    p_company_id: companyId,
    p_employe_id: employeId,
  });

  if (!error || error.code === "PGRST202") {
    if (!error) return;
    await supabase
      .from(EMPLOYEE_ACCOUNTS_TABLE)
      .delete()
      .eq("company_id", companyId)
      .eq("employe_id", employeId);
    return;
  }

  logGmailDbSupabaseError(error);
}

export async function setEmployeeAccountActive(
  companyId: string,
  employeId: string,
  active: boolean,
  request?: Request,
): Promise<void> {
  const supabase = await getStoreClient(request);
  if (!supabase) return;

  const { error } = await supabase.rpc("employee_account_set_active", {
    p_company_id: companyId,
    p_employe_id: employeId,
    p_active: active,
  });

  if (!error || error.code === "PGRST202") {
    if (!error) return;
    await supabase
      .from(EMPLOYEE_ACCOUNTS_TABLE)
      .update({
        employee_account_active: active,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("employe_id", employeId);
    return;
  }

  logGmailDbSupabaseError(error);
}

export type EmployeeAuthStatus = "ok" | "invalid" | "disabled";

export async function authenticateEmployeeAccount(
  login: string,
  password: string,
): Promise<{
  status: EmployeeAuthStatus;
  account?: EmployeeAccountRow;
}> {
  const rows = await findEmployeeAccountsByLogin(login);
  if (rows.length === 0) {
    return { status: "invalid" };
  }

  const row = rows[0];
  if (!row.employee_account_active) {
    return { status: "disabled" };
  }

  if (!verifyEmployeePassword(password, row.employee_password_hash)) {
    return { status: "invalid" };
  }

  return { status: "ok", account: row };
}
