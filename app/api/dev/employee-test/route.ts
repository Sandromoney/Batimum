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
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

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
  let employes = Array.isArray(settingsRows?.[0]?.employes)
    ? [...(settingsRows![0].employes as { id: string }[])]
    : [];

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
        user_id: companyId,
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
    await deleteEmployeeAccount(companyId, employeId);
    const { data: row } = await supabase!
      .from("user_settings")
      .select("employes")
      .eq("user_id", companyId)
      .maybeSingle();
    if (row?.employes) {
      const filtered = (row.employes as { id: string }[]).filter(
        (e) => e.id !== employeId,
      );
      await supabase!
        .from("user_settings")
        .update({ employes: filtered, updated_at: new Date().toISOString() })
        .eq("user_id", companyId);
    }
    for (const id of [`emp_lucas_${suffix}`, `emp_lucas2_${suffix}`]) {
      await deleteEmployeeAccount(companyId, id);
    }
    await supabase!
      .from("employee_accounts")
      .delete()
      .ilike("employee_login", "lucas");
  }

  await cleanup();

  const createResult = await upsertEmployeeAccount({
    companyId,
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

  const stored = await getEmployeeAccountForEmploye(companyId, employeId);
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
    companyId,
    employeId: `emp_lucas_${suffix}`,
    login: "lucas",
    password: "lucaspass1",
    active: true,
  });

  const dupLucas = await upsertEmployeeAccount({
    companyId,
    employeId: `emp_lucas2_${suffix}`,
    login: "Lucas",
    password: "lucaspass2",
    active: true,
  });
  log(
    "6. Doublon Lucas bloqué",
    !dupLucas.ok && dupLucas.error?.includes("déjà utilisé"),
    dupLucas.error ?? "aucune erreur",
  );

  const dupSpaces = await isEmployeeLoginTakenGlobally(" lucas ");
  log("7. Doublon \" lucas \" détecté", dupSpaces, String(dupSpaces));

  await upsertEmployeeAccount({
    companyId,
    employeId,
    login: loginBase,
    password: newPassword,
    active: true,
  });

  const oldPwd = await authenticateEmployeeAccount(loginBase, password);
  const newPwd = await authenticateEmployeeAccount(loginBase, newPassword);
  log("8. Ancien MDP refusé après changement", oldPwd.status === "invalid", oldPwd.status);
  log("9. Nouveau MDP accepté", newPwd.status === "ok", newPwd.status);

  await setEmployeeAccountActive(companyId, employeId, false);

  const disabled = await authenticateEmployeeAccount(loginBase, newPassword);
  log(
    "10. Compte désactivé refusé",
    disabled.status === "disabled",
    disabled.status,
  );

  await setEmployeeAccountActive(companyId, employeId, true);

  const token = signEmployeeSession({
    companyId,
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
    companyId,
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
