import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

function assertDevOnly() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

export async function GET() {
  const blocked = assertDevOnly();
  if (blocked) return blocked;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "no client" });

  const settings = await supabase.from("user_settings").select("user_id").limit(5);
  const accounts = await supabase
    .from("employee_accounts")
    .select("company_id, employee_login")
    .limit(5);
  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 5 });

  return NextResponse.json({
    settings: { count: settings.data?.length ?? 0, error: settings.error?.message },
    accounts: accounts.data,
    accountsError: accounts.error?.message,
    users: users.data.users.map((u) => u.id),
  });
}
