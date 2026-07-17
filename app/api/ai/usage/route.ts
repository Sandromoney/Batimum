import { NextResponse } from "next/server";

import { getAiUsage } from "@/lib/ai/ai-credits";
import { AI_REQUESTS_LIMIT_DEFAULT } from "@/lib/ai-usage-store";
import { isMumIaAuthContext, requireMumIaAuth } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(authResult)) {
    return authResult;
  }

  const usage = await getAiUsage(authResult.user.id);

  if (!usage.storageAvailable && !usage.available) {
    return NextResponse.json({
      available: false,
      monthlyIncluded: AI_REQUESTS_LIMIT_DEFAULT,
      limit: AI_REQUESTS_LIMIT_DEFAULT,
      used: 0,
      remaining: AI_REQUESTS_LIMIT_DEFAULT,
      percentageUsed: 0,
      breakdown: {
        mumDevis: 0,
        assistant: 0,
        documentAnalysis: 0,
        ocr: 0,
        other: 0,
      },
    });
  }

  return NextResponse.json({
    available: true,
    used: usage.creditsUsed,
    limit: usage.quotaTotal,
    remaining: usage.creditsRemaining,
    monthlyIncluded: usage.quotaTotal,
    packCredits: 0,
    percentageUsed: usage.percentageUsed,
    renewalDate: usage.periodEnd,
    periodStart: usage.periodStart,
    periodEnd: usage.periodEnd,
    breakdown: usage.breakdown,
  });
}
