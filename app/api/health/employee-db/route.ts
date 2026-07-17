import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Client Supabase admin indisponible." },
      { status: 503 },
    );
  }

  const tableProbe = await supabase
    .from("employee_accounts")
    .select("id")
    .limit(1);

  const settingsProbe = await supabase
    .from("user_settings")
    .select("user_id")
    .limit(1);

  const rpcProbe = await supabase.rpc("employee_account_find_by_login", {
    p_login: "__healthcheck__",
  });

  const tableOk = !tableProbe.error;
  const settingsOk = !settingsProbe.error;
  const rpcAvailable = rpcProbe.error?.code !== "PGRST202";

  return NextResponse.json({
    ok: tableOk,
    userSettings: {
      ok: settingsOk,
      code: settingsProbe.error?.code ?? null,
      message: settingsProbe.error?.message ?? null,
    },
    table: {
      ok: tableOk,
      code: tableProbe.error?.code ?? null,
      message: tableProbe.error?.message ?? null,
    },
    rpc: {
      ok: rpcAvailable,
      available: rpcAvailable,
      optional: true,
      code: rpcProbe.error?.code ?? null,
      message: rpcProbe.error?.message ?? null,
    },
  });
}
