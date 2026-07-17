"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProduitFormModal, type ProduitFormValues } from "@/components/produit-form-modal";
import { TarifImportPreviewDialog } from "@/components/tarif-import-preview-dialog";
import { buildAuthenticatedFetchInit } from "@/lib/authenticated-api-fetch";
import { broadcastMumIaQuotaRefresh } from "@/lib/mum-ia-quota-events";
import {
  buildImportPreviewRows,
  previewRowsToPriceEntries,
  previewRowsToTarifLignes,
  type ImportPreviewRow,
} from "@/lib/entreprise-price-library/import";
import { upsertPriceEntry } from "@/lib/entreprise-price-library/crud";
import { normalizeEntreprisePriceLibrary } from "@/lib/entreprise-price-library/normalize";
import {
  countTarifsForFournisseur,
  filterActiveFournisseursForCompany,
  filterFournisseursForCompany,
  getFournisseurDepotLabel,
  getFournisseurEnseigneLabel,
} from "@/lib/fourniture/helpers";
import { formatUnitAbbr } from "@/lib/fourniture/product-units";
import { computePurchaseMargin } from "@/lib/fourniture/sale-price-modes";
import {
  extractImportableText,
  getTarifPrixAchatHT,
} from "@/lib/fournisseur-prix-utils";
import { parseTarifCsv } from "@/lib/fournisseur-utils";
import type { FournisseurTarifLigne, Parametres } from "@/lib/types";
import { formatCurrency, formatDateFR, generateId } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  FileUp,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";

type Props = {
  parametres: Parametres;
  companyId: string;
  onParametresChange: (patch: Partial<Parametres>) => void;
};

type SortKey =
  | "reference"
  | "designation"
  | "unite"
  | "achat"
  | "vente"
  | "marge"
  | "statut"
  | "maj";

const PAGE_SIZE = 25;

function mapTarifSource(
  source: FournisseurTarifLigne["sourceImport"],
): "manual" | "import_pdf" | "import_excel" | "import_csv" | "mum_ai" {
  if (source === "pdf") return "import_pdf";
  if (source === "excel") return "import_excel";
  if (source === "csv") return "import_csv";
  if (source === "ia") return "mum_ai";
  return "manual";
}

