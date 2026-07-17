import { NextResponse } from "next/server";

import { releaseMumIaUsage } from "@/lib/ai-usage-store";
import { isMumIaAuthContext, requireMumIaAuth } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(authResult)) {
    return authResult;
  }

  let body: { requestId?: string } = {};
  try {
    body = (await request.json()) as { requestId?: string };
  } catch {
    body = {};
  }

  const result = await releaseMumIaUsage({
    userId: authResult.user.id,
    requestId: body.requestId,
  });

  // Toujours 200 — ne jamais exposer une erreur BDD au client
  return NextResponse.json({
    success: true,
    used: result.used,
    limit: result.limit,
    remaining: result.remaining,
    resetAt: result.resetAt,
  });
}
