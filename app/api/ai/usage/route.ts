import { NextResponse } from "next/server";
import { getOrCreateUserAiUsage } from "@/lib/ai-usage-store";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { usage, error } = await getOrCreateUserAiUsage(authUser.id);
  if (!usage) {
    return NextResponse.json({ error: error ?? "Quota indisponible." }, { status: 500 });
  }

  return NextResponse.json({
    used: usage.ai_requests_used,
    limit: usage.ai_requests_limit,
    remaining: Math.max(0, usage.ai_requests_limit - usage.ai_requests_used),
    periodStart: usage.current_period_start,
    periodEnd: usage.current_period_end,
  });
}