export function BibliothequeProduitsView({
  parametres,
  companyId,
  onParametresChange,
}: Props) {
  const activeFournisseurs = filterActiveFournisseursForCompany(
    parametres.fournisseurs ?? [],
    companyId,
  );
  const allCompanyFournisseurs = filterFournisseursForCompany(
    parametres.fournisseurs ?? [],
    companyId,
  );
  const safeTarifs = parametres.tarifsFournisseurs ?? [];
  const normalizedLibrary = useMemo(
    () =>
      normalizeEntreprisePriceLibrary(parametres.entreprisePriceLibrary, companyId),
    [parametres.entreprisePriceLibrary, companyId],
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    activeFournisseurs[0]?.id ?? null,
  );
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<FournisseurTarifLigne | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("designation");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const [importStep, setImportStep] = useState<"closed" | "choose" | "ready">(
    "closed",
  );
  const [importFormat, setImportFormat] = useState<"pdf" | "excel" | "csv" | null>(
    null,
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [pendingSource, setPendingSource] =
    useState<FournisseurTarifLigne["sourceImport"]>("csv");

  const selected =
    activeFournisseurs.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && activeFournisseurs.some((item) => item.id === selectedId)) {
      return;
    }
    setSelectedId(activeFournisseurs[0]?.id ?? null);
  }, [activeFournisseurs, selectedId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!highlightedProductId) return;
    const timer = window.setTimeout(() => setHighlightedProductId(null), 1100);
    return () => window.clearTimeout(timer);
  }, [highlightedProductId]);

  const selectedTarifs = useMemo(() => {
    if (!selected) return [];
    return safeTarifs.filter((line) => line.fournisseurId === selected.id);
  }, [selected, safeTarifs]);

  const lastImport = useMemo(() => {
    const imported = selectedTarifs.filter(
      (line) =>
        line.sourceImport === "pdf" ||
        line.sourceImport === "excel" ||
        line.sourceImport === "csv" ||
        line.sourceImport === "ia",
    );
    if (imported.length === 0) return null;
    return [...imported].sort((a, b) =>
      b.dateImport.localeCompare(a.dateImport),
    )[0]?.dateImport;
  }, [selectedTarifs]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = selectedTarifs;
    if (q) {
      rows = rows.filter((line) => {
        const hay = `${line.reference ?? ""} ${line.nomProduit}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const sorted = [...rows].sort((a, b) => {
      const achatA = getTarifPrixAchatHT(a) ?? -1;
      const achatB = getTarifPrixAchatHT(b) ?? -1;
      const margeA = computePurchaseMargin(achatA > 0 ? achatA : undefined, a.prixVenteHT)
        .margePourcent;
      const margeB = computePurchaseMargin(achatB > 0 ? achatB : undefined, b.prixVenteHT)
        .margePourcent;

      let cmp = 0;
      switch (sortKey) {
        case "reference":
          cmp = (a.reference ?? "").localeCompare(b.reference ?? "", "fr");
          break;
        case "unite":
          cmp = (a.unite ?? "").localeCompare(b.unite ?? "", "fr");
          break;
        case "achat":
          cmp = achatA - achatB;
          break;
        case "vente":
          cmp = (a.prixVenteHT ?? -1) - (b.prixVenteHT ?? -1);
          break;
        case "marge":
          cmp = (margeA ?? -1) - (margeB ?? -1);
          break;
        case "statut":
          cmp = Number(Boolean(a.aVerifier)) - Number(Boolean(b.aVerifier));
          break;
        case "maj":
          cmp = a.dateImport.localeCompare(b.dateImport);
          break;
        default:
          cmp = a.nomProduit.localeCompare(b.nomProduit, "fr");
      }
      return sortAsc ? cmp : -cmp;
    });

    return sorted;
  }, [selectedTarifs, search, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const pageRows = filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [selectedId, search, sortKey, sortAsc]);

  function patch(next: Partial<Parametres>) {
    onParametresChange(next);
  }

  function updateTarifsForSupplier(
    fournisseurId: string,
    nextTarifs: FournisseurTarifLigne[],
  ) {
    patch({
      tarifsFournisseurs: [
        ...safeTarifs.filter((line) => line.fournisseurId !== fournisseurId),
        ...nextTarifs,
      ],
      fournisseurs: (parametres.fournisseurs ?? []).map((item) =>
        item.id === fournisseurId
          ? { ...item, dateDerniereMiseAJour: new Date().toISOString() }
          : item,
      ),
    });
  }

  function openCreate() {
    setEditingLine(null);
    setProductModalOpen(true);
  }

  function openEdit(line: FournisseurTarifLigne) {
    setEditingLine(line);
    setProductModalOpen(true);
    setMenuOpenId(null);
  }

  function saveProduct(values: ProduitFormValues) {
    if (!selected) return;

    const line: FournisseurTarifLigne = {
      id: editingLine?.id ?? generateId(),
      fournisseurId: selected.id,
      reference: values.reference,
      nomProduit: values.nomProduit,
      categorie: values.categorie,
      unite: values.unite,
      conditionnement: values.conditionnement,
      commentaire: values.commentaire,
      prixEntrepriseSaisi: values.prixAchatHT,
      prixRemise: values.prixAchatHT,
      tauxTVA: values.tauxTVA,
      prixAchatTTC: values.prixAchatTTC,
      prixVenteHT: values.prixVenteHT,
      prixVenteTTC: values.prixVenteTTC,
      dateImport: new Date().toISOString(),
      sourceImport: editingLine?.sourceImport ?? "manuel",
      fichierImport: editingLine?.fichierImport,
      aVerifier: values.aVerifier,
    };

    const exists = selectedTarifs.some((item) => item.id === line.id);
    const next = exists
      ? selectedTarifs.map((item) => (item.id === line.id ? line : item))
      : [line, ...selectedTarifs];
    updateTarifsForSupplier(selected.id, next);

    patch({
      entreprisePriceLibrary: upsertPriceEntry(normalizedLibrary, {
        companyId,
        name: line.nomProduit.trim(),
        reference: line.reference,
        category: line.categorie,
        unit: line.unite ?? "u",
        type: "material",
        supplierId: selected.id,
        supplierName: selected.nom,
        purchasePriceHT: values.prixAchatHT,
        salePriceHT: values.prixVenteHT,
        vatRate: values.tauxTVA,
        source: mapTarifSource(line.sourceImport),
        confidence: values.aVerifier ? 55 : 90,
        isVerified: !values.aVerifier,
        notes: values.commentaire,
      }),
    });

    setProductModalOpen(false);
    setEditingLine(null);
    setHighlightedProductId(line.id);
    setNotice(
      `Le produit a été ${exists ? "mis à jour" : "ajouté"} à ${getFournisseurEnseigneLabel(selected)}.`,
    );
  }

  function duplicateProduct(line: FournisseurTarifLigne) {
    if (!selected) return;
    const copy: FournisseurTarifLigne = {
      ...line,
      id: generateId(),
      nomProduit: `${line.nomProduit} (copie)`,
      dateImport: new Date().toISOString(),
      sourceImport: "manuel",
      aVerifier: true,
    };
    updateTarifsForSupplier(selected.id, [copy, ...selectedTarifs]);
    setHighlightedProductId(copy.id);
    setMenuOpenId(null);
    setNotice(`Produit dupliqué pour ${getFournisseurEnseigneLabel(selected)}.`);
  }

  function removeProduct(lineId: string) {
    if (!selected) return;
    if (!window.confirm("Supprimer ce produit ?")) return;
    updateTarifsForSupplier(
      selected.id,
      selectedTarifs.filter((line) => line.id !== lineId),
    );
    setMenuOpenId(null);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function resetImport() {
    setImportStep("closed");
    setImportFormat(null);
    setPendingFile(null);
    setImportLoading(false);
  }

  async function analyzePendingFile() {
    if (!selected || !pendingFile || !importFormat) return;
    setImportLoading(true);
    try {
      if (importFormat === "csv") {
        const content = await pendingFile.text();
        const rows = parseTarifCsv(content);
        if (rows.length === 0) {
          setNotice("Aucune ligne détectée dans le CSV.");
          setImportLoading(false);
          return;
        }
        setPendingSource("csv");
        setPreviewRows(
          buildImportPreviewRows({
            library: normalizedLibrary,
            companyId,
            supplierId: selected.id,
            supplierName: selected.nom,
            source: "import_csv",
            fichierImport: pendingFile.name,
            existingTarifs: selectedTarifs,
            rows,
          }),
        );
        setPreviewOpen(true);
        resetImport();
        return;
      }

      const content = await extractImportableText(pendingFile);
      const source = importFormat === "pdf" ? "pdf" : "excel";
      const response = await fetch(
        "/api/ia/import-tarif-fournisseur",
        await buildAuthenticatedFetchInit({
          method: "POST",
          body: JSON.stringify({
            fournisseurId: selected.id,
            fileName: pendingFile.name,
            content,
            source,
          }),
        }),
      );
      const data = (await response.json()) as {
        ok?: boolean;
        lignes?: FournisseurTarifLigne[];
        error?: string;
      };
      if (!response.ok || !data.ok || !data.lignes?.length) {
        setNotice(data.error ?? "Analyse IA impossible.");
        setImportLoading(false);
        return;
      }
      broadcastMumIaQuotaRefresh();
      setPendingSource(source);
      setPreviewRows(
        buildImportPreviewRows({
          library: normalizedLibrary,
          companyId,
          supplierId: selected.id,
          supplierName: selected.nom,
          source: source === "pdf" ? "import_pdf" : "import_excel",
          fichierImport: pendingFile.name,
          existingTarifs: selectedTarifs,
          rows: data.lignes.map((line) => ({
            nomProduit: line.nomProduit,
            reference: line.reference,
            categorie: line.categorie,
            unite: line.unite,
            conditionnement: line.conditionnement,
            prixPublic: line.prixPublic,
            prixRemise: line.prixRemise ?? line.prixEntrepriseSaisi,
            tauxTVA: line.tauxTVA,
            aVerifier: line.aVerifier ?? true,
          })),
        }),
      );
      setPreviewOpen(true);
      resetImport();
    } catch {
      setNotice("Erreur lors de l'analyse du fichier.");
      setImportLoading(false);
    }
  }

  function confirmImportPreview(rows: ImportPreviewRow[]) {
    if (!selected) return;
    const importedTarifs = previewRowsToTarifLignes(
      rows,
      selected.id,
      pendingSource,
    );
    const importedEntries = previewRowsToPriceEntries(rows, companyId);
    let nextLibrary = normalizedLibrary;

    for (const entry of importedEntries) {
      const existing = nextLibrary.entries.find((item) => item.id === entry.id);
      if (existing?.isVerified) continue;
      nextLibrary = upsertPriceEntry(nextLibrary, {
        id: entry.id,
        companyId,
        name: entry.name,
        reference: entry.reference,
        category: entry.category,
        unit: entry.unit,
        type: "material",
        supplierId: selected.id,
        supplierName: selected.nom,
        purchasePriceHT: entry.purchasePriceHT,
        vatRate: entry.vatRate,
        source: entry.source,
        confidence: entry.confidence,
        isVerified: false,
        notes: entry.notes,
      });
    }

    const updatedRefs = new Set(
      rows
        .filter((row) => row.selected && row.action === "update" && row.reference)
        .map((row) => row.reference!.trim().toLowerCase()),
    );

    const kept = selectedTarifs.filter((line) => {
      if (!line.reference) return true;
      return !updatedRefs.has(line.reference.trim().toLowerCase());
    });

    patch({
      tarifsFournisseurs: [
        ...safeTarifs.filter((line) => line.fournisseurId !== selected.id),
        ...importedTarifs,
        ...kept,
      ],
      entreprisePriceLibrary: nextLibrary,
      fournisseurs: (parametres.fournisseurs ?? []).map((item) =>
        item.id === selected.id
          ? { ...item, dateDerniereMiseAJour: new Date().toISOString() }
          : item,
      ),
    });

    setPreviewOpen(false);
    setPreviewRows([]);
    setNotice(
      `${importedTarifs.length} ligne(s) importée(s) pour ${getFournisseurEnseigneLabel(selected)}.`,
    );
  }

  const acceptByFormat =
    importFormat === "pdf"
      ? ".pdf"
      : importFormat === "excel"
        ? ".xlsx,.xls"
        : ".csv";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Produits fournisseurs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajoutez vos produits manuellement ou importez vos tarifs pour construire
          votre bibliothèque de prix professionnels.
        </p>
      </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-950">
          {notice}
        </div>
      ) : null}

      <Card className="border-border/70 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Choisir un fournisseur</h3>
        {activeFournisseurs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {allCompanyFournisseurs.length > 0
              ? "Aucun fournisseur actif. Réactivez un fournisseur archivé depuis l'onglet Fournisseurs."
              : "Aucun fournisseur enregistré. Ajoutez d'abord un fournisseur dans l'onglet Fournisseurs."}
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeFournisseurs.map((fournisseur) => {
              const productCount = countTarifsForFournisseur(
                safeTarifs,
                fournisseur.id,
              );
              const lastUpdate =
                fournisseur.dateDerniereMiseAJour ??
                fournisseur.updatedAt ??
                fournisseur.dateAjout ??
                null;
              const active = selected?.id === fournisseur.id;
              return (
                <button
                  key={fournisseur.id}
                  type="button"
                  onClick={() => setSelectedId(fournisseur.id)}
                  className={`relative rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? "border-emerald-500 bg-emerald-50/70"
                      : "border-border/70 bg-white hover:border-emerald-300"
                  }`}
                >
                  {active ? (
                    <span className="absolute right-2 top-2 text-emerald-600">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : null}
                  <p className="pr-6 text-sm font-semibold">
                    {getFournisseurEnseigneLabel(fournisseur)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {getFournisseurDepotLabel(fournisseur)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fournisseur.ville || "—"}
                  </p>
                  <p className="mt-1.5 text-xs text-foreground/80">
                    {productCount} produit{productCount > 1 ? "s" : ""}
                    {lastUpdate
                      ? ` · MAJ ${formatDateFR(lastUpdate.slice(0, 10))}`
                      : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {selected ? (
        <Card className="border-border/70 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">
                {getFournisseurEnseigneLabel(selected)}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedTarifs.length} produit
                {selectedTarifs.length > 1 ? "s" : ""}
                {lastImport
                  ? ` · Dernier import ${formatDateFR(lastImport.slice(0, 10))}`
                  : ""}
                {selected.dateDerniereMiseAJour
                  ? ` · Dernière MAJ ${formatDateFR(selected.dateDerniereMiseAJour.slice(0, 10))}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter un produit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setImportStep("choose")}
              >
                <FileUp className="h-3.5 w-3.5" />
                Importer une liste tarifaire
              </Button>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une référence ou une désignation…"
              className="h-10 rounded-xl pl-9"
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border/80">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="sticky top-0 z-10 bg-white text-left text-xs uppercase text-muted-foreground shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                <tr>
                  {(
                    [
                      ["reference", "Référence"],
                      ["designation", "Désignation"],
                      ["unite", "Unité"],
                      ["achat", "Prix achat HT"],
                      ["vente", "Prix vente HT"],
                      ["marge", "Marge %"],
                      ["statut", "Statut"],
                      ["maj", "Dernière MAJ"],
                    ] as const
                  ).map(([key, label]) => (
                    <th key={key} className="px-3 py-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => toggleSort(key)}
                      >
                        {label}
                        {sortKey === key ? (
                          <ChevronDown
                            className={`h-3.5 w-3.5 ${sortAsc ? "" : "rotate-180"}`}
                          />
                        ) : null}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((line) => {
                  const achatHT = getTarifPrixAchatHT(line);
                  const marge = computePurchaseMargin(achatHT, line.prixVenteHT);
                  return (
                    <tr
                      key={line.id}
                      className={`border-t border-border/50 odd:bg-white even:bg-neutral-50/40 ${
                        highlightedProductId === line.id
                          ? "produit-row-added"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-2.5">{line.reference ?? "—"}</td>
                      <td className="px-3 py-2.5 font-medium">{line.nomProduit}</td>
                      <td className="px-3 py-2.5">{formatUnitAbbr(line.unite)}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {achatHT != null ? formatCurrency(achatHT) : "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {line.prixVenteHT != null
                          ? formatCurrency(line.prixVenteHT)
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {marge.margePourcent != null
                          ? `${marge.margePourcent} %`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {line.aVerifier ? (
                          <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-medium text-amber-800">
                            À vérifier
                          </span>
                        ) : (
                          <span className="text-xs text-primary">Vérifié</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {formatDateFR(line.dateImport.slice(0, 10))}
                      </td>
                      <td className="relative px-3 py-2.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setMenuOpenId((id) =>
                              id === line.id ? null : line.id,
                            )
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {menuOpenId === line.id ? (
                          <div className="absolute right-3 z-20 mt-1 w-36 rounded-xl border border-border/80 bg-white p-1 shadow-lg">
                            <button
                              type="button"
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-emerald-50"
                              onClick={() => openEdit(line)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-emerald-50"
                              onClick={() => duplicateProduct(line)}
                            >
                              Dupliquer
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50"
                              onClick={() => removeProduct(line.id)}
                            >
                              Supprimer
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredSorted.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                {search.trim()
                  ? "Aucun produit ne correspond à votre recherche."
                  : "Aucun produit pour ce fournisseur. Ajoutez-en un ou importez une liste tarifaire."}
              </p>
            ) : null}
          </div>

          {filteredSorted.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>
                {filteredSorted.length} produit
                {filteredSorted.length > 1 ? "s" : ""}
                {search.trim() ? " trouvé(s)" : ""}
              </p>
              {totalPages > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Précédent
                  </Button>
                  <span>
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Suivant
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      {selected ? (
        <ProduitFormModal
          open={productModalOpen}
          mode={editingLine ? "edit" : "create"}
          fournisseur={selected}
          initial={editingLine}
          onClose={() => {
            setProductModalOpen(false);
            setEditingLine(null);
          }}
          onSubmit={saveProduct}
        />
      ) : null}

      {importStep !== "closed" && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">Importer une liste tarifaire</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Fournisseur : {getFournisseurEnseigneLabel(selected)}
            </p>

            {importStep === "choose" ? (
              <div className="mt-4 space-y-2">
                {(
                  [
                    [
                      "pdf",
                      "PDF",
                      "Analyse assistée par IA — 1 crédit si l'analyse réussit",
                    ],
                    [
                      "excel",
                      "Excel",
                      "Import structuré, IA utilisée uniquement si nécessaire",
                    ],
                    [
                      "csv",
                      "CSV",
                      "Import structuré sans IA si les colonnes sont reconnues",
                    ],
                  ] as const
                ).map(([id, title, desc]) => (
                  <button
                    key={id}
                    type="button"
                    className="w-full rounded-xl border border-border/70 bg-white p-3 text-left hover:border-emerald-400"
                    onClick={() => {
                      setImportFormat(id);
                      setImportStep("ready");
                    }}
                  >
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
            ) : null}

            {importStep === "ready" && importFormat ? (
              <div className="mt-4 space-y-3">
                <label className="flex cursor-pointer flex-col gap-1 rounded-xl border border-dashed border-border/80 bg-white px-4 py-5 text-center text-sm hover:border-emerald-400">
                  <span className="font-medium">
                    Choisir un fichier {importFormat.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Le fichier n&apos;est pas analysé automatiquement.
                  </span>
                  <input
                    type="file"
                    accept={acceptByFormat}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setPendingFile(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>

                {pendingFile ? (
                  <div className="rounded-xl border border-border/70 bg-emerald-50/40 p-3 text-sm">
                    <p className="font-medium">{pendingFile.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(pendingFile.size / 1024).toFixed(1)} Ko ·{" "}
                      {getFournisseurEnseigneLabel(selected)}
                    </p>
                  </div>
                ) : null}

                {(importFormat === "pdf" || importFormat === "excel") &&
                pendingFile ? (
                  <p className="text-xs font-medium text-emerald-800">
                    Cette analyse utilisera 1 crédit IA.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={resetImport}>
                Annuler
              </Button>
              {importStep === "ready" ? (
                <Button
                  type="button"
                  disabled={!pendingFile || importLoading}
                  onClick={() => void analyzePendingFile()}
                >
                  {importLoading ? "Analyse…" : "Analyser le fichier"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <TarifImportPreviewDialog
        open={previewOpen}
        rows={previewRows}
        creditNotice={
          pendingSource === "pdf" || pendingSource === "excel"
            ? "Analyse réussie — 1 crédit IA consommé."
            : undefined
        }
        onClose={() => {
          setPreviewOpen(false);
          setPreviewRows([]);
        }}
        onConfirm={confirmImportPreview}
        onChangeRows={setPreviewRows}
      />
    </div>
  );
}
