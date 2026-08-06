import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
import {
  FACTURE_FOURNISSEUR_JSON_SCHEMA,
  normalizeFactureFournisseurExtraction,
} from "@/lib/pilotage/facture-fournisseur-ia";
import {
  isMumIaAuthContext,
  requireMumIaAuth,
} from "@/lib/supabase-auth-server";

export async function POST(request: Request) {
  const auth = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(auth)) {
    return auth;
  }

  let body: { fileName?: string; content?: string };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const content = body.content?.trim();
  const fileName = body.fileName?.trim() || "facture-fournisseur.pdf";

  if (!content) {
    return NextResponse.json(
      { error: "Le contenu du PDF est requis." },
      { status: 400 },
    );
  }

  try {
    const response = await aiService.call({
      mode: "document_analysis",
      messages: [
        {
          role: "user",
          content: [
            "Analyse cette facture fournisseur BTP et extrais uniquement :",
            "- fournisseur (raison sociale)",
            "- date (ISO YYYY-MM-DD si possible)",
            "- montantHT",
            "- tauxTVA (pourcentage)",
            "- montantTVA",
            "- montantTTC",
            "",
            "Règles strictes :",
            "- Ne jamais inventer une donnée absente → null.",
            "- Distinguer clairement HT, TVA et TTC.",
            "- Ignorer CGV, RIB, pieds de page, publicités.",
            "",
            `Fichier: ${fileName}`,
            "",
            content.slice(0, 14000),
          ].join("\n"),
        },
      ],
      jsonSchema: {
        name: "facture_fournisseur_pilotage",
        schema: FACTURE_FOURNISSEUR_JSON_SCHEMA as unknown as Record<
          string,
          unknown
        >,
        strict: false,
      },
      credits: {
        userId: auth.user.id,
        operationId: `pilotage-facture-fournisseur-${Date.now()}`,
        category: "document_analysis",
        checkBefore: true,
        trackAfterSuccess: true,
      },
    });

    if (!response.success || !response.content) {
      const status =
        response.code === "quota_exceeded"
          ? 429
          : response.httpStatus && response.httpStatus >= 400
            ? response.httpStatus
            : 502;
      return NextResponse.json(
        {
          ok: false,
          error: response.error ?? "Extraction IA impossible",
          code: response.code,
        },
        { status },
      );
    }

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Réponse IA illisible." },
        { status: 502 },
      );
    }

    const extraction = normalizeFactureFournisseurExtraction(parsed);

    return NextResponse.json({
      ok: true,
      extraction,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'extraction",
      },
      { status: 500 },
    );
  }
}
