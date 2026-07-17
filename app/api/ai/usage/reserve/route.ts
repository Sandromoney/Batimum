import { NextResponse } from "next/server";

import { reserveMumIaUsage } from "@/lib/ai-usage-store";
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

  const requestId = String(body.requestId ?? "").trim() || crypto.randomUUID();

  const result = await reserveMumIaUsage({
    userId: authResult.user.id,
    requestId,
  });

  // Quota réellement atteint → 429 (bloque MUM IA)
  if (!result.success && result.limitReached) {
    return NextResponse.json(
      {
        success: false,
        limitReached: true,
        message: result.error ?? "Quota MUM IA atteint",
        used: result.used,
        limit: result.limit,
        remaining: result.remaining,
        resetAt: result.resetAt,
      },
      { status: 429 },
    );
  }

  // Succès ou panne technique → 200 (MUM IA continue)
  return NextResponse.json({
    success: true,
    used: result.used,
    limit: result.limit,
    remaining: result.remaining,
    resetAt: result.resetAt,
    alreadyCounted: result.alreadyCounted === true,
    technicalFailure: result.technicalFailure === true,
  });
}
