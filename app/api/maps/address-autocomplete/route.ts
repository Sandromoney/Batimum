import "@/lib/stripe-tls-dev";
import { NextResponse } from "next/server";
import type { AddressSuggestion } from "@/lib/maps/address-suggestion";

export type { AddressSuggestion };

export const runtime = "nodejs";

type AdresseFeature = {
  properties?: {
    label?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    context?: string;
    score?: number;
  };
};

/**
 * Autocomplétion d'adresse via API Adresse (data.gouv.fr) — publique, sans clé.
 * GET /api/maps/address-autocomplete?q=18+Chemin
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 3) {
    return NextResponse.json({ ok: true, suggestions: [] as AddressSuggestion[] });
  }

  try {
    const url = new URL("https://api-adresse.data.gouv.fr/search/");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "6");
    url.searchParams.set("autocomplete", "1");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: "Service d'adresse indisponible.", suggestions: [] },
        { status: 503 },
      );
    }

    const data = (await response.json()) as { features?: AdresseFeature[] };
    const suggestions: AddressSuggestion[] = (data.features ?? [])
      .map((feature) => {
        const props = feature.properties ?? {};
        const streetParts = [props.housenumber, props.street ?? props.name]
          .filter(Boolean)
          .join(" ")
          .trim();
        const adresse = streetParts || props.name || props.label || "";
        const codePostal = props.postcode?.trim() ?? "";
        const ville = props.city?.trim() ?? "";
        if (!adresse || !codePostal || !ville) return null;
        return {
          label: props.label?.trim() || `${adresse}, ${codePostal} ${ville}`,
          adresse,
          codePostal,
          ville,
          pays: "France",
          context: props.context?.trim() ?? "",
        } satisfies AddressSuggestion;
      })
      .filter((item): item is AddressSuggestion => Boolean(item));

    return NextResponse.json({ ok: true, suggestions });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Impossible de récupérer les suggestions.", suggestions: [] },
      { status: 503 },
    );
  }
}
