"use client";

import { useEffect, useMemo, useRef } from "react";
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
  createSavedFournisseurMarkerIcon,
} from "@/components/maps/fournisseur-map-markers";
import {
  groupNearbyPoints,
  jitterLatLng,
  type SavedFournisseurMapPoint,
} from "@/lib/fourniture/map-points";
import "@/components/maps/fournisseur-map.css";

export type FournisseurMapProps = {
  company?: GeocodedLocation | null;
  depots?: OsmDepotResult[];
  /** Fournisseurs déjà enregistrés (points rouges). */
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

function formatWebsiteHref(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Zoom molette uniquement après interaction avec la carte
 * (évite de bloquer le scroll de page par accident).
 * Sensibilité fortement réduite.
 */
function WheelZoomGate() {
  const map = useMap();

  useEffect(() => {
    map.scrollWheelZoom.disable();
    const container = map.getContainer();

    function enable() {
      container.dataset.mapActive = "1";
      map.scrollWheelZoom.enable();
    }

    function disable() {
      container.dataset.mapActive = "";
      map.scrollWheelZoom.disable();
    }

    function onPointerDown() {
      enable();
    }

    function onMouseLeave() {
      disable();
    }

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("mouseleave", onMouseLeave);
    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("mouseleave", onMouseLeave);
      map.scrollWheelZoom.disable();
    };
  }, [map]);

  return null;
}

/**
 * Recentage progressif vers la zone de référence (entreprise, sinon
 * centroïde fournisseurs) lorsque l'utilisateur dézoome trop loin.
 */
function SoftRecenterOnZoomOut({
  reference,
}: {
  reference: [number, number] | null;
}) {
  const map = useMap();
  const previousZoomRef = useRef(map.getZoom());

  useEffect(() => {
    if (!reference) return;

    const onZoomEnd = () => {
      const previous = previousZoomRef.current;
      const zoom = map.getZoom();
      previousZoomRef.current = zoom;

      // Uniquement en dézoom, sous le niveau « région »
      if (zoom >= previous) return;
      if (zoom > 8) return;

      const center = map.getCenter();
      const targetLat = center.lat + (reference[0] - center.lat) * 0.28;
      const targetLng = center.lng + (reference[1] - center.lng) * 0.28;
      map.panTo([targetLat, targetLng], {
        animate: true,
        duration: 0.4,
        easeLinearity: 0.25,
      });
    };

    map.on("zoomend", onZoomEnd);
    return () => {
      map.off("zoomend", onZoomEnd);
    };
  }, [map, reference]);

  return null;
}

function MapViewport({
  company,
  depots,
  savedFournisseurs,
  radiusKm,
  recenterKey,
}: {
  company?: GeocodedLocation | null;
  depots: OsmDepotResult[];
  savedFournisseurs: SavedFournisseurMapPoint[];
  radiusKm: number;
  recenterKey?: number;
}) {
  const map = useMap();

  // Recentrer uniquement si le contexte change (pas à chaque micro-update lat/lng).
  const savedCount = savedFournisseurs.length;
  const depotCount = depots.length;

  useEffect(() => {
    if (!company) {
      if (savedCount > 0) {
        const fit = L.latLngBounds([]);
        for (const item of savedFournisseurs) {
          fit.extend([item.latitude, item.longitude]);
        }
        if (fit.isValid()) {
          map.fitBounds(fit.pad(0.18));
          map.setMaxBounds(L.latLngBounds(FRANCE_MAX_BOUNDS));
          return;
        }
      }
      map.setView(FRANCE_CENTER, FRANCE_DEFAULT_ZOOM);
      return;
    }

    const fit = L.latLngBounds([]);
    fit.extend([company.latitude, company.longitude]);
    for (const depot of depots) {
      fit.extend([depot.latitude, depot.longitude]);
    }
    for (const item of savedFournisseurs) {
      fit.extend([item.latitude, item.longitude]);
    }

    if (depotCount > 0 || savedCount > 0) {
      if (fit.isValid()) {
        map.fitBounds(fit.pad(0.14));
        map.setMaxBounds(L.latLngBounds(FRANCE_MAX_BOUNDS));
        return;
      }
    }

    const radiusMeters = Math.max(radiusKm, 1) * 1000;
    const circleBounds = L.latLng(company.latitude, company.longitude).toBounds(
      radiusMeters * 2,
    );
    map.fitBounds(circleBounds.pad(0.08));
    map.setMaxBounds(L.latLngBounds(FRANCE_MAX_BOUNDS));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid refit on every coord tweak
  }, [company, depotCount, savedCount, radiusKm, recenterKey, map]);

  useEffect(() => {
    map.invalidateSize();
  }, [company, depotCount, savedCount, radiusKm, map]);

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
      onClick={() =>
        map.flyTo([company.latitude, company.longitude], 12, { duration: 0.45 })
      }
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
            <p className="batimum-map-popup__line">
              {formatDistanceKm(depot.distanceKm)}
            </p>
          ) : null}
          {depot.telephone ? (
            <p className="batimum-map-popup__line">{depot.telephone}</p>
          ) : null}
          {depot.siteWeb ? (
            <a
              href={formatWebsiteHref(depot.siteWeb)}
              target="_blank"
              rel="noopener noreferrer"
              className="batimum-map-popup__line inline-block text-accent-hover hover:underline"
              onClick={(event) => event.stopPropagation()}
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

function SavedFournisseurMarker({
  group,
  highlightId,
  onOpenFournisseur,
}: {
  group: SavedFournisseurMapPoint[];
  highlightId?: string | null;
  onOpenFournisseur?: (id: string) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const map = useMap();
  const primary = group[0]!;
  const isNew = group.some((item) => item.isNew || item.id === highlightId);
  const [lat, lng] = useMemo(() => {
    if (group.length === 1) {
      return jitterLatLng(primary.latitude, primary.longitude, primary.id, 0);
    }
    return [primary.latitude, primary.longitude] as [number, number];
  }, [group, primary]);

  useEffect(() => {
    if (!highlightId || !group.some((item) => item.id === highlightId)) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.45 });
    const timeout = window.setTimeout(() => markerRef.current?.openPopup(), 350);
    return () => window.clearTimeout(timeout);
  }, [highlightId, group, lat, lng, map]);

  useEffect(() => {
    if (!isNew) return;
    const timeout = window.setTimeout(() => markerRef.current?.openPopup(), 280);
    return () => window.clearTimeout(timeout);
  }, [isNew]);

  function onClusterClick() {
    if (group.length <= 1) return;
    const bounds = L.latLngBounds(group.map((item) => [item.latitude, item.longitude]));
    map.fitBounds(bounds.pad(0.35), { maxZoom: 15, animate: true });
  }

  return (
    <Marker
      ref={markerRef}
      position={[lat, lng]}
      icon={createSavedFournisseurMarkerIcon({
        isNew,
        count: group.length,
      })}
      zIndexOffset={isNew ? 1500 : 500}
      eventHandlers={{
        click: () => {
          if (group.length > 1) onClusterClick();
        },
      }}
    >
      <Popup closeButton>
        <div className="batimum-map-popup">
          {group.length === 1 ? (
            <>
              <p className="batimum-map-popup__title">{primary.nom}</p>
              {primary.nomDepot ? (
                <p className="batimum-map-popup__line">Dépôt : {primary.nomDepot}</p>
              ) : null}
              {[primary.adresse, [primary.codePostal, primary.ville].filter(Boolean).join(" ")]
                .filter(Boolean)
                .map((line) => (
                  <p key={line} className="batimum-map-popup__line">
                    {line}
                  </p>
                ))}
              {primary.telephone ? (
                <p className="batimum-map-popup__line">{primary.telephone}</p>
              ) : null}
              {primary.email ? (
                <p className="batimum-map-popup__line">{primary.email}</p>
              ) : null}
              {primary.categorie ? (
                <p className="batimum-map-popup__line">{primary.categorie}</p>
              ) : null}
              {primary.distanceKm != null ? (
                <p className="batimum-map-popup__line">
                  {formatDistanceKm(primary.distanceKm)}
                </p>
              ) : null}
              {onOpenFournisseur ? (
                <button
                  type="button"
                  className="batimum-map-popup__button batimum-map-popup__button--ghost"
                  onClick={() => onOpenFournisseur(primary.id)}
                >
                  Voir le fournisseur
                </button>
              ) : null}
            </>
          ) : (
            <>
              <p className="batimum-map-popup__title">
                {group.length} fournisseurs à proximité
              </p>
              <ul className="batimum-map-popup__list">
                {group.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="batimum-map-popup__list-item"
                      onClick={() => {
                        map.flyTo(
                          [item.latitude, item.longitude],
                          Math.max(map.getZoom(), 15),
                          { duration: 0.35 },
                        );
                        onOpenFournisseur?.(item.id);
                      }}
                    >
                      <span className="font-medium text-foreground">{item.nom}</span>
                      {item.ville ? (
                        <span className="block text-[11px] text-muted-foreground">
                          {item.ville}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Popup>
    </Marker>
  );
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
  const referenceCenter = useMemo((): [number, number] | null => {
    if (company) return [company.latitude, company.longitude];
    if (savedFournisseurs.length === 0) return null;
    const lat =
      savedFournisseurs.reduce((sum, item) => sum + item.latitude, 0) /
      savedFournisseurs.length;
    const lng =
      savedFournisseurs.reduce((sum, item) => sum + item.longitude, 0) /
      savedFournisseurs.length;
    return [lat, lng];
  }, [company, savedFournisseurs]);

  const mapCenter = referenceCenter ?? FRANCE_CENTER;
  const mapZoom = company ? 12 : savedFournisseurs.length > 0 ? 10 : FRANCE_DEFAULT_ZOOM;
  const radiusMeters = company ? Math.max(radiusKm, 1) * 1000 : 0;

  const savedGroups = useMemo(
    () => groupNearbyPoints(savedFournisseurs),
    [savedFournisseurs],
  );

  return (
    <div className={`fournisseur-map-premium ${className}`}>
      {!company && savedFournisseurs.length === 0 ? (
        <div className="fournisseur-map-placeholder-overlay">{emptyMessage}</div>
      ) : null}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        minZoom={FRANCE_MIN_ZOOM}
        maxZoom={FRANCE_MAX_ZOOM}
        maxBounds={FRANCE_MAX_BOUNDS}
        maxBoundsViscosity={0.95}
        scrollWheelZoom={false}
        wheelPxPerZoomLevel={220}
        zoomSnap={0.25}
        zoomDelta={0.35}
        wheelDebounceTime={55}
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
        <WheelZoomGate />
        <SoftRecenterOnZoomOut reference={referenceCenter} />
        {company ? <RecenterControl company={company} /> : null}
        <MapViewport
          company={company}
          depots={depots}
          savedFournisseurs={savedFournisseurs}
          radiusKm={radiusKm}
          recenterKey={recenterKey}
        />

        {company ? (
          <Circle
            center={[company.latitude, company.longitude]}
            radius={radiusMeters}
            pathOptions={{
              color: "#3b82f6",
              weight: 1.5,
              opacity: 0.35,
              fillColor: "#3b82f6",
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
                <p className="batimum-map-popup__line">
                  {company.formattedAddress}
                </p>
              </div>
            </Popup>
          </Marker>
        ) : null}

        {savedGroups.map((group) => (
          <SavedFournisseurMarker
            key={group.map((item) => item.id).join("-")}
            group={group}
            highlightId={highlightFournisseurId}
            onOpenFournisseur={onOpenFournisseur}
          />
        ))}

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
