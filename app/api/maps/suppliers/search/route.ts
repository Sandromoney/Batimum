import { NextResponse } from "next/server";
import {
  logSupplierSearch,
  logSupplierSearchError,
} from "@/lib/maps/supplier-search-logger";
import { searchSuppliers } from "@/lib/maps/supplier-search-orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNAVAILABLE_MESSAGE =
  "La recherche automatique est temporairement indisponible. Vous pouvez ajouter le fournisseur manuellement.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: string;
      latitude?: number;
      longitude?: number;
      radiusKm?: number;
      radius?: number;
      companyAddress?: string;
      ville?: string;
      codePostal?: string;
    };

    const query = body.query?.trim() ?? "";
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const radiusKm =
      Number(body.radiusKm) > 0
        ? Number(body.radiusKm)
        : Number(body.radius) > 1000
          ? Number(body.radius) / 1000
          : Number(body.radius) > 0
            ? Number(body.radius)
            : 15;

    const ville = body.ville?.trim() ?? "";
    const codePostal = body.codePostal?.trim() ?? "";

    logSupplierSearch("query", query);
    logSupplierSearch("companyAddress", body.companyAddress ?? "");
    logSupplierSearch("ville", ville);
    logSupplierSearch("codePostal", codePostal);
    logSupplierSearch("latitude", latitude);
    logSupplierSearch("longitude", longitude);
    logSupplierSearch("radius", radiusKm);

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          message: "Saisissez une enseigne ou un dépôt.",
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Impossible de localiser l'entreprise. Vérifiez l'adresse dans Paramètres > Entreprise.",
        },
        { status: 400 },
      );
    }

    const outcome = await searchSuppliers({
      query,
      latitude,
      longitude,
      radiusKm,
      ville: ville || undefined,
      codePostal: codePostal || undefined,
    });

    logSupplierSearch("passesTried", outcome.debug.passesTried);
    logSupplierSearch("rawCountBeforeDedup", outcome.debug.rawCountBeforeDedup);
    logSupplierSearch("countAfterDedup", outcome.debug.countAfterDedup);
    logSupplierSearch("sourcesUsed", outcome.debug.sourcesUsed);

    if (outcome.results.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        message: `Aucun dépôt trouvé dans un rayon de ${radiusKm} km. Vous pouvez élargir la recherche ou l'ajouter manuellement.`,
        source: outcome.debug.sourcesUsed[0] ?? "none",
        debug: process.env.NODE_ENV === "development" ? outcome.debug : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      results: outcome.results,
      source: outcome.debug.sourcesUsed.join("+") || "mixed",
      radiusKm,
      debug: process.env.NODE_ENV === "development" ? outcome.debug : undefined,
    });
  } catch (error) {
    logSupplierSearchError(error);
    return NextResponse.json(
      {
        success: false,
        message: UNAVAILABLE_MESSAGE,
        debugError:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 503 },
    );
  }
}
