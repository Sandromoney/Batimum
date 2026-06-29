import { NextResponse } from "next/server";
import {
  completePublicDevisSignature,
  refusePublicDevisSignature,
  toPublicDevisSignatureView,
} from "@/lib/devis-public-signature-actions";
import { loadDevisPublicSignatureByToken } from "@/lib/devis-public-signature-store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  console.log("[signature-page] token received:", token);

  const { row, error } = await loadDevisPublicSignatureByToken(token);

  if (error) {
    console.log("[signature-page] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    console.log("[signature-page] error:", "quote not found");
    return NextResponse.json(
      { error: "Lien de devis introuvable ou inexistant." },
      { status: 404 },
    );
  }

  console.log("[signature-page] quote found:", row.devis_id);

  return NextResponse.json(toPublicDevisSignatureView(row));
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  console.log("[signature-page] token received:", token);

  let body: {
    action?: "sign" | "refuse";
    signature?: string;
    signedBy?: string;
    refusedBy?: string;
    refusalReason?: string;
    clientIp?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    console.log("[signature-page] error:", "invalid body");
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (body.action === "sign") {
    if (!body.signature || !body.signedBy?.trim()) {
      return NextResponse.json(
        { error: "Signature ou nom du signataire manquant." },
        { status: 400 },
      );
    }

    const result = await completePublicDevisSignature({
      publicToken: token,
      signature: body.signature,
      signedBy: body.signedBy.trim(),
      clientIp: body.clientIp,
    });

    if (result.error) {
      console.log("[signature-page] error:", result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    console.log("[signature-page] quote found:", result.devis.id);
    return NextResponse.json({
      devis: result.devis,
      status: "signed" as const,
    });
  }

  if (body.action === "refuse") {
    const result = await refusePublicDevisSignature({
      publicToken: token,
      refusedBy: body.refusedBy?.trim() || "Client",
      refusalReason: body.refusalReason,
      clientIp: body.clientIp,
    });

    if (result.error) {
      console.log("[signature-page] error:", result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    console.log("[signature-page] quote found:", result.devis.id);
    return NextResponse.json({
      devis: result.devis,
      status: "refused" as const,
    });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
