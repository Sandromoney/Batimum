import "@/lib/stripe-tls-dev";
import { NextResponse } from "next/server";
import { issueEmailVerificationCode } from "@/lib/email-verification/store";

const LOG_PREFIX = "[email-verification]";

export async function POST(request: Request) {
  console.info(`${LOG_PREFIX} API route atteinte : POST /api/auth/email-verification/send`);

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

  const result = await issueEmailVerificationCode(email);
  console.info(
    `${LOG_PREFIX} Résultat send pour ${email} : ${result.ok ? "ok" : "échec"} — ${result.message}`,
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
