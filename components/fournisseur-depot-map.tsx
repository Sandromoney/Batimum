"use client";

import { useEffect, useRef } from "react";
import type { GeocodedLocation, OsmDepotResult } from "@/lib/maps/depot-types";
import { formatDistanceKm } from "@/lib/maps/geo";
import "leaflet/dist/leaflet.css";

type Props = {
  company?: GeocodedLocation;
  depots: OsmDepotResult[];
  selectedOsmId?: string | null;
  onSelectDepot?: (depot: OsmDepotResult) => void;
  onConfirmDepot?: (depot: OsmDepotResult) => void;
  className?: string;
};

export function FournisseurDepotMap({
  company,
  depots,
  selectedOsmId,
  onSelectDepot,
  onConfirmDepot,
  className = "",
}: Props) {
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    if (!mapNodeRef.current) return;

    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !mapNodeRef.current) return;

      if (!mapRef.current) {
        const center = company
          ? [company.latitude, company.longitude] as [number, number]
          : depots.length > 0
            ? ([depots[0].latitude, depots[0].longitude] as [number, number])
            : ([46.6, 2.4] as [number, number]);

        const map = L.map(mapNodeRef.current, { scrollWheelZoom: true }).setView(center, 11);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
        layerGroupRef.current = L.layerGroup().addTo(map);
      }

      const map = mapRef.current;
      const layerGroup = layerGroupRef.current;
      if (!map || !layerGroup) return;

      layerGroup.clearLayers();

      const bounds = L.latLngBounds([]);

      if (company) {
        const companyMarker = L.circleMarker([company.latitude, company.longitude], {
          radius: 8,
          color: "#ffffff",
          weight: 2,
          fillColor: "#10B981",
          fillOpacity: 1,
        });
        companyMarker.bindPopup(
          `<strong>Votre entreprise</strong><br/>${company.formattedAddress ?? ""}`,
        );
        layerGroup.addLayer(companyMarker);
        bounds.extend([company.latitude, company.longitude]);
      }

      for (const depot of depots) {
        const isSelected = depot.osmId === selectedOsmId;
        const marker = L.circleMarker([depot.latitude, depot.longitude], {
          radius: isSelected ? 9 : 7,
          color: isSelected ? "#10B981" : "#ffffff",
          weight: 2,
          fillColor: isSelected ? "#10B981" : "#2563EB",
          fillOpacity: 0.95,
        });

        const popupRoot = document.createElement("div");
        popupRoot.style.fontFamily = "sans-serif";
        popupRoot.style.fontSize = "12px";
        popupRoot.style.maxWidth = "240px";

        const title = document.createElement("strong");
        title.textContent = depot.name;
        popupRoot.appendChild(title);

        if (depot.adresse) {
          const address = document.createElement("p");
          address.style.margin = "4px 0 0";
          address.textContent = depot.adresse;
          popupRoot.appendChild(address);
        }

        const meta = document.createElement("p");
        meta.style.margin = "4px 0 0";
        meta.style.color = "#666";
        meta.textContent = [
          [depot.ville, depot.codePostal].filter(Boolean).join(" "),
          formatDistanceKm(depot.distanceKm),
        ]
          .filter(Boolean)
          .join(" · ");
        popupRoot.appendChild(meta);

        if (onConfirmDepot) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Choisir ce dépôt";
          button.style.marginTop = "8px";
          button.style.padding = "4px 10px";
          button.style.borderRadius = "8px";
          button.style.border = "1px solid #10B981";
          button.style.background = "#10B981";
          button.style.color = "#fff";
          button.style.cursor = "pointer";
          button.style.fontSize = "11px";
          button.onclick = () => onConfirmDepot(depot);
          popupRoot.appendChild(button);
        }

        marker.bindPopup(popupRoot);
        marker.on("click", () => onSelectDepot?.(depot));
        layerGroup.addLayer(marker);
        bounds.extend([depot.latitude, depot.longitude]);
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.12));
      } else if (company) {
        map.setView([company.latitude, company.longitude], 11);
      }

      map.invalidateSize();
    });

    return () => {
      cancelled = true;
    };
  }, [company, depots, selectedOsmId, onSelectDepot, onConfirmDepot]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  if (!company && depots.length === 0) {
    return (
      <div
        className={`flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-white p-6 text-center text-xs text-muted-foreground ${className}`}
      >
        Les dépôts trouvés s&apos;afficheront ici après une recherche.
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={mapNodeRef}
        className="min-h-[280px] w-full overflow-hidden rounded-xl border border-border/80"
      />
      <p className="mt-2 text-[10px] text-muted-foreground">
        Données issues d&apos;OpenStreetMap — vérifiez l&apos;adresse avant
        l&apos;enregistrement.
      </p>
    </div>
  );
}
