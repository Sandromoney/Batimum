"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ParametresSection } from "@/components/parametres-section";
import { calculerPrixEstimeEntreprise, inferFamilleProduit } from "@/lib/fournisseur-utils";
import type { Fournisseur, FournisseurTarifLigne, Parametres } from "@/lib/types";
import { formatCurrency, formatDateFR } from "@/lib/utils";
import Link from "next/link";

type Props = {
  parametres: Parametres;
};

export function FournituresAchatsSection({ parametres }: Props) {
  const fournisseurs = parametres.fournisseurs ?? [];
  const tarifs = parametres.tarifsFournisseurs ?? [];
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTarifs = useMemo(() => {
    let lines = tarifs;
    if (selectedSupplierId !== "all") {
      lines = lines.filter((line) => line.fournisseurId === selectedSupplierId);
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return lines;
    return lines.filter((line) => {
      const haystack = [line.nomProduit, line.reference, line.categorie]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return query.split(/\s+/).every((token) => haystack.includes(token));
    });
  }, [tarifs, selectedSupplierId, searchQuery]);

  function getFournisseur(id: string): Fournisseur | undefined {
    return fournisseurs.find((item) => item.id === id);
  }

  function renderPrixLine(line: FournisseurTarifLigne) {
    const fournisseur = getFournisseur(line.fournisseurId);
    if (!fournisseur) return null;
    const famille = inferFamilleProduit(line.nomProduit);
    const prix = calculerPrixEstimeEntreprise(fournisseur, famille, line);
    return (
      <tr key={line.id} className="border-b border-border/50">
        <td className="px-2 py-3 font-medium text-foreground">{line.nomProduit}</td>
        <td className="px-2 py-3 text-muted-foreground">
          {fournisseur.nom}
          {fournisseur.favori ? " ★" : ""}
        </td>
        <td className="px-2 py-3">{line.categorie ?? famille}</td>
        <td className="px-2 py-3">{line.unite ?? "u"}</td>
        <td className="px-2 py-3">
          {typeof prix.prixPublic === "number"
            ? formatCurrency(prix.prixPublic)
            : "Prix public non disponible"}
        </td>
        <td className="px-2 py-3">
          {typeof prix.remisePourcent === "number"
            ? `${prix.remisePourcent.toFixed(1)} %`
            : "—"}
        </td>
        <td className="px-2 py-3 font-medium">
          {typeof prix.prixRemise === "number"
            ? formatCurrency(prix.prixRemise)
            : "—"}
        </td>
        <td className="px-2 py-3 text-xs text-muted-foreground">
          {line.dateImport ? formatDateFR(line.dateImport.slice(0, 10)) : "—"}
        </td>
        <td className="px-2 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              line.aVerifier
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "bg-primary/10 text-primary"
            }`}
          >
            {line.aVerifier ? "À vérifier" : "Validé"}
          </span>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      <ParametresSection
        title="Tarifs fournisseurs"
        description="Bibliothèque d'achats par fournisseur — utilisée par le Comparatif Achats MUM IA."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/parametres?section=fournisseurs"
            className="text-sm text-primary hover:underline"
          >
            Gérer les fournisseurs dans Paramètres →
          </Link>
        </div>
      </ParametresSection>

      {fournisseurs.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Aucun fournisseur configuré. Ajoutez vos fournisseurs dans Paramètres pour
          alimenter la bibliothèque d&apos;achats.
          <div className="mt-3">
            <Link
              href="/parametres?section=fournisseurs"
              className="inline-flex items-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Configurer les fournisseurs
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedSupplierId("all")}
              className={`rounded-full border px-3 py-1 text-xs ${
                selectedSupplierId === "all"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/80 text-muted-foreground"
              }`}
            >
              Toutes
            </button>
            {fournisseurs.map((fournisseur) => (
              <button
                key={fournisseur.id}
                type="button"
                onClick={() => setSelectedSupplierId(fournisseur.id)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selectedSupplierId === fournisseur.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/80 text-muted-foreground"
                }`}
              >
                {fournisseur.nom || "Fournisseur"}
                {fournisseur.favori ? " ★" : ""}
              </button>
            ))}
          </div>

          <Card className="p-5 sm:p-6">
            <div className="mb-4">
              <Label>Rechercher une fourniture</Label>
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Nom, référence, catégorie…"
              />
            </div>

            {filteredTarifs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tarifs.length === 0
                  ? "Aucun tarif importé. Importez un fichier CSV dans Paramètres > Fournisseurs."
                  : "Aucun résultat pour cette recherche."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/80 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="px-2 py-3">Produit</th>
                      <th className="px-2 py-3">Fournisseur</th>
                      <th className="px-2 py-3">Catégorie</th>
                      <th className="px-2 py-3">Unité</th>
                      <th className="px-2 py-3">Prix public</th>
                      <th className="px-2 py-3">Remise</th>
                      <th className="px-2 py-3">Prix estimé entreprise</th>
                      <th className="px-2 py-3">Mise à jour</th>
                      <th className="px-2 py-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody>{filteredTarifs.map(renderPrixLine)}</tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
