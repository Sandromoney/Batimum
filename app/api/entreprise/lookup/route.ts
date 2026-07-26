import "@/lib/stripe-tls-dev";
import { NextResponse } from "next/server";
import { lookupEntrepriseBySiret } from "@/lib/entreprise-lookup";
import { normalizeSiretDigits } from "@/lib/entreprise-lookup/types";

export const runtime = "nodejs";

/**
 * GET /api/entreprise/lookup?siret=…
 *
 * Couche d’intégration prête. Provider actuel : non connecté
 * (aucune donnée fictive renvoyée).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siret = normalizeSiretDigits(searchParams.get("siret") ?? "");

  const result = await lookupEntrepriseBySiret(siret);

  const httpStatus =
    result.status === "invalid_query"
      ? 400
      : result.status === "not_connected"
        ? 501
        : result.status === "unavailable"
          ? 503
          : result.status === "not_found"
            ? 404
            : 200;

  return NextResponse.json(
    {
      ok: result.status === "ok",
      connected: false,
      provider: "stub-not-connected",
      ...result,
    },
    { status: httpStatus },
  );
}
