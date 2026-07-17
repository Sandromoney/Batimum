import { NextResponse } from "next/server";
import type { OsmDepotResult } from "@/lib/maps/depot-types";
import { logSupplierSearch } from "@/lib/maps/supplier-search-logger";
import {
  SupplierOverpassError,
  searchSuppliersOverpass,
  type SupplierSearchResult,
} from "@/lib/maps/search-suppliers-overpass";
import {
  isMumIaAuthContext,
  requireMumIaAuth,
} from "@/lib/supabase-auth-server";

const OVERPASS_UNAVAILABLE_MESSAGE =
  "La recherche automatique est temporairement indisponible. Vous pouvez ajouter le fournisseur manuellement.";

function toOsmDepotResult(depot: SupplierSearchResult): OsmDepotResult {
  return {
    osmId: depot.osmId,
    osmType: depot.osmType,
    name: depot.name,
    enseigne: depot.brand,
    adresse: depot.address,
    ville: depot.city,
    codePostal: depot.postcode,
    latitude: depot.latitude,
    longitude: depot.longitude,
    distanceKm: depot.distanceKm,
    telephone: depot.phone,
    siteWeb: depot.website,
  };
}

export async function POST(request: Request) {
  const auth = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(auth)) {
    logSupplierSearch("error", "Authentification refusée sur /api/maps/places-search");
    return auth;
  }

  let query = "";
  let companyAddress = "";

  try {
    const body = (await request.json()) as {
      query?: string;
      latitude?: number;
      longitude?: number;
      radiusKm?: number;
      companyAddress?: string;
      adresse?: string;
      codePostal?: string;
      ville?: string;
    };

    query = body.query?.trim() ?? "";
    const latitude = body.latitude;
    const longitude = body.longitude;
    const radiusKm = body.radiusKm === 60 ? 60 : 30;

    companyAddress =
      body.companyAddress?.trim() ||
      [body.adresse, body.codePostal, body.ville].filter(Boolean).join(", ");

    logSupplierSearch("query", query);
    logSupplierSearch("companyAddress", companyAddress);
    logSupplierSearch("companyCoordinates", { latitude, longitude, radiusKm });

    if (!query) {
      logSupplierSearch("error", "Query vide");
      return NextResponse.json(
        { ok: false, error: "Saisissez une enseigne ou un dépôt." },
        { status: 400 },
      );
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      logSupplierSearch("error", "Coordonnées entreprise invalides");
      return NextResponse.json(
        {
          ok: false,
          error:
            "Impossible de localiser l'entreprise. Vérifiez l'adresse dans Paramètres > Entreprise.",
        },
        { status: 400 },
      );
    }

    const outcome = await searchSuppliersOverpass({
      query,
      latitude,
      longitude,
      radiusMeters: radiusKm * 1000,
    });

    return NextResponse.json({
      ok: true,
      depots: outcome.results.map((depot) => toOsmDepotResult(depot)),
      radiusKm,
    });
  } catch (error) {
    const message =
      error instanceof SupplierOverpassError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erreur Overpass inconnue";

    logSupplierSearch("error", {
      message,
      endpoint: error instanceof SupplierOverpassError ? error.endpoint : undefined,
      status: error instanceof SupplierOverpassError ? error.status : undefined,
      query,
      companyAddress,
    });

    return NextResponse.json(
      {
        ok: false,
        error: OVERPASS_UNAVAILABLE_MESSAGE,
        debugError: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 503 },
    );
  }
}
