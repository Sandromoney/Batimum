import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "no client" });

  const settings = await supabase.from("user_settings").select("user_id").limit(5);
  const accounts = await supabase.from("employee_accounts").select("company_id, employee_login").limit(5);
  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 5 });

  return NextResponse.json({
    settings: { count: settings.data?.length ?? 0, error: settings.error?.message },
    accounts: accounts.data,
    accountsError: accounts.error?.message,
    users: users.data.users.map((u) => u.id),
  });
}
