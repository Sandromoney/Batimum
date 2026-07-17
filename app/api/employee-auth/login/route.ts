import { NextResponse } from "next/server";

import { authenticateEmployeeAccount } from "@/lib/employee-accounts-store";
import {
  buildEmployeeAuthBootstrap,
  isEmployeeProfileDisabled,
} from "@/lib/employee-auth-bootstrap";
import {
  EMPLOYEE_SESSION_COOKIE,
  getEmployeeSessionCookieOptions,
  signEmployeeSession,
} from "@/lib/employee-session";

export const runtime = "nodejs";

const LOGIN_ERROR = "Identifiant ou mot de passe incorrect.";
const DISABLED_ERROR =
  "Ce compte employé est désactivé. Contactez votre dirigeant.";

export async function POST(request: Request) {
  let body: { identifier?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: LOGIN_ERROR }, { status: 401 });
  }

  const identifier = String(body.identifier ?? "").trim();
  const password = String(body.password ?? "");

  if (!identifier || !password) {
    return NextResponse.json({ error: LOGIN_ERROR }, { status: 401 });
  }

  const authResult = await authenticateEmployeeAccount(identifier, password);
  if (authResult.status === "disabled") {
    return NextResponse.json({ error: DISABLED_ERROR }, { status: 403 });
  }
  if (authResult.status !== "ok" || !authResult.account) {
    return NextResponse.json({ error: LOGIN_ERROR }, { status: 401 });
  }

  const bootstrapResult = await buildEmployeeAuthBootstrap(authResult.account);
  if (!bootstrapResult) {
    if (await isEmployeeProfileDisabled(authResult.account)) {
      return NextResponse.json({ error: DISABLED_ERROR }, { status: 403 });
    }
    return NextResponse.json({ error: LOGIN_ERROR }, { status: 401 });
  }

  const token = signEmployeeSession({
    companyId: authResult.account.company_id,
    employeId: authResult.account.employe_id,
    login: authResult.account.employee_login,
  });

  const response = NextResponse.json({
    success: true,
    account: bootstrapResult.account,
    bootstrap: bootstrapResult.bootstrap,
  });
  response.cookies.set(
    EMPLOYEE_SESSION_COOKIE,
    token,
    getEmployeeSessionCookieOptions(),
  );
  return response;
}
