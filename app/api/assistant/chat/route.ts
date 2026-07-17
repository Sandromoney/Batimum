import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Assistant Batimum temporairement retiré de l'interface.
 * Aucun appel OpenAI, aucun crédit consommé.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      creditConsumed: 0,
      error: "Assistant Batimum temporairement indisponible.",
    },
    { status: 503 },
  );
}
