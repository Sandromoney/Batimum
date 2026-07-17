"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getActivePriceEntries } from "@/lib/entreprise-price-library";
import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";
import {
  countTarifsForFournisseur,
  filterActiveFournisseursForCompany,
  getFournisseurDepotLabel,
  getFournisseurEnseigneLabel,
  isFournisseurActive,
} from "@/lib/fourniture/helpers";
import {
  exportComparatifPdf,
  type ComparatifPdfRow,
} from "@/lib/fourniture/pdf-export";
import { ttcFromHt } from "@/lib/fournisseur-prix-utils";
import type { EntreprisePriceLibraryEntry, Fournisseur, Parametres } from "@/lib/types";
import { formatCurrency, formatDateFR } from "@/lib/utils";
import { Download, Search, Sparkles } from "lucide-react";

type Props = {
  parametres: Parametres;
  companyId: string;
  initialSearch?: string;
  onParametresChange?: (patch: Partial<Parametres>) => void;
};

type ComparatifGroupe = {
  key: string;
  label: string;
  lignes: Array<{
    entry: EntreprisePriceLibraryEntry;
    fournisseur?: Fournisseur;
  }>;
};

function matchesSearch(entry: EntreprisePriceLibraryEntry, query: string): boolean {
  const tokens = query.split(/\s+/).filter(Boolean);
  const haystack = [entry.name, entry.reference, entry.category, entry.supplierName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function getBestPriceEntryId(
  lignes: ComparatifGroupe["lignes"],
): string | null {
  const priced = lignes.filter((line) => line.entry.purchasePriceHT != null);
  if (priced.length === 0) return null;

  const best = priced.reduce((current, candidate) =>
    (candidate.entry.purchasePriceHT ?? Infinity) <
    (current.entry.purchasePriceHT ?? Infinity)
      ? candidate
      : current,
  );
  return best.entry.id;
}

function getBestVerifiedEntryId(
  lignes: ComparatifGroupe["lignes"],
): string | null {
  const verified = lignes.filter(
    (line) => line.entry.isVerified && line.entry.purchasePriceHT != null,
  );
  if (verified.length === 0) return null;

  const best = verified.reduce((current, candidate) =>
    (candidate.entry.purchasePriceHT ?? Infinity) <
    (current.entry.purchasePriceHT ?? Infinity)
      ? candidate
      : current,
  );
  return best.entry.id;
}

function enrichEntry(
  entry: EntreprisePriceLibraryEntry,
  fournisseurById: Map<string, Fournisseur>,
) {
  return {
    entry,
    fournisseur: entry.supplierId
      ? fournisseurById.get(entry.supplierId)
      : undefined,
  };
}

export function BibliothequeComparatifView({
  parametres,
  companyId,
  initialSearch = "",
  onParametresChange,
}: Props) {
  const library = parametres.entreprisePriceLibrary ?? { entries: [] };
  const useBestPrice = Boolean(library.useBestPriceInMumIA);
  const [search, setSearch] = useState(initialSearch);
  const [savedMessage, setSavedMessage] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  const fournisseurs = useMemo(
    () =>
      filterActiveFournisseursForCompany(
        parametres.fournisseurs ?? [],
        companyId,
      ),
    [parametres.fournisseurs, companyId],
  );

  const fournisseurById = useMemo(
    () => new Map(fournisseurs.map((f) => [f.id, f])),
    [fournisseurs],
  );

  const archivedSupplierIds = useMemo(() => {
    return new Set(
      (parametres.fournisseurs ?? [])
        .filter((item) => !isFournisseurActive(item))
        .map((item) => item.id),
    );
  }, [parametres.fournisseurs]);

  const entries = useMemo(
    () =>
      [...getActivePriceEntries(library, companyId)]
        .filter(
          (entry) =>
            !entry.supplierId || !archivedSupplierIds.has(entry.supplierId),
        )
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [library, companyId, archivedSupplierIds],
  );

  const searchQuery = search.trim().toLowerCase();

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries;
    return entries.filter((entry) => matchesSearch(entry, searchQuery));
  }, [entries, searchQuery]);

  const groupes = useMemo(() => {
    if (!searchQuery) return [];

    const map = new Map<string, ComparatifGroupe>();
    for (const entry of filteredEntries) {
      const key = normalizeBibliothequeKey(entry.name);
      const group = map.get(key) ?? { key, label: entry.name, lignes: [] };
      group.lignes.push(enrichEntry(entry, fournisseurById));
      map.set(key, group);
    }

    return [...map.values()]
      .map((group) => ({
        ...group,
        lignes: [...group.lignes].sort(
          (a, b) =>
            (a.entry.purchasePriceHT ?? Infinity) -
            (b.entry.purchasePriceHT ?? Infinity),
        ),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [filteredEntries, searchQuery, fournisseurById]);

  const flatRows = useMemo(
    () => filteredEntries.map((entry) => enrichEntry(entry, fournisseurById)),
    [filteredEntries, fournisseurById],
  );

  const supplierSummaries = useMemo(() => {
    const tarifs = parametres.tarifsFournisseurs ?? [];
    return fournisseurs.map((fournisseur) => {
      const libraryCount = entries.filter(
        (entry) => entry.supplierId === fournisseur.id,
      ).length;
      const tarifCount = countTarifsForFournisseur(tarifs, fournisseur.id);
      const productCount = Math.max(libraryCount, tarifCount);
      const lastUpdate =
        fournisseur.dateDerniereMiseAJour?.slice(0, 10) ??
        fournisseur.updatedAt?.slice(0, 10) ??
        fournisseur.createdAt?.slice(0, 10) ??
        null;

      return { fournisseur, productCount, lastUpdate };
    });
  }, [entries, fournisseurs, parametres.tarifsFournisseurs]);

  const bestByProductKey = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const groupe of groupes) {
      map.set(groupe.key, getBestVerifiedEntryId(groupe.lignes));
    }
    return map;
  }, [groupes]);

  function toggleMumIaBestPrice() {
    if (!onParametresChange) return;
    onParametresChange({
      entreprisePriceLibrary: {
        ...library,
        useBestPriceInMumIA: !useBestPrice,
      },
    });
    setSavedMessage(
      !useBestPrice
        ? "MUM IA utilisera le meilleur prix vérifié de la bibliothèque."
        : "Option désactivée.",
    );
    window.setTimeout(() => setSavedMessage(""), 3500);
  }

  async function handleExportPdf() {
    if (flatRows.length === 0) return;
    setExportLoading(true);
    try {
      const pdfRows: ComparatifPdfRow[] = flatRows.map(({ entry, fournisseur }) => {
        const productKey = normalizeBibliothequeKey(entry.name);
        const bestId = bestByProductKey.get(productKey);
        const isBest =
          searchQuery && bestId != null
            ? entry.id === bestId
            : entry.isVerified &&
              entry.purchasePriceHT != null &&
              flatRows
                .filter(
                  (row) =>
                    normalizeBibliothequeKey(row.entry.name) === productKey &&
                    row.entry.isVerified &&
                    row.entry.purchasePriceHT != null,
                )
                .every(
                  (row) =>
                    (row.entry.purchasePriceHT ?? Infinity) >=
                    (entry.purchasePriceHT ?? Infinity),
                );

        return { entry, fournisseur, isBest };
      });
      await exportComparatifPdf(search.trim(), pdfRows);
    } finally {
      setExportLoading(false);
    }
  }

  function renderRow(
    { entry, fournisseur }: { entry: EntreprisePriceLibraryEntry; fournisseur?: Fournisseur },
    isBest: boolean,
  ) {
    const vat = entry.vatRate ?? 20;
    const prixHT = entry.purchasePriceHT;
    const prixTTC = prixHT != null ? ttcFromHt(prixHT, vat) : undefined;
    const venteHT = entry.salePriceHT;
    const venteTTC = venteHT != null ? ttcFromHt(venteHT, vat) : undefined;

    return (
      <tr
        key={entry.id}
        className={`border-t border-border/50 ${isBest ? "border-l-2 border-l-primary" : ""}`}
      >
        <td className="px-3 py-2.5 font-medium">{entry.name}</td>
        <td className="px-3 py-2.5">{entry.reference ?? "—"}</td>
        <td className="px-3 py-2.5 font-medium">
          {fournisseur
            ? getFournisseurEnseigneLabel(fournisseur)
            : entry.supplierName ?? "—"}
          {isBest ? (
            <span className="ml-2 rounded-full border border-primary/30 bg-white px-2 py-0.5 text-[10px] font-semibold text-primary">
              Meilleur prix vérifié
            </span>
          ) : null}
        </td>
        <td className="px-3 py-2.5 text-muted-foreground">
          {fournisseur ? getFournisseurDepotLabel(fournisseur) : "—"}
        </td>
        <td className="px-3 py-2.5 tabular-nums font-medium">
          {prixHT != null ? formatCurrency(prixHT) : "—"}
        </td>
        <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
          {prixTTC != null ? formatCurrency(prixTTC) : "—"}
        </td>
        <td className="px-3 py-2.5 tabular-nums">
          {venteHT != null ? formatCurrency(venteHT) : "—"}
        </td>
        <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
          {venteTTC != null ? formatCurrency(venteTTC) : "—"}
        </td>
        <td className="px-3 py-2.5">{vat} %</td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground">
          {formatDateFR(entry.lastUpdatedAt.slice(0, 10))}
        </td>
        <td className="px-3 py-2.5">
          {entry.isVerified ? (
            <span className="text-xs text-primary">Vérifié</span>
          ) : (
            <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-medium text-amber-800">
              À vérifier
            </span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-border/70 bg-white shadow-sm">
        <div className="border-b border-border/60 bg-neutral-50/80 px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">Mes fournisseurs</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Tous les fournisseurs enregistrés dans l&apos;onglet Fournisseurs
            apparaissent ici automatiquement.
          </p>
        </div>
        {supplierSummaries.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Aucun fournisseur enregistré. Ajoutez-en un depuis l&apos;onglet
            Fournisseurs.
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {supplierSummaries.map(({ fournisseur, productCount, lastUpdate }) => (
              <div
                key={fournisseur.id}
                className="grid gap-2 px-5 py-4 sm:grid-cols-[1.2fr_1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {getFournisseurEnseigneLabel(fournisseur)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {getFournisseurDepotLabel(fournisseur)}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>
                    {[fournisseur.adresseDepot, fournisseur.ville, fournisseur.codePostal]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                  <p className="mt-1">
                    {productCount} produit{productCount > 1 ? "s" : ""}
                    {lastUpdate
                      ? ` · MAJ ${formatDateFR(lastUpdate)}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center sm:justify-end">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Actif
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <section className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit pour comparer les prix entre vos fournisseurs…"
          className="h-12 rounded-2xl border-border/80 bg-white pl-12 text-base shadow-sm"
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filteredEntries.length} produit{filteredEntries.length > 1 ? "s" : ""}
          {searchQuery ? ` pour « ${search.trim()} »` : " au total"}
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={exportLoading || flatRows.length === 0}
          onClick={() => void handleExportPdf()}
        >
          <Download className="h-4 w-4" />
          {exportLoading ? "Export…" : "Exporter le comparatif en PDF"}
        </Button>
      </div>

      {filteredEntries.length === 0 ? (
        <Card className="bg-white p-10 text-center text-sm text-muted-foreground shadow-sm">
          {searchQuery
            ? `Aucun produit trouvé pour « ${search.trim()} ».`
            : "Aucun produit enregistré. Ajoutez des produits depuis l'onglet Produits."}
        </Card>
      ) : searchQuery ? (
        <div className="space-y-4">
          {groupes.map((groupe) => {
            const bestVerifiedId = getBestVerifiedEntryId(groupe.lignes);
            const bestLine = groupe.lignes.find(
              (line) => line.entry.id === bestVerifiedId,
            );
            const bestSupplierName = bestLine
              ? bestLine.fournisseur
                ? getFournisseurEnseigneLabel(bestLine.fournisseur)
                : bestLine.entry.supplierName ?? "—"
              : null;

            return (
              <Card
                key={groupe.key}
                className="overflow-hidden border-border/70 bg-white shadow-sm"
              >
                <div className="border-b border-border/60 bg-white px-5 py-4">
                  <h3 className="text-lg font-semibold text-foreground">{groupe.label}</h3>
                  <div className="mt-3 space-y-1.5">
                    {groupe.lignes.map(({ entry, fournisseur }) => {
                      const isBest =
                        bestVerifiedId != null && entry.id === bestVerifiedId;
                      const supplierName = fournisseur
                        ? getFournisseurEnseigneLabel(fournisseur)
                        : entry.supplierName ?? "—";
                      return (
                        <div
                          key={entry.id}
                          className={`flex items-center justify-between gap-3 text-sm ${
                            isBest
                              ? "font-semibold text-primary"
                              : "text-foreground"
                          }`}
                        >
                          <span>
                            {supplierName}
                            {!entry.isVerified ? (
                              <span className="ml-2 text-[10px] font-normal text-amber-700">
                                À vérifier
                              </span>
                            ) : null}
                          </span>
                          <span className="tabular-nums">
                            {entry.purchasePriceHT != null
                              ? formatCurrency(entry.purchasePriceHT)
                              : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {bestSupplierName ? (
                    <p className="mt-3 text-sm font-medium text-foreground">
                      → Meilleur prix vérifié : {bestSupplierName}
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Aucun prix vérifié pour ce produit — les lignes « À vérifier »
                      ne sont pas retenues comme meilleur prix officiel.
                    </p>
                  )}
                </div>
                <div className="overflow-x-auto p-4 sm:p-5">
                  <table className="w-full min-w-[1200px] text-sm">
                    <thead className="bg-white text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="pb-2 pr-3">Produit</th>
                        <th className="pb-2 pr-3">Référence</th>
                        <th className="pb-2 pr-3">Fournisseur</th>
                        <th className="pb-2 pr-3">Dépôt</th>
                        <th className="pb-2 pr-3">Prix achat HT</th>
                        <th className="pb-2 pr-3">Prix achat TTC</th>
                        <th className="pb-2 pr-3">Prix vente HT</th>
                        <th className="pb-2 pr-3">Prix vente TTC</th>
                        <th className="pb-2 pr-3">TVA</th>
                        <th className="pb-2 pr-3">Mise à jour</th>
                        <th className="pb-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupe.lignes.map((line) =>
                        renderRow(
                          line,
                          bestVerifiedId != null && line.entry.id === bestVerifiedId,
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden border-border/70 bg-white shadow-sm">
          <div className="overflow-x-auto p-4 sm:p-5">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">Produit</th>
                  <th className="pb-2 pr-3">Référence</th>
                  <th className="pb-2 pr-3">Fournisseur</th>
                  <th className="pb-2 pr-3">Dépôt</th>
                  <th className="pb-2 pr-3">Prix achat HT</th>
                  <th className="pb-2 pr-3">Prix achat TTC</th>
                  <th className="pb-2 pr-3">Prix vente HT</th>
                  <th className="pb-2 pr-3">Prix vente TTC</th>
                  <th className="pb-2 pr-3">TVA</th>
                  <th className="pb-2 pr-3">Mise à jour</th>
                  <th className="pb-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {flatRows.map((line) => renderRow(line, false))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="border border-border/70 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Utiliser automatiquement le meilleur prix vérifié dans MUM IA
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              La recherche et la comparaison se font uniquement dans cet onglet.
            </p>
            {savedMessage ? (
              <p className="mt-2 text-xs font-medium text-primary">{savedMessage}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant={useBestPrice ? "primary" : "secondary"}
            onClick={toggleMumIaBestPrice}
            disabled={!onParametresChange}
          >
            <Sparkles className="h-4 w-4" />
            {useBestPrice ? "Activé" : "Activer"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
