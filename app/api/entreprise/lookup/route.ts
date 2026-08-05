import "@/lib/stripe-tls-dev";
import { NextResponse } from "next/server";
import { lookupOfficialCompany } from "@/lib/entreprise/annuaire-lookup";

export const runtime = "nodejs";

/**
 * Recherche officielle SIREN / SIRET via l'API Recherche d'entreprises
 * (recherche-entreprises.api.gouv.fr) — sans clé API.
 *
 * GET /api/entreprise/lookup?q=552081317
 * GET /api/entreprise/lookup?q=55208131766522
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? searchParams.get("numero") ?? "").trim();

  if (!q) {
    return NextResponse.json(
      {
        ok: false,
        error: "Indiquez un numéro SIREN ou SIRET.",
        code: "invalid",
        allowManual: true,
      },
      { status: 400 },
    );
  }

  const result = await lookupOfficialCompany(q);

  if (!result.ok) {
    const status =
      result.code === "invalid"
        ? 400
        : result.code === "not_found"
          ? 404
          : result.code === "timeout" || result.code === "unavailable"
            ? 503
            : 422;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
