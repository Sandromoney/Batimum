import { NextResponse } from "next/server";
import {
  publishDevisPublicSignature,
} from "@/lib/devis-public-signature-store";
import { buildDevisSignatureUrl } from "@/lib/devis-signature-url";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-auth-server";
import type { Client, Devis, Parametres } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: {
    devis?: Devis;
    client?: Client;
    parametres?: Parametres;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!body.devis?.id || !body.parametres) {
    return NextResponse.json(
      { error: "Devis ou paramètres manquants." },
      { status: 400 },
    );
  }

  const { publicToken, error } = await publishDevisPublicSignature({
    userId: authUser.id,
    devis: body.devis,
    client: body.client,
    parametres: body.parametres,
  });

  if (error || !publicToken) {
    console.error("[signature-link] publish error", error);
    return NextResponse.json(
      { error: error?.message ?? "Publication impossible." },
      { status: 500 },
    );
  }

  const signatureUrl = buildDevisSignatureUrl(publicToken);
  console.log("[signature-link] email url generated:", signatureUrl);

  return NextResponse.json({
    publicToken,
    signatureUrl,
    devisId: body.devis.id,
  });
}
