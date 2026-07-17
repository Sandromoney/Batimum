import type { UserAccount } from "@/lib/account";
import { employeDisplayLabel } from "@/lib/employee-access";
import type { EmployeeLoginBootstrap } from "@/lib/employee-access";
import {
  getEmployeeAccountForEmploye,
  type EmployeeAccountRow,
} from "@/lib/employee-accounts-store";
import { normalizeParametres } from "@/lib/parametres";
import { loadUserSettingsForCompanyAdmin } from "@/lib/user-settings-store";
import type { Employe } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { USER_SETTINGS_TABLE } from "@/lib/user-settings-store";

export type EmployeeAuthBootstrapResult = {
  account: UserAccount;
  bootstrap: EmployeeLoginBootstrap;
};

function synthesizeEmployeFromAccount(row: EmployeeAccountRow): Employe {
  return {
    id: row.employe_id,
    prenom: row.employee_login,
    nom: "",
    identifiant: row.employee_login,
    statut: "actif",
  };
}

export async function isEmployeeProfileDisabled(
  row: EmployeeAccountRow,
): Promise<boolean> {
  if (!row.employee_account_active) return true;

  const supabase = createAdminClient();
  if (!supabase) return true;

  const { data: settingsRow } = await supabase
    .from(USER_SETTINGS_TABLE)
    .select("employes")
    .eq("user_id", row.company_id)
    .maybeSingle();

  if (!settingsRow) return false;

  const employes = Array.isArray(settingsRow.employes)
    ? (settingsRow.employes as Employe[])
    : [];
  const employe = employes.find((item) => item.id === row.employe_id);
  if (!employe) return false;
  return (employe.statut ?? "actif") === "desactive";
}

export async function buildEmployeeAuthBootstrap(
  row: EmployeeAccountRow,
): Promise<EmployeeAuthBootstrapResult | null> {
  const settings = await loadUserSettingsForCompanyAdmin(row.company_id);
  const employes = settings?.employes ?? [];
  const employe =
    employes.find((item) => item.id === row.employe_id) ??
    synthesizeEmployeFromAccount(row);
  if ((employe.statut ?? "actif") === "desactive") return null;

  const parametres = normalizeParametres(settings?.parametres ?? {});
  const workspace = settings?.workspace;
  const operational = settings?.operational;

  return {
    account: {
      entreprise: parametres.entreprise || "Entreprise",
      utilisateur: employeDisplayLabel(employe),
      email: row.employee_login,
      telephone: employe.telephone?.trim() || "",
      subscriptionStatus: "active",
      createdAt: new Date().toISOString(),
      onboardingCompleted: true,
      role: "employe",
      employeId: employe.id,
      companyId: row.company_id,
      employeeLogin: row.employee_login,
    },
    bootstrap: {
      companyId: row.company_id,
      employe,
      parametres: {
        entreprise: parametres.entreprise,
        theme: parametres.theme,
      },
      employes: employes.length > 0 ? employes : [employe],
      planning: workspace?.planning ?? operational?.planning,
      chantiers: workspace?.chantiers ?? operational?.chantiers,
      affectations: workspace?.affectations ?? operational?.affectations,
      clients: workspace?.clients ?? operational?.clients,
    },
  };
}

export async function loadValidatedEmployeeAccount(
  companyId: string,
  employeId: string,
  login?: string,
): Promise<EmployeeAccountRow | null> {
  const account = await getEmployeeAccountForEmploye(companyId, employeId);
  if (!account || !account.employee_account_active) return null;
  if (
    login &&
    account.employee_login.trim().toLowerCase() !== login.trim().toLowerCase()
  ) {
    return null;
  }
  return account;
}
