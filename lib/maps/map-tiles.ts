/** Fond cartographique clair Batimum (CARTO Positron — compatible Leaflet). */
export const BATIMUM_MAP_TILES = {
  url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd" as const,
  minZoom: 5,
  maxZoom: 18,
};
