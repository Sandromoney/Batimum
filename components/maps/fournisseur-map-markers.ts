import L from "leaflet";

const BUILDING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;

export function createCompanyMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "batimum-map-marker-wrap",
    html: `<div class="batimum-map-marker batimum-map-marker--company">${BUILDING_SVG}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export function createDepotMarkerIcon(selected = false): L.DivIcon {
  return L.divIcon({
    className: "batimum-map-marker-wrap",
    html: selected
      ? `<div class="batimum-map-marker batimum-map-marker--depot-selected"><span></span></div>`
      : `<div class="batimum-map-marker batimum-map-marker--depot"><span></span></div>`,
    iconSize: selected ? [32, 32] : [26, 26],
    iconAnchor: selected ? [16, 16] : [13, 13],
    popupAnchor: [0, selected ? -16 : -12],
  });
}
