import { NextResponse } from "next/server";

import {
  authenticateEmployeeAccount,
  deleteEmployeeAccount,
  getEmployeeAccountForEmploye,
  isEmployeeLoginTakenGlobally,
  setEmployeeAccountActive,
  upsertEmployeeAccount,
} from "@/lib/employee-accounts-store";
import {
  signEmployeeSession,
  verifyEmployeeSessionToken,
} from "@/lib/employee-session";
import type { Employe } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

function parseEmployes(value: unknown): Employe[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    .map((item) => {
      const id = typeof item.id === "string" ? item.id : "";
      return {
        id,
        prenom: typeof item.prenom === "string" ? item.prenom : "",
        nom: typeof item.nom === "string" ? item.nom : "",
        ...(typeof item.identifiant === "string"
          ? { identifiant: item.identifiant }
          : {}),
        ...(item.statut === "actif" || item.statut === "desactive"
          ? { statut: item.statut }
          : {}),
      } satisfies Employe;
    })
    .filter((item) => item.id.length > 0);
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Non disponible." }, { status: 404 });
  }

  const url = new URL(request.url);
  const keep = url.searchParams.get("keep") === "1";

  const results: { name: string; ok: boolean; detail?: string }[] = [];
  const log = (name: string, ok: boolean, detail = "") => {
    results.push({ name, ok, detail });
  };

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Admin client indisponible." });
  }

  const { data: settingsRows } = await supabase
    .from("user_settings")
    .select("user_id, employes")
    .limit(1);

  let companyId = settingsRows?.[0]?.user_id as string | undefined;
  const employes = parseEmployes(settingsRows?.[0]?.employes);

  if (!companyId) {
    const { data: usersData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    companyId = usersData.users[0]?.id;
  }

  if (!companyId) {
    return NextResponse.json({ ok: false, error: "Aucun compte dirigeant." });
  }

  const resolvedCompanyId: string = companyId;
  const suffix = Date.now().toString(36);
  const loginBase = `testemp_${suffix}`;
  const password = "secret123";
  const newPassword = "newsecret456";
  const employeId = `emp_test_${suffix}`;

  employes.push({
    id: employeId,
    prenom: "Test",
    nom: "Employe",
    identifiant: loginBase,
    statut: "actif",
  });

  const { error: settingsUpsertError } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: resolvedCompanyId,
        parametres: {},
        employes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (settingsUpsertError) {
    log(
      "0. Sync user_settings (optionnel)",
      true,
      `ignoré: ${settingsUpsertError.message}`,
    );
  }

  async function cleanup() {
    await deleteEmployeeAccount(resolvedCompanyId, employeId);
    const { data: row } = await supabase!
      .from("user_settings")
      .select("employes")
      .eq("user_id", resolvedCompanyId)
      .maybeSingle();
    if (row?.employes) {
      const filtered = parseEmployes(row.employes).filter(
        (e) => e.id !== employeId,
      );
      await supabase!
        .from("user_settings")
        .update({ employes: filtered, updated_at: new Date().toISOString() })
        .eq("user_id", resolvedCompanyId);
    }
    for (const id of [`emp_lucas_${suffix}`, `emp_lucas2_${suffix}`]) {
      await deleteEmployeeAccount(resolvedCompanyId, id);
    }
    await supabase!
      .from("employee_accounts")
      .delete()
      .ilike("employee_login", "lucas");
  }

  await cleanup();

  const createResult = await upsertEmployeeAccount({
    companyId: resolvedCompanyId,
    employeId,
    login: loginBase,
    password,
    active: true,
  });
  log(
    "1. Création compte employé",
    createResult.ok,
    createResult.error ?? loginBase,
  );

  const stored = await getEmployeeAccountForEmploye(
    resolvedCompanyId,
    employeId,
  );
  log(
    "2. Mot de passe hashé (scrypt:)",
    Boolean(stored?.employee_password_hash?.startsWith("scrypt:")),
    stored?.employee_password_hash?.slice(0, 24) ?? "absent",
  );

  const authOk = await authenticateEmployeeAccount(loginBase, password);
  log(
    "3. Connexion identifiant + mot de passe",
    authOk.status === "ok",
    authOk.status,
  );

  const authBad = await authenticateEmployeeAccount(loginBase, "wrongpass");
  log(
    "4. Mauvais mot de passe refusé",
    authBad.status === "invalid",
    authBad.status,
  );

  const authUnknown = await authenticateEmployeeAccount(
    `unknown_${suffix}`,
    "x",
  );
  log(
    "5. Identifiant inconnu refusé",
    authUnknown.status === "invalid",
    authUnknown.status,
  );

  await upsertEmployeeAccount({
    companyId: resolvedCompanyId,
    employeId: `emp_lucas_${suffix}`,
    login: "lucas",
    password: "lucaspass1",
    active: true,
  });

  const dupLucas = await upsertEmployeeAccount({
    companyId: resolvedCompanyId,
    employeId: `emp_lucas2_${suffix}`,
    login: "Lucas",
    password: "lucaspass2",
    active: true,
  });
  log(
    "6. Doublon Lucas bloqué",
    !dupLucas.ok && Boolean(dupLucas.error?.includes("déjà utilisé")),
    dupLucas.error ?? "aucune erreur",
  );

  const dupSpaces = await isEmployeeLoginTakenGlobally(" lucas ");
  log("7. Doublon \" lucas \" détecté", dupSpaces, String(dupSpaces));

  await upsertEmployeeAccount({
    companyId: resolvedCompanyId,
    employeId,
    login: loginBase,
    password: newPassword,
    active: true,
  });

  const oldPwd = await authenticateEmployeeAccount(loginBase, password);
  const newPwd = await authenticateEmployeeAccount(loginBase, newPassword);
  log("8. Ancien MDP refusé après changement", oldPwd.status === "invalid", oldPwd.status);
  log("9. Nouveau MDP accepté", newPwd.status === "ok", newPwd.status);

  await setEmployeeAccountActive(resolvedCompanyId, employeId, false);

  const disabled = await authenticateEmployeeAccount(loginBase, newPassword);
  log(
    "10. Compte désactivé refusé",
    disabled.status === "disabled",
    disabled.status,
  );

  await setEmployeeAccountActive(resolvedCompanyId, employeId, true);

  const token = signEmployeeSession({
    companyId: resolvedCompanyId,
    employeId,
    login: loginBase,
  });
  const verified = verifyEmployeeSessionToken(token);
  log(
    "11. Session cookie signée valide",
    Boolean(verified?.employeId === employeId),
    verified?.login ?? "null",
  );

  const cleared = verifyEmployeeSessionToken("");
  log("12. Session vide refusée", cleared === null, "ok");

  if (!keep) {
    await cleanup();
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    ok: failed.length === 0,
    passed: results.length - failed.length,
    total: results.length,
    loginUsed: loginBase,
    passwordUsed: password,
    newPasswordUsed: newPassword,
    employeId,
    companyId: resolvedCompanyId,
    kept: keep,
    results,
    ...(keep
      ? {
          credentials: {
            login: loginBase,
            password: newPassword,
            employeId,
          },
        }
      : {}),
  });
}
