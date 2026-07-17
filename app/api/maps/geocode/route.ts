import { NextResponse } from "next/server";
import {
  COMPANY_ADDRESS_EMPTY_MESSAGE,
  COMPANY_ADDRESS_UNRELIABLE_MESSAGE,
  geocodeCompanyAddress,
  isCompanyAddressComplete,
} from "@/lib/maps/geocode-company-address";
import {
  isMumIaAuthContext,
  requireMumIaAuth,
} from "@/lib/supabase-auth-server";

export async function POST(request: Request) {
  const auth = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(auth)) {
    return auth;
  }

  try {
    const body = (await request.json()) as {
      adresse?: string;
      codePostal?: string;
      ville?: string;
    };

    const input = {
      adresse: body.adresse ?? "",
      codePostal: body.codePostal ?? "",
      ville: body.ville ?? "",
    };

    if (!isCompanyAddressComplete(input)) {
      return NextResponse.json(
        { ok: false, error: COMPANY_ADDRESS_EMPTY_MESSAGE, code: "empty" },
        { status: 400 },
      );
    }

    const result = await geocodeCompanyAddress(input);
    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error: COMPANY_ADDRESS_UNRELIABLE_MESSAGE,
          code: "unreliable",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      location: {
        latitude: result.latitude,
        longitude: result.longitude,
        formattedAddress: result.label,
        score: result.score,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: COMPANY_ADDRESS_UNRELIABLE_MESSAGE, code: "error" },
      { status: 500 },
    );
  }
}
