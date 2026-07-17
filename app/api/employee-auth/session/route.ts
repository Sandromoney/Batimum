import { NextResponse } from "next/server";

import { buildEmployeeAuthBootstrap } from "@/lib/employee-auth-bootstrap";
import { requireEmployeeSession } from "@/lib/employee-auth-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireEmployeeSession(request);
  if (!auth) {
    return NextResponse.json({ error: "Session employé invalide." }, { status: 401 });
  }

  const bootstrapResult = await buildEmployeeAuthBootstrap(auth.account);
  if (!bootstrapResult) {
    return NextResponse.json(
      { error: "Ce compte employé est désactivé. Contactez votre dirigeant." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    success: true,
    account: bootstrapResult.account,
    bootstrap: bootstrapResult.bootstrap,
  });
}
