import type { Fournisseur } from "@/lib/types";

export type SavedFournisseurMapPoint = {
  id: string;
  nom: string;
  enseigne?: string;
  nomDepot?: string;
  adresse: string;
  ville: string;
  codePostal: string;
  telephone?: string;
  email?: string;
  categorie?: string;
  distanceKm?: number;
  latitude: number;
  longitude: number;
  isNew?: boolean;
};

/** Décalage déterministe pour éviter la superposition totale de marqueurs proches. */
export function jitterLatLng(
  latitude: number,
  longitude: number,
  seed: string,
  index = 0,
): [number, number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const angle = ((hash % 360) + index * 47) * (Math.PI / 180);
  const radius = 0.00012 + (hash % 7) * 0.00002; // ~10–25 m
  return [
    latitude + Math.cos(angle) * radius,
    longitude + Math.sin(angle) * radius,
  ];
}

export function fournisseurHasCoordinates(
  item: Pick<Fournisseur, "latitude" | "longitude">,
): boolean {
  return (
    typeof item.latitude === "number" &&
    Number.isFinite(item.latitude) &&
    typeof item.longitude === "number" &&
    Number.isFinite(item.longitude)
  );
}

export function toSavedFournisseurMapPoint(
  item: Fournisseur,
  options?: { isNew?: boolean },
): SavedFournisseurMapPoint | null {
  if (!fournisseurHasCoordinates(item)) return null;
  return {
    id: item.id,
    nom: item.enseigne?.trim() || item.nom.trim() || "Fournisseur",
    enseigne: item.enseigne,
    nomDepot: item.nomDepot,
    adresse: item.adresseDepot?.trim() || "",
    ville: item.ville?.trim() || "",
    codePostal: item.codePostal?.trim() || "",
    telephone: item.telephone,
    email: item.email,
    categorie:
      item.source === "manual"
        ? "Manuel"
        : item.familles?.length
          ? item.familles.join(", ")
          : item.source === "annuaire_entreprises"
            ? "Annuaire"
            : item.source === "openstreetmap" || item.source === "osm"
              ? "OpenStreetMap"
              : undefined,
    distanceKm: item.distanceKm,
    latitude: item.latitude as number,
    longitude: item.longitude as number,
    isNew: options?.isNew,
  };
}

export function groupNearbyPoints(
  points: SavedFournisseurMapPoint[],
  thresholdDegrees = 0.00025,
): SavedFournisseurMapPoint[][] {
  const groups: SavedFournisseurMapPoint[][] = [];
  const used = new Set<string>();

  for (const point of points) {
    if (used.has(point.id)) continue;
    const group = [point];
    used.add(point.id);
    for (const other of points) {
      if (used.has(other.id)) continue;
      const dLat = Math.abs(point.latitude - other.latitude);
      const dLng = Math.abs(point.longitude - other.longitude);
      if (dLat <= thresholdDegrees && dLng <= thresholdDegrees) {
        group.push(other);
        used.add(other.id);
      }
    }
    groups.push(group);
  }
  return groups;
}
