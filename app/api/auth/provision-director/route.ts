import "@/lib/stripe-tls-dev";
import { NextResponse } from "next/server";
import { provisionDirectorAccount } from "@/lib/auth-provision-director";
import { isPrivateBetaEnabled, PRIVATE_BETA_SIGNUP_CLOSED_MESSAGE } from "@/lib/private-beta";

export async function POST(request: Request) {
  if (isPrivateBetaEnabled()) {
    return NextResponse.json(
      { error: PRIVATE_BETA_SIGNUP_CLOSED_MESSAGE },
      { status: 403 },
    );
  }

  let body: {
    email?: string;
    password?: string;
    entreprise?: string;
    utilisateur?: string;
    telephone?: string;
    siret?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const result = await provisionDirectorAccount({
    email: body.email ?? "",
    password: body.password ?? "",
    entreprise: body.entreprise,
    utilisateur: body.utilisateur,
    telephone: body.telephone,
    siret: body.siret,
  });

  if (!result.ok) {
    const status =
      result.code === "invalid_email" || result.code === "invalid_password"
        ? 400
        : result.code === "supabase_admin"
          ? 503
          : 500;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({
    ok: true,
    userId: result.userId,
    created: result.created,
    email: result.email,
  });
}
