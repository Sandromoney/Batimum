"use client";

import { useEffect, useRef } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { GeocodedLocation, OsmDepotResult } from "@/lib/maps/depot-types";
import { formatDistanceKm } from "@/lib/maps/geo";
import { BATIMUM_MAP_TILES } from "@/lib/maps/map-tiles";
import {
  FRANCE_CENTER,
  FRANCE_DEFAULT_ZOOM,
  FRANCE_MAX_BOUNDS,
  FRANCE_MAX_ZOOM,
  FRANCE_MIN_ZOOM,
} from "@/lib/maps/france-bounds";
import {
  createCompanyMarkerIcon,
  createDepotMarkerIcon,
} from "@/components/maps/fournisseur-map-markers";
import "@/components/maps/fournisseur-map.css";

export type FournisseurMapProps = {
  company?: GeocodedLocation | null;
  depots?: OsmDepotResult[];
  selectedOsmId?: string | null;
  /** Rayon de recherche actif en km (cercle sur la carte). */
  radiusKm?: number;
  /** Incrémenter pour forcer un recentrage sur l'entreprise. */
  recenterKey?: number;
  onSelectDepot?: (depot: OsmDepotResult) => void;
  onConfirmDepot?: (depot: OsmDepotResult) => void;
  emptyMessage?: string;
  height?: number;
  className?: string;
};

function formatDepotAddress(depot: OsmDepotResult): string {
  const cityLine = [depot.ville, depot.codePostal].filter(Boolean).join(" ");
  return [depot.adresse, cityLine].filter(Boolean).join(", ");
}

function formatWebsiteHref(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function MapViewport({
  company,
  depots,
  radiusKm,
  recenterKey,
}: {
  company?: GeocodedLocation | null;
  depots: OsmDepotResult[];
  radiusKm: number;
  recenterKey?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!company) {
      map.setView(FRANCE_CENTER, FRANCE_DEFAULT_ZOOM);
      return;
    }

    if (depots.length > 0) {
      const bounds = L.latLngBounds(FRANCE_MAX_BOUNDS);
      const fit = L.latLngBounds([]);
      fit.extend([company.latitude, company.longitude]);
      for (const depot of depots) {
        fit.extend([depot.latitude, depot.longitude]);
      }
      if (fit.isValid()) {
        map.fitBounds(fit.pad(0.14));
        map.setMaxBounds(bounds);
        return;
      }
    }

    const radiusMeters = Math.max(radiusKm, 1) * 1000;
    const circleBounds = L.latLng(company.latitude, company.longitude).toBounds(
      radiusMeters * 2,
    );
    map.fitBounds(circleBounds.pad(0.08));
    map.setMaxBounds(L.latLngBounds(FRANCE_MAX_BOUNDS));
  }, [company, depots, radiusKm, recenterKey, map]);

  useEffect(() => {
    map.invalidateSize();
  }, [company, depots, radiusKm, map]);

  return null;
}

function AttributionControl() {
  const map = useMap();
  useEffect(() => {
    map.attributionControl?.setPrefix(false);
  }, [map]);
  return null;
}

function RecenterControl({ company }: { company: GeocodedLocation }) {
  const map = useMap();
  return (
    <button
      type="button"
      className="fournisseur-map-recenter"
      onClick={() => map.flyTo([company.latitude, company.longitude], 12, { duration: 0.4 })}
    >
      Recentrer sur mon entreprise
    </button>
  );
}

