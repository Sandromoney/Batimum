import { NextResponse } from "next/server";
import { loadDevisPublicSignatureForOwner } from "@/lib/devis-public-signature-store";
import { buildDevisSignatureUrl } from "@/lib/devis-signature-url";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ devisId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { devisId } = await context.params;
  const { row, error } = await loadDevisPublicSignatureForOwner(
    authUser.id,
    devisId,
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row || row.status === "pending") {
    if (row?.public_token) {
      return NextResponse.json({
        updated: false,
        signatureUrl: buildDevisSignatureUrl(row.public_token),
        publicToken: row.public_token,
      });
    }
    return NextResponse.json({ updated: false });
  }

  return NextResponse.json({
    updated: true,
    status: row.status,
    devis: row.devis,
    publicToken: row.public_token,
    signatureUrl: buildDevisSignatureUrl(row.public_token),
  });
}
