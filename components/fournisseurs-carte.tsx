"use client";

import type { TrajetFournisseur } from "@/lib/fournisseur-trajet";

type Props = {
  depotEntreprise?: string;
  adresseChantier?: string;
  adresseClient?: string;
  adresseManquante?: boolean;
  trajets: TrajetFournisseur[];
};

export function FournisseursCarte({
  depotEntreprise,
  adresseChantier,
  adresseClient,
  adresseManquante,
  trajets,
}: Props) {
  const adresseEffective = adresseChantier ?? adresseClient;

  return (
    <div className="rounded-xl border border-border/80 p-4">
      <h3 className="text-sm font-semibold">Carte fournisseurs</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Visualisation des adresses et trajets estimés (V1 — connecteur carte extensible).
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-card/50 p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Dépôt entreprise
          </p>
          <p className="mt-1 text-sm">
            {depotEntreprise || "Adresse entreprise non renseignée"}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card/50 p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Chantier / client
          </p>
          <p className="mt-1 text-sm">
            {adresseEffective ||
              (adresseManquante
                ? "Adresse manquante — renseignez l'adresse chantier ou client"
                : "Non renseignée")}
          </p>
        </div>
      </div>

      <div className="mt-4 min-h-[140px] rounded-lg border border-dashed border-border/80 bg-muted/20 p-4">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <span className="text-2xl">🗺️</span>
          <p>Carte interactive — à connecter via API (OpenStreetMap / Mapbox)</p>
          {trajets.length > 0 ? (
            <p>{trajets.length} fournisseur(s) positionné(s) sur le trajet estimé</p>
          ) : null}
        </div>
      </div>

      {trajets.length > 0 ? (
        <div className="mt-4 space-y-2">
          {trajets.slice(0, 5).map((trajet) => (
            <div
              key={trajet.fournisseur.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
            >
              <div>
                <p className="font-medium text-foreground">
                  {trajet.fournisseur.nom}
                  {trajet.fournisseur.favori ? " ★" : ""}
                </p>
                <p className="text-muted-foreground">{trajet.adresseComplete}</p>
              </div>
              <div className="text-right text-muted-foreground">
                <p>
                  Distance :{" "}
                  {typeof trajet.distanceKm === "number"
                    ? `${trajet.distanceKm.toFixed(1)} km`
                    : "N/A"}
                </p>
                <p>
                  Temps estimé :{" "}
                  {typeof trajet.tempsTrajetMin === "number"
                    ? `${trajet.tempsTrajetMin} min`
                    : "N/A"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
