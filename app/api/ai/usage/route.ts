import { NextResponse } from "next/server";

import {
  AI_REQUESTS_LIMIT_DEFAULT,
  buildQuotaSnapshotFromUsage,
  getOrCreateUserAiUsage,
} from "@/lib/ai-usage-store";
import { isMumIaAuthContext, requireMumIaAuth } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(authResult)) {
    return authResult;
  }

  const { user: authUser, companyId } = authResult;

  console.log("[MUM IA] quota auth ok", {
    userId: authUser.id,
    companyId,
    authSource: authResult.authSource,
  });

  const { usage, error } = await getOrCreateUserAiUsage(authUser.id);

  if (!usage) {
    console.warn("[MUM IA] quota usage unavailable", {
      userId: authUser.id,
      error: error ?? "unknown",
    });
    return NextResponse.json({
      available: false,
      monthlyIncluded: AI_REQUESTS_LIMIT_DEFAULT,
      limit: AI_REQUESTS_LIMIT_DEFAULT,
    });
  }

  const snapshot = buildQuotaSnapshotFromUsage(usage);

  return NextResponse.json({
    available: true,
    used: snapshot.used,
    limit: snapshot.limit,
    remaining: snapshot.remaining,
    monthlyIncluded: snapshot.monthlyIncluded,
    packCredits: 0,
    renewalDate: snapshot.renewalDate,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
  });
}
