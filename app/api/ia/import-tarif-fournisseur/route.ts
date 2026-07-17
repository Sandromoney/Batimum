import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
import { inferFamilleProduit } from "@/lib/fournisseur-utils";
import {
  isMumIaAuthContext,
  requireMumIaAuth,
} from "@/lib/supabase-auth-server";
import type { FournisseurTarifLigne } from "@/lib/types";
import { generateId } from "@/lib/utils";

const TARIF_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    lignes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          reference: { type: "string" },
          nomProduit: { type: "string" },
          categorie: { type: "string" },
          unite: { type: "string" },
          conditionnement: { type: "string" },
          prixPublic: { type: "number" },
          prixRemise: { type: "number" },
          prixNetPro: { type: "number" },
          tauxTVA: { type: "number" },
          aVerifier: { type: "boolean" },
        },
        required: ["nomProduit"],
      },
    },
  },
  required: ["lignes"],
} as const;

export async function POST(request: Request) {
  const auth = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(auth)) {
    return auth;
  }

  let body: {
    fournisseurId?: string;
    fileName?: string;
    content?: string;
    source?: FournisseurTarifLigne["sourceImport"];
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const fournisseurId = body.fournisseurId?.trim();
  const content = body.content?.trim();
  const fileName = body.fileName?.trim() || "import";
  const source = body.source ?? "pdf";

  if (!fournisseurId || !content) {
    return NextResponse.json(
      { error: "fournisseurId et content sont requis" },
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
            "Analyse ce tarif fournisseur BTP et extrais uniquement les lignes produit.",
            "",
            "Règles strictes :",
            "- Ne jamais inventer une donnée absente.",
            "- Distinguer clairement : prixPublic (tarif public), prixRemise / prixNetPro (prix professionnel HT).",
            "- Ne jamais mélanger HT et TTC : les prix extraits sont HT sauf mention explicite.",
            "- Si un prix est TTC uniquement, convertir en HT seulement si le taux TVA est certain ; sinon omettre et aVerifier=true.",
            "- Ignorer : CGV, coordonnées bancaires, mentions légales, numéros de page, publicités, pieds de page, titres non produits.",
            "- Gérer tableaux multi-pages, colonnes répétées, lignes coupées, montants avec virgule et symbole €, remises %, unités variées, plusieurs taux TVA.",
            "- Si une information est incertaine : aVerifier=true.",
            "- prixRemise / prixNetPro = prix net professionnel HT (prioritaire pour prixRemise).",
            "",
            `Fichier: ${fileName}`,
            "",
            content.slice(0, 14000),
          ].join("\n"),
        },
      ],
      jsonSchema: {
        name: "tarif_fournisseur",
        schema: TARIF_JSON_SCHEMA,
        strict: false,
      },
      credits: {
        userId: auth.user.id,
        operationId: `import-tarif-${fournisseurId}-${Date.now()}`,
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
          error: response.error ?? "Analyse IA impossible",
          code: response.code,
        },
        { status },
      );
    }

    const parsed = JSON.parse(response.content) as {
      lignes?: Array<{
        reference?: string;
        nomProduit?: string;
        categorie?: string;
        unite?: string;
        conditionnement?: string;
        prixPublic?: number;
        prixRemise?: number;
        prixNetPro?: number;
        tauxTVA?: number;
        aVerifier?: boolean;
      }>;
    };

    const lignes: FournisseurTarifLigne[] = (parsed.lignes ?? [])
      .filter((line) => line.nomProduit?.trim())
      .map((line) => {
        const prixPro =
          typeof line.prixNetPro === "number" && line.prixNetPro >= 0
            ? line.prixNetPro
            : typeof line.prixRemise === "number" && line.prixRemise >= 0
              ? line.prixRemise
              : undefined;
        const prixPublic =
          typeof line.prixPublic === "number" && line.prixPublic >= 0
            ? line.prixPublic
            : undefined;

        return {
          id: generateId(),
          fournisseurId,
          reference: line.reference?.trim() || undefined,
          nomProduit: line.nomProduit!.trim(),
          categorie:
            line.categorie?.trim() || inferFamilleProduit(line.nomProduit!),
          unite: line.unite?.trim() || "u",
          conditionnement: line.conditionnement?.trim() || undefined,
          prixPublic,
          prixRemise: prixPro,
          prixEntrepriseSaisi: prixPro,
          tauxTVA:
            typeof line.tauxTVA === "number" && line.tauxTVA >= 0
              ? line.tauxTVA
              : 20,
          dateImport: new Date().toISOString(),
          sourceImport: source,
          fichierImport: fileName,
          aVerifier:
            line.aVerifier ??
            (prixPublic == null && prixPro == null),
        };
      });

    return NextResponse.json({ ok: true, lignes });
  } catch (error) {
    console.error("[IMPORT TARIF]", error);
    return NextResponse.json(
      { error: "Impossible d'analyser le tarif pour le moment." },
      { status: 500 },
    );
  }
}
