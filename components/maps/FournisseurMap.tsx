"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeocodedLocation, OsmDepotResult } from "@/lib/maps/depot-types";
import { formatDistanceKm } from "@/lib/maps/geo";
import {
  FRANCE_CENTER,
  FRANCE_DEFAULT_ZOOM,
  FRANCE_MAX_BOUNDS,
  FRANCE_MAX_ZOOM,
  FRANCE_MIN_ZOOM,
} from "@/lib/maps/france-bounds";
import {
  loadGoogleMapsApi,
  resolveGoogleMapsBrowserKey,
} from "@/lib/maps/google-maps-loader";
import {
  groupNearbyPoints,
  type SavedFournisseurMapPoint,
} from "@/lib/fourniture/map-points";
import "@/components/maps/fournisseur-map.css";

export type FournisseurMapProps = {
  company?: GeocodedLocation | null;
  depots?: OsmDepotResult[];
  /** Fournisseurs déjà enregistrés (marqueurs rouges). */
  savedFournisseurs?: SavedFournisseurMapPoint[];
  selectedOsmId?: string | null;
  highlightFournisseurId?: string | null;
  /** Rayon de recherche actif en km (cercle sur la carte). */
  radiusKm?: number;
  /** Incrémenter pour forcer un recentrage sur l'entreprise. */
  recenterKey?: number;
  onSelectDepot?: (depot: OsmDepotResult) => void;
  onConfirmDepot?: (depot: OsmDepotResult) => void;
  onOpenFournisseur?: (id: string) => void;
  emptyMessage?: string;
  height?: number;
  className?: string;
};

function formatDepotAddress(depot: OsmDepotResult): string {
  const cityLine = [depot.ville, depot.codePostal].filter(Boolean).join(" ");
  return [depot.adresse, cityLine].filter(Boolean).join(", ");
}

