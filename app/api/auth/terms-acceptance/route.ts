import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createLegalAcceptance } from "@/lib/legal-acceptance";
import {
  sealTermsAcceptance,
  TERMS_ACCEPTANCE_COOKIE,
  unsealTermsAcceptance,
} from "@/lib/legal-acceptance-cookie";

function resolveClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  return request.headers.get("x-real-ip")?.trim() || undefined;
}

export async function POST(request: Request) {
  const acceptance = createLegalAcceptance(resolveClientIp(request));
  const sealed = sealTermsAcceptance(acceptance);
  const cookieStore = await cookies();

  cookieStore.set(TERMS_ACCEPTANCE_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.json(acceptance);
}

export async function GET() {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(TERMS_ACCEPTANCE_COOKIE)?.value;
  const acceptance = unsealTermsAcceptance(sealed);

  if (!acceptance?.cguAccepted || !acceptance?.cgvAccepted) {
    return NextResponse.json(
      { error: "Acceptation CGU/CGV introuvable." },
      { status: 404 },
    );
  }

  return NextResponse.json(acceptance);
}
