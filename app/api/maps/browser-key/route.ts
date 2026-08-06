import { NextResponse } from "next/server";
import { getGoogleMapsServerKey } from "@/lib/maps/google-maps-server";

/**
 * Expose la clé Maps utilisable côté navigateur (Maps JavaScript API).
 * Préférer NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ; sinon GOOGLE_MAPS_API_KEY serveur.
 */
export async function GET() {
  const key =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ||
    getGoogleMapsServerKey() ||
    null;

  return NextResponse.json({
    configured: Boolean(key),
    key,
  });
}
