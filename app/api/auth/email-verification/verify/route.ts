import "@/lib/stripe-tls-dev";
import { NextResponse } from "next/server";
import { verifyEmailVerificationCode } from "@/lib/email-verification/store";

const LOG_PREFIX = "[email-verification]";

export async function POST(request: Request) {
  console.info(`${LOG_PREFIX} API route atteinte : POST /api/auth/email-verification/verify`);

  let body: { email?: string; code?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim() ?? "";

  if (!email || !code) {
    return NextResponse.json(
      { ok: false, message: "Email et code obligatoires." },
      { status: 400 },
    );
  }

  const result = await verifyEmailVerificationCode(email, code);
  console.info(
    `${LOG_PREFIX} Résultat verify pour ${email} : ${result.ok ? "ok" : "échec"} — ${result.message}`,
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
