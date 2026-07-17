import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

type Check = { ok: boolean; code?: string | null; message?: string | null };

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Non disponible." }, { status: 404 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Admin client indisponible." });
  }

  async function runRpc(name: string, args: Record<string, unknown>): Promise<Check> {
    const { error } = await supabase!.rpc(name, args);
    if (!error) return { ok: true };
    return {
      ok: error.code !== "PGRST202",
      code: error.code ?? null,
      message: error.message ?? null,
    };
  }

  const table = await supabase.from("employee_accounts").select("id").limit(1);
  const settingsRead = await supabase.from("user_settings").select("user_id").limit(1);

  const { data: usersData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  const companyId = usersData.users[0]?.id;
  let settingsWrite: Check = { ok: false, message: "Aucun utilisateur auth." };
  if (companyId) {
    const write = await supabase.from("user_settings").upsert(
      {
        user_id: companyId,
        parametres: {},
        employes: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    settingsWrite = write.error
      ? { ok: false, code: write.error.code, message: write.error.message }
      : { ok: true };
  }

  const rpcFind = await runRpc("employee_account_find_by_login", {
    p_login: "__audit__",
  });
  const rpcGet = await runRpc("employee_account_get", {
    p_company_id: companyId ?? "00000000-0000-0000-0000-000000000000",
    p_employe_id: "__audit__",
  });
  const rpcTaken = await runRpc("employee_account_login_taken", {
    p_login: "__audit__",
  });

  const { count } = await supabase
    .from("employee_accounts")
    .select("id", { count: "exact", head: true });

  const tableOk = !table.error;
  const rpcAvailable =
    rpcFind.code !== "PGRST202" &&
    rpcGet.code !== "PGRST202" &&
    rpcTaken.code !== "PGRST202";

  const readyForProduction =
    tableOk &&
    !settingsRead.error &&
    (rpcAvailable || tableOk);

  return NextResponse.json({
    readyForProduction,
    table: {
      ok: tableOk,
      code: table.error?.code ?? null,
      message: table.error?.message ?? null,
    },
    userSettings: {
      readOk: !settingsRead.error,
      serviceRoleWriteOk: settingsWrite.ok,
      writeCode: settingsWrite.code ?? null,
      writeMessage: settingsWrite.message ?? null,
      note: "L'enregistrement dirigeant passe par la session authenticated (RLS), pas service_role.",
    },
    rpc: {
      available: rpcAvailable,
      find: rpcFind,
      get: rpcGet,
      taken: rpcTaken,
    },
    testAccountsInDb: count ?? 0,
    pendingMigration:
      "supabase/migrations/20260717130000_employee_accounts_authenticated_access.sql",
  });
}
