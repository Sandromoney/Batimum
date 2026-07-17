/** Limites approximatives de la France métropolitaine pour la navigation carte. */
export const FRANCE_BOUNDS = {
  southWest: { lat: 41.0, lon: -5.5 },
  northEast: { lat: 51.5, lon: 10.0 },
} as const;

/** Expression Leaflet maxBounds [[latSW, lonSW], [latNE, lonNE]]. */
export const FRANCE_MAX_BOUNDS: [[number, number], [number, number]] = [
  [FRANCE_BOUNDS.southWest.lat, FRANCE_BOUNDS.southWest.lon],
  [FRANCE_BOUNDS.northEast.lat, FRANCE_BOUNDS.northEast.lon],
];

export const FRANCE_CENTER: [number, number] = [46.6, 2.4];
export const FRANCE_DEFAULT_ZOOM = 6;
export const FRANCE_MIN_ZOOM = 5;
export const FRANCE_MAX_ZOOM = 18;

/** Vérifie qu'un point est en France métropolitaine (approximation). */
export function isInFrance(latitude: number, longitude: number): boolean {
  return (
    latitude >= FRANCE_BOUNDS.southWest.lat &&
    latitude <= FRANCE_BOUNDS.northEast.lat &&
    longitude >= FRANCE_BOUNDS.southWest.lon &&
    longitude <= FRANCE_BOUNDS.northEast.lon
  );
}
