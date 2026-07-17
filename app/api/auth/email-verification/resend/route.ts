import "@/lib/stripe-tls-dev";
import { NextResponse } from "next/server";
import { resendEmailVerificationCode } from "@/lib/email-verification/store";

const LOG_PREFIX = "[email-verification]";

export async function POST(request: Request) {
  console.info(`${LOG_PREFIX} API route atteinte : POST /api/auth/email-verification/resend`);

  let body: { email?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { ok: false, message: "Email obligatoire." },
      { status: 400 },
    );
  }

  const result = await resendEmailVerificationCode(email);
  console.info(
    `${LOG_PREFIX} Résultat resend pour ${email} : ${result.ok ? "ok" : "échec"} — ${result.message}`,
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
