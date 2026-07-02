import { NextResponse } from "next/server";

import {

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

    return NextResponse.json({ error: error ?? "Quota indisponible." }, { status: 500 });

  }



  const snapshot = buildQuotaSnapshotFromUsage(usage);



  return NextResponse.json({

    used: snapshot.used,

    limit: snapshot.limit,

    remaining: snapshot.remaining,

    monthlyIncluded: snapshot.monthlyIncluded,

    packCredits: snapshot.packCredits,

    renewalDate: snapshot.renewalDate,

    periodStart: snapshot.periodStart,

    periodEnd: snapshot.periodEnd,

  });

}