function formatSavedAddress(point: SavedFournisseurMapPoint): string {
  return [point.adresse, [point.codePostal, point.ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

function redMarkerIcon(googleMaps: typeof google.maps, scale = 9): google.maps.Symbol {
  return {
    path: googleMaps.SymbolPath.CIRCLE,
    scale,
    fillColor: "#DC2626",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

function depotMarkerIcon(
  googleMaps: typeof google.maps,
  selected: boolean,
): google.maps.Symbol {
  return {
    path: googleMaps.SymbolPath.CIRCLE,
    scale: selected ? 10 : 8,
    fillColor: selected ? "#2563EB" : "#3B82F6",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

function companyMarkerIcon(googleMaps: typeof google.maps): google.maps.Symbol {
  return {
    path: googleMaps.SymbolPath.CIRCLE,
    scale: 11,
    fillColor: "#0F172A",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2.5,
  };
}

function clampZoom(zoom: number): number {
  return Math.min(FRANCE_MAX_ZOOM, Math.max(FRANCE_MIN_ZOOM, zoom));
}

export default function FournisseurMap({
  company,
  depots = [],
  savedFournisseurs = [],
  selectedOsmId,
  highlightFournisseurId,
  radiusKm = 15,
  recenterKey = 0,
  onSelectDepot,
  onConfirmDepot,
  onOpenFournisseur,
  emptyMessage = "Renseignez l'adresse de votre entreprise dans Paramètres > Entreprise.",
  className = "",
}: FournisseurMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const googleRef = useRef<typeof google | null>(null);
  const callbacksRef = useRef({
    onSelectDepot,
    onConfirmDepot,
    onOpenFournisseur,
  });
  callbacksRef.current = { onSelectDepot, onConfirmDepot, onOpenFournisseur };

  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mapActive, setMapActive] = useState(false);

  const referenceCenter = useMemo((): { lat: number; lng: number } | null => {
    if (company) return { lat: company.latitude, lng: company.longitude };
    if (savedFournisseurs.length === 0) return null;
    const lat =
      savedFournisseurs.reduce((sum, item) => sum + item.latitude, 0) /
      savedFournisseurs.length;
    const lng =
      savedFournisseurs.reduce((sum, item) => sum + item.longitude, 0) /
      savedFournisseurs.length;
    return { lat, lng };
  }, [company, savedFournisseurs]);

  const savedGroups = useMemo(
    () => groupNearbyPoints(savedFournisseurs),
    [savedFournisseurs],
  );

  // Init Google Map once
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const key = await resolveGoogleMapsBrowserKey();
      if (!key) {
        if (!cancelled) {
          setLoadError(
            "Google Maps non configuré. Ajoutez GOOGLE_MAPS_API_KEY (ou NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).",
          );
        }
        return;
      }

      try {
        const g = await loadGoogleMapsApi(key);
        if (cancelled || !containerRef.current) return;

        googleRef.current = g;
        const center = referenceCenter
          ? referenceCenter
          : { lat: FRANCE_CENTER[0], lng: FRANCE_CENTER[1] };

        const map = new g.maps.Map(containerRef.current, {
          center,
          zoom: company ? 12 : savedFournisseurs.length > 0 ? 10 : FRANCE_DEFAULT_ZOOM,
          minZoom: FRANCE_MIN_ZOOM,
          maxZoom: FRANCE_MAX_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          rotateControl: false,
          scaleControl: false,
          // Zoom fluide molette + trackpad ; contrôles natifs désactivés (custom +/−).
          zoomControl: false,
          gestureHandling: "cooperative",
          scrollwheel: false,
          restriction: {
            latLngBounds: {
              south: FRANCE_MAX_BOUNDS[0][0],
              west: FRANCE_MAX_BOUNDS[0][1],
              north: FRANCE_MAX_BOUNDS[1][0],
              east: FRANCE_MAX_BOUNDS[1][1],
            },
            strictBounds: false,
          },
          clickableIcons: false,
          styles: [
            { featureType: "poi.business", stylers: [{ visibility: "off" }] },
          ],
        });

        mapRef.current = map;
        infoWindowRef.current = new g.maps.InfoWindow();
        if (!cancelled) setReady(true);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de charger Google Maps.",
          );
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      circleRef.current?.setMap(null);
      circleRef.current = null;
      infoWindowRef.current?.close();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  // Zoom molette / trackpad uniquement quand la carte est active (pas de saut hors zone).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    map.setOptions({
      gestureHandling: mapActive ? "greedy" : "cooperative",
      scrollwheel: mapActive,
    });
  }, [mapActive, ready]);

  // Sync markers / cercle / vue
  useEffect(() => {
    const map = mapRef.current;
    const g = googleRef.current;
    if (!map || !g || !ready) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();

    const bounds = new g.maps.LatLngBounds();
    let hasBounds = false;

    if (company) {
      const companyMarker = new g.maps.Marker({
        map,
        position: { lat: company.latitude, lng: company.longitude },
        icon: companyMarkerIcon(g.maps),
        title: "Votre entreprise",
        zIndex: 2000,
      });
      companyMarker.addListener("click", () => {
        infoWindowRef.current?.setContent(
          `<div class="batimum-map-popup"><p class="batimum-map-popup__title">Votre entreprise</p><p class="batimum-map-popup__line">${escapeHtml(
            company.formattedAddress,
          )}</p></div>`,
        );
        infoWindowRef.current?.open({ map, anchor: companyMarker });
      });
      markersRef.current.push(companyMarker);
      bounds.extend({ lat: company.latitude, lng: company.longitude });
      hasBounds = true;

      if (!circleRef.current) {
        circleRef.current = new g.maps.Circle({
          map,
          strokeColor: "#3b82f6",
          strokeOpacity: 0.35,
          strokeWeight: 1.5,
          fillColor: "#3b82f6",
          fillOpacity: 0.06,
        });
      }
      circleRef.current.setCenter({
        lat: company.latitude,
        lng: company.longitude,
      });
      circleRef.current.setRadius(Math.max(radiusKm, 1) * 1000);
      circleRef.current.setMap(map);
    } else {
      circleRef.current?.setMap(null);
    }

    for (const group of savedGroups) {
      const primary = group[0]!;
      const isHighlight = group.some(
        (item) => item.isNew || item.id === highlightFournisseurId,
      );
      const marker = new g.maps.Marker({
        map,
        position: { lat: primary.latitude, lng: primary.longitude },
        icon: redMarkerIcon(g.maps, group.length > 1 ? 11 : 9),
        title: primary.nom,
        zIndex: isHighlight ? 1500 : 500,
      });

      marker.addListener("click", () => {
        if (group.length > 1) {
          const clusterBounds = new g.maps.LatLngBounds();
          for (const item of group) {
            clusterBounds.extend({ lat: item.latitude, lng: item.longitude });
          }
          map.fitBounds(clusterBounds, 48);
          return;
        }

        const address = formatSavedAddress(primary);
        const lines = [
          `<p class="batimum-map-popup__title">${escapeHtml(primary.nom)}</p>`,
          address
            ? `<p class="batimum-map-popup__line">${escapeHtml(address)}</p>`
            : "",
          primary.telephone
            ? `<p class="batimum-map-popup__line">${escapeHtml(primary.telephone)}</p>`
            : "",
          primary.email
            ? `<p class="batimum-map-popup__line">${escapeHtml(primary.email)}</p>`
            : "",
        ]
          .filter(Boolean)
          .join("");

        infoWindowRef.current?.setContent(
          `<div class="batimum-map-popup">${lines}</div>`,
        );
        infoWindowRef.current?.open({ map, anchor: marker });
        callbacksRef.current.onOpenFournisseur?.(primary.id);
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: primary.latitude, lng: primary.longitude });
      hasBounds = true;

      if (isHighlight) {
        window.setTimeout(() => {
          g.maps.event.trigger(marker, "click");
        }, 280);
      }
    }

    for (const depot of depots) {
      const selected = depot.osmId === selectedOsmId;
      const marker = new g.maps.Marker({
        map,
        position: { lat: depot.latitude, lng: depot.longitude },
        icon: depotMarkerIcon(g.maps, selected),
        title: depot.name,
        zIndex: selected ? 1000 : 100,
      });

      marker.addListener("click", () => {
        callbacksRef.current.onSelectDepot?.(depot);
        const address = formatDepotAddress(depot);
        const confirmId = `batimum-confirm-${depot.osmId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
        const lines = [
          `<p class="batimum-map-popup__title">${escapeHtml(depot.name)}</p>`,
          address
            ? `<p class="batimum-map-popup__line">${escapeHtml(address)}</p>`
            : "",
          depot.distanceKm != null
            ? `<p class="batimum-map-popup__line">${escapeHtml(
                formatDistanceKm(depot.distanceKm),
              )}</p>`
            : "",
          depot.telephone
            ? `<p class="batimum-map-popup__line">${escapeHtml(depot.telephone)}</p>`
            : "",
          callbacksRef.current.onConfirmDepot
            ? `<button type="button" id="${confirmId}" class="batimum-map-popup__button">Choisir ce dépôt</button>`
            : "",
        ]
          .filter(Boolean)
          .join("");

        infoWindowRef.current?.setContent(
          `<div class="batimum-map-popup">${lines}</div>`,
        );
        infoWindowRef.current?.open({ map, anchor: marker });

        if (callbacksRef.current.onConfirmDepot) {
          window.setTimeout(() => {
            document.getElementById(confirmId)?.addEventListener(
              "click",
              () => callbacksRef.current.onConfirmDepot?.(depot),
              { once: true },
            );
          }, 0);
        }
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: depot.latitude, lng: depot.longitude });
      hasBounds = true;

      if (selected) {
        window.setTimeout(() => {
          g.maps.event.trigger(marker, "click");
        }, 200);
      }
    }

    // Recadrage initial / changement de contexte uniquement — pas après chaque dézoom.
  }, [
    ready,
    company,
    depots,
    savedGroups,
    selectedOsmId,
    highlightFournisseurId,
    radiusKm,
    recenterKey,
  ]);

  // Fit bounds when context changes (company / counts / recenter)
  const depotCount = depots.length;
  const savedCount = savedFournisseurs.length;
  useEffect(() => {
    const map = mapRef.current;
    const g = googleRef.current;
    if (!map || !g || !ready) return;

    if (!company && savedCount === 0 && depotCount === 0) {
      map.setCenter({ lat: FRANCE_CENTER[0], lng: FRANCE_CENTER[1] });
      map.setZoom(FRANCE_DEFAULT_ZOOM);
      return;
    }

    const bounds = new g.maps.LatLngBounds();
    if (company) bounds.extend({ lat: company.latitude, lng: company.longitude });
    for (const item of savedFournisseurs) {
      bounds.extend({ lat: item.latitude, lng: item.longitude });
    }
    for (const depot of depots) {
      bounds.extend({ lat: depot.latitude, lng: depot.longitude });
    }

    if (depotCount > 0 || savedCount > 0) {
      map.fitBounds(bounds, 56);
      return;
    }

    if (company) {
      map.setCenter({ lat: company.latitude, lng: company.longitude });
      map.setZoom(12);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fit only on context change
  }, [ready, company, depotCount, savedCount, radiusKm, recenterKey]);

  function zoomBy(delta: number) {
    const map = mapRef.current;
    if (!map) return;
    // Ancre le zoom sur le centre actuellement affiché (pas de saut vers l'entreprise).
    const current = map.getZoom() ?? FRANCE_DEFAULT_ZOOM;
    const center = map.getCenter();
    map.setZoom(clampZoom(current + delta));
    if (center) map.panTo(center);
  }

  function recenterOnCompany() {
    const map = mapRef.current;
    if (!map || !company) return;
    map.panTo({ lat: company.latitude, lng: company.longitude });
    map.setZoom(12);
  }

  return (
    <div
      className={`fournisseur-map-premium fournisseur-map-google ${className}`}
      onPointerEnter={() => setMapActive(true)}
      onPointerDown={() => setMapActive(true)}
      onPointerLeave={() => setMapActive(false)}
    >
      {!company && savedFournisseurs.length === 0 ? (
        <div className="fournisseur-map-placeholder-overlay">{emptyMessage}</div>
      ) : null}

      {loadError ? (
        <div className="fournisseur-map-placeholder-overlay">{loadError}</div>
      ) : null}

      <div ref={containerRef} className="fournisseur-map-google__canvas" />

      <div className="fournisseur-map-zoom">
        <button
          type="button"
          aria-label="Zoom avant"
          onClick={() => zoomBy(1)}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom arrière"
          onClick={() => zoomBy(-1)}
        >
          −
        </button>
      </div>

      {company ? (
        <button
          type="button"
          className="fournisseur-map-recenter"
          onClick={recenterOnCompany}
        >
          Recentrer sur mon entreprise
        </button>
      ) : null}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
