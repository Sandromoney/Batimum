import { buildAuthenticatedFetchInit } from "@/lib/authenticated-api-fetch";
import { fournisseurHasCoordinates } from "@/lib/fourniture/map-points";
import type { Fournisseur } from "@/lib/types";

/**
 * Géocode les fournisseurs sans coordonnées via l'API Adresse (serveur Batimum).
 * Retourne la liste mise à jour (mêmes références si rien n'a changé).
 */
export async function ensureFournisseursCoordinates(
  fournisseurs: Fournisseur[],
): Promise<{ next: Fournisseur[]; updatedIds: string[] }> {
  const updatedIds: string[] = [];
  const next = [...fournisseurs];

  for (let index = 0; index < next.length; index += 1) {
    const item = next[index];
    if (!item || item.status === "archived") continue;
    if (fournisseurHasCoordinates(item) && item.geocodedAt) continue;

    if (fournisseurHasCoordinates(item) && !item.geocodedAt) {
      next[index] = {
        ...item,
        geocodedAt: new Date().toISOString(),
        geocodingSource: item.geocodingSource ?? "openstreetmap",
      };
      updatedIds.push(item.id);
      continue;
    }

    const adresse = item.adresseDepot?.trim() ?? "";
    const codePostal = item.codePostal?.trim() ?? "";
    const ville = item.ville?.trim() ?? "";
    if (!adresse && !codePostal && !ville) continue;

    try {
      const response = await fetch(
        "/api/maps/geocode",
        await buildAuthenticatedFetchInit({
          method: "POST",
          body: JSON.stringify({ adresse, codePostal, ville }),
        }),
      );
      if (!response.ok) continue;
      const payload = (await response.json()) as {
        ok?: boolean;
        location?: { latitude?: number; longitude?: number };
      };
      const lat = payload.location?.latitude;
      const lng = payload.location?.longitude;
      if (
        !payload.ok ||
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        continue;
      }

      next[index] = {
        ...item,
        latitude: lat,
        longitude: lng,
        geocodedAt: new Date().toISOString(),
        geocodingSource: "api_adresse",
        updatedAt: new Date().toISOString(),
      };
      updatedIds.push(item.id);
    } catch {
      /* ignore — saisie manuelle / API indisponible */
    }
  }

  return { next, updatedIds };
}

/** Invalide les coordonnées quand l'adresse change. */
export function clearFournisseurCoordinatesOnAddressChange(
  previous: Fournisseur,
  next: Fournisseur,
): Fournisseur {
  const addressChanged =
    previous.adresseDepot.trim() !== next.adresseDepot.trim() ||
    previous.codePostal.trim() !== next.codePostal.trim() ||
    previous.ville.trim() !== next.ville.trim();

  if (!addressChanged) return next;

  return {
    ...next,
    latitude: undefined,
    longitude: undefined,
    geocodedAt: undefined,
    geocodingSource: undefined,
  };
}
