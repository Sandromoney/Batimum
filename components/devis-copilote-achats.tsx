"use client";

import { useMemo, useState } from "react";
import { FournisseursCarte } from "@/components/fournisseurs-carte";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildCopiloteAchats,
  buildCopiloteAchatsExportText,
} from "@/lib/copilote-achats";
import { formatCurrency } from "@/lib/utils";
import type { Client, Devis, Parametres } from "@/lib/types";

type Props = {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
};

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((col) => `"${String(col ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DevisCopiloteAchats({ devis, client, parametres }: Props) {
  const [showDetail, setShowDetail] = useState(false);

  const result = useMemo(
    () => buildCopiloteAchats(devis, client, parametres),
    [devis, client, parametres],
  );

  const exportText = buildCopiloteAchatsExportText(devis, client, result);
  const rentabiliteLabel =
    result.rentabilite === "bonne"
      ? "Bonne"
      : result.rentabilite === "moyenne"
        ? "Moyenne"
        : result.rentabilite === "faible"
          ? "Faible"
          : "À confirmer";

  const fournisseurProche = result.trajets[0];

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Comparatif achats</h2>
          <p className="text-sm text-muted-foreground">
            Copilote Achats — estimation, comparatif fournisseurs et rentabilité.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            const area = document.createElement("textarea");
            area.value = exportText;
            document.body.appendChild(area);
            area.select();
            document.execCommand("copy");
            document.body.removeChild(area);
          }}
        >
          Copier la liste
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border/80 p-3">
          <p className="text-xs text-muted-foreground">Rentabilité estimée</p>
          <p className="mt-1 text-lg font-semibold">{rentabiliteLabel}</p>
          <p className="text-sm text-muted-foreground">
            Marge : {result.margeEstimee ?? "N/A"} %
          </p>
        </div>
        <div className="rounded-xl border border-border/80 p-3">
          <p className="text-xs text-muted-foreground">Liste d&apos;achat</p>
          <p className="mt-1 text-lg font-semibold">{result.lignes.length} ligne(s)</p>
          <p className="text-sm text-muted-foreground">
            Coût matériaux estimé : {formatCurrency(result.coutMateriauxEstime)}
          </p>
        </div>
        <div className="rounded-xl border border-border/80 p-3">
          <p className="text-xs text-muted-foreground">Fournisseurs proches</p>
          <p className="mt-1 text-lg font-semibold">
            {fournisseurProche?.fournisseur.nom ?? result.fournisseurPrincipal?.nom ?? "Non déterminé"}
          </p>
          <p className="text-sm text-muted-foreground">
            {typeof fournisseurProche?.distanceKm === "number"
              ? `${fournisseurProche.distanceKm.toFixed(1)} km — ${fournisseurProche.tempsTrajetMin ?? "?"} min`
              : "Distance à estimer (adresse requise)"}
          </p>
        </div>
      </div>

      {result.meilleurPanier ? (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-medium">Meilleur panier matériaux</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.meilleurPanier.fournisseur.nom} —{" "}
            {formatCurrency(result.meilleurPanier.totalEstime)}
            {result.economieMeilleurPanier && result.economieMeilleurPanier > 0
              ? ` — économie estimée ${formatCurrency(result.economieMeilleurPanier)}`
              : ""}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setShowDetail((value) => !value)}
        >
          {showDetail ? "Masquer le détail" : "Voir le détail Copilote Achats"}
        </Button>
        <p className="text-xs text-muted-foreground">{result.explication}</p>
      </div>

      {showDetail ? (
        <>
          {result.paniers.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <p className="mb-2 text-sm font-medium">Panier matériaux estimé par fournisseur</p>
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2">Fournisseur</th>
                    <th className="px-2 py-2">Total estimé</th>
                    <th className="px-2 py-2">Lignes couvertes</th>
                    <th className="px-2 py-2">Distance</th>
                    <th className="px-2 py-2">Temps trajet</th>
                    <th className="px-2 py-2">Dispo. prix</th>
                  </tr>
                </thead>
                <tbody>
                  {result.paniers.map((panier) => (
                    <tr key={panier.fournisseur.id} className="border-t border-border/70">
                      <td className="px-2 py-2">
                        {panier.fournisseur.nom}
                        {panier.favori ? " ★" : ""}
                      </td>
                      <td className="px-2 py-2 font-medium">
                        {formatCurrency(panier.totalEstime)}
                      </td>
                      <td className="px-2 py-2">
                        {panier.lignesAvecPrix}/{panier.lignesTotal}
                      </td>
                      <td className="px-2 py-2">
                        {typeof panier.distanceKm === "number"
                          ? `${panier.distanceKm.toFixed(1)} km`
                          : "N/A"}
                      </td>
                      <td className="px-2 py-2">
                        {typeof panier.tempsTrajetMin === "number"
                          ? `${panier.tempsTrajetMin} min`
                          : "N/A"}
                      </td>
                      <td className="px-2 py-2">{panier.disponibilitePrix} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-4 space-y-4">
            {result.lignes.map((line) => (
              <div
                key={line.id}
                className="rounded-xl border border-border/80 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{line.designation}</p>
                    <p className="text-xs text-muted-foreground">
                      Qté {line.quantite} {line.unite ?? ""}
                    </p>
                  </div>
                  {line.explication ? (
                    <p className="text-xs text-primary">{line.explication}</p>
                  ) : null}
                </div>

                {line.comparatifs && line.comparatifs.length > 0 ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1 text-left">Fournisseur</th>
                          <th className="px-2 py-1 text-left">Prix public</th>
                          <th className="px-2 py-1 text-left">Remisé</th>
                          <th className="px-2 py-1 text-left">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {line.comparatifs.map((comp) => (
                          <tr
                            key={comp.fournisseur.id}
                            className={`border-t border-border/50 ${
                              comp.fournisseur.id === line.fournisseurConseille?.id
                                ? "bg-primary/5"
                                : ""
                            }`}
                          >
                            <td className="px-2 py-1.5">
                              {comp.fournisseur.nom}
                              {comp.fournisseur.favori ? " ★" : ""}
                            </td>
                            <td className="px-2 py-1.5">
                              {typeof comp.prixPublic === "number"
                                ? formatCurrency(comp.prixPublic)
                                : "Prix public non disponible"}
                            </td>
                            <td className="px-2 py-1.5">
                              {typeof comp.prixRemise === "number"
                                ? formatCurrency(comp.prixRemise)
                                : "—"}
                            </td>
                            <td className="px-2 py-1.5">
                              {typeof comp.coutTotal === "number"
                                ? formatCurrency(comp.coutTotal)
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <FournisseursCarte
              depotEntreprise={result.depotEntreprise}
              adresseChantier={result.chantierAdresse}
              adresseClient={result.clientAdresse}
              adresseManquante={result.adresseManquante}
              trajets={result.trajets}
            />
          </div>
        </>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => window.print()}>
          Imprimer
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            downloadCsv(
              `comparatif-achats-${devis.numero}.csv`,
              [
                [
                  "Materiau",
                  "Quantite",
                  "Unite",
                  "Fournisseur",
                  "Prix public",
                  "Remise %",
                  "Cout estime entreprise",
                ],
                ...result.lignes.map((line) => [
                  line.designation,
                  String(line.quantite),
                  line.unite ?? "",
                  line.fournisseurConseille?.nom ?? "",
                  line.prixPublic != null ? String(line.prixPublic) : "Prix public non disponible",
                  line.remisePourcent != null ? String(line.remisePourcent) : "",
                  line.coutEstimeEntreprise != null
                    ? String(line.coutEstimeEntreprise)
                    : "",
                ]),
              ],
            )
          }
        >
          Exporter liste d&apos;achat Excel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            downloadCsv(
              `comparatif-achats-${devis.numero}.pdf-like.csv`,
              [["Comparatif Achats"], [exportText]],
            )
          }
        >
          Exporter liste d&apos;achat PDF
        </Button>
      </div>
    </Card>
  );
}
