import { NextResponse } from "next/server";

import {
  deleteEmployeeAccount,
  getEmployeeAccountForEmploye,
  setEmployeeAccountActive,
  upsertEmployeeAccount,
} from "@/lib/employee-accounts-store";
import { resolveSettingsAuthContext } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await resolveSettingsAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const url = new URL(request.url);
  const employeId = url.searchParams.get("employeId")?.trim();
  if (!employeId) {
    return NextResponse.json({ error: "employeId requis." }, { status: 400 });
  }

  const account = await getEmployeeAccountForEmploye(
    auth.companyId,
    employeId,
  );
  return NextResponse.json({
    configured: Boolean(account),
    login: account?.employee_login ?? null,
    active: account?.employee_account_active ?? true,
  });
}

export async function POST(request: Request) {
  const auth = await resolveSettingsAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: {
    employeId?: string;
    login?: string;
    password?: string;
    active?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const employeId = String(body.employeId ?? "").trim();
  const login = String(body.login ?? "").trim();
  const password =
    body.password !== undefined ? String(body.password) : undefined;

  if (!employeId || !login) {
    return NextResponse.json(
      { error: "Identifiant requis." },
      { status: 400 },
    );
  }

  const existing = await getEmployeeAccountForEmploye(
    auth.companyId,
    employeId,
  );
  if (!existing && (!password || password.trim().length < 6)) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 6 caractères." },
      { status: 400 },
    );
  }

  const result = await upsertEmployeeAccount({
    companyId: auth.companyId,
    employeId,
    login,
    password: password?.trim() || undefined,
    active: body.active !== false,
  });

  if (!result.ok) {
    const status = result.error?.includes("déjà utilisé") ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    success: true,
    login: login.trim().toLowerCase(),
  });
}

export async function DELETE(request: Request) {
  const auth = await resolveSettingsAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const url = new URL(request.url);
  const employeId = url.searchParams.get("employeId")?.trim();
  if (!employeId) {
    return NextResponse.json({ error: "employeId requis." }, { status: 400 });
  }

  await deleteEmployeeAccount(auth.companyId, employeId);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const auth = await resolveSettingsAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: { employeId?: string; active?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const employeId = String(body.employeId ?? "").trim();
  if (!employeId) {
    return NextResponse.json({ error: "employeId requis." }, { status: 400 });
  }

  await setEmployeeAccountActive(
    auth.companyId,
    employeId,
    body.active !== false,
  );
  return NextResponse.json({ success: true });
}