function DepotMarker({
  depot,
  isSelected,
  onSelectDepot,
  onConfirmDepot,
}: {
  depot: OsmDepotResult;
  isSelected: boolean;
  onSelectDepot?: (depot: OsmDepotResult) => void;
  onConfirmDepot?: (depot: OsmDepotResult) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const map = useMap();

  useEffect(() => {
    if (!isSelected) return;
    map.flyTo([depot.latitude, depot.longitude], Math.max(map.getZoom(), 14), {
      duration: 0.4,
    });
    const timeout = window.setTimeout(() => markerRef.current?.openPopup(), 320);
    return () => window.clearTimeout(timeout);
  }, [isSelected, depot.latitude, depot.longitude, map]);

  const address = formatDepotAddress(depot);

  return (
    <Marker
      ref={markerRef}
      position={[depot.latitude, depot.longitude]}
      icon={createDepotMarkerIcon(isSelected)}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{ click: () => onSelectDepot?.(depot) }}
    >
      <Popup closeButton>
        <div className="batimum-map-popup">
          <p className="batimum-map-popup__title">{depot.name}</p>
          {address ? <p className="batimum-map-popup__line">{address}</p> : null}
          {depot.distanceKm != null ? (
            <p className="batimum-map-popup__line">{formatDistanceKm(depot.distanceKm)}</p>
          ) : null}
          {depot.telephone ? (
            <p className="batimum-map-popup__line">{depot.telephone}</p>
          ) : null}
          {depot.siteWeb ? (
            <a
              href={formatWebsiteHref(depot.siteWeb)}
              target="_blank"
              rel="noopener noreferrer"
              className="batimum-map-popup__line inline-block text-emerald-700 hover:underline"
              onClick={(event) => {
                // Empêche la popup de se refermer par un comportement de clic inattendu
                event.stopPropagation();
              }}
            >
              {depot.siteWeb}
            </a>
          ) : null}
          {onConfirmDepot ? (
            <button
              type="button"
              className="batimum-map-popup__button"
              onClick={() => onConfirmDepot(depot)}
            >
              Choisir ce dépôt
            </button>
          ) : null}
        </div>
      </Popup>
    </Marker>
  );
}

export default function FournisseurMap({
  company,
  depots = [],
  selectedOsmId,
  radiusKm = 15,
  recenterKey = 0,
  onSelectDepot,
  onConfirmDepot,
  emptyMessage = "Renseignez l'adresse de votre entreprise dans Paramètres > Entreprise.",
  className = "",
}: FournisseurMapProps) {
  const mapCenter = company
    ? ([company.latitude, company.longitude] as [number, number])
    : FRANCE_CENTER;
  const mapZoom = company ? 12 : FRANCE_DEFAULT_ZOOM;

  const radiusMeters = company ? Math.max(radiusKm, 1) * 1000 : 0;

  return (
    <div className={`fournisseur-map-premium ${className}`}>
      {!company ? (
        <div className="fournisseur-map-placeholder-overlay">{emptyMessage}</div>
      ) : null}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        minZoom={FRANCE_MIN_ZOOM}
        maxZoom={FRANCE_MAX_ZOOM}
        maxBounds={FRANCE_MAX_BOUNDS}
        maxBoundsViscosity={0.95}
        scrollWheelZoom
        zoomControl={false}
        attributionControl
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url={BATIMUM_MAP_TILES.url}
          attribution={BATIMUM_MAP_TILES.attribution}
          subdomains={BATIMUM_MAP_TILES.subdomains}
          minZoom={BATIMUM_MAP_TILES.minZoom}
          maxZoom={BATIMUM_MAP_TILES.maxZoom}
        />
        <ZoomControl position="topright" />
        <AttributionControl />
        {company ? <RecenterControl company={company} /> : null}
        <MapViewport
          company={company}
          depots={depots}
          radiusKm={radiusKm}
          recenterKey={recenterKey}
        />

        {company ? (
          <Circle
            center={[company.latitude, company.longitude]}
            radius={radiusMeters}
            pathOptions={{
              color: "#10b981",
              weight: 1.5,
              opacity: 0.35,
              fillColor: "#10b981",
              fillOpacity: 0.06,
            }}
          />
        ) : null}

        {company ? (
          <Marker
            position={[company.latitude, company.longitude]}
            icon={createCompanyMarkerIcon()}
            zIndexOffset={2000}
          >
            <Popup closeButton>
              <div className="batimum-map-popup">
                <p className="batimum-map-popup__title">Votre entreprise</p>
                <p className="batimum-map-popup__line">{company.formattedAddress}</p>
              </div>
            </Popup>
          </Marker>
        ) : null}

        {depots.map((depot) => (
          <DepotMarker
            key={depot.osmId}
            depot={depot}
            isSelected={depot.osmId === selectedOsmId}
            onSelectDepot={onSelectDepot}
            onConfirmDepot={onConfirmDepot}
          />
        ))}
      </MapContainer>
    </div>
  );
}
