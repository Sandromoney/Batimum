"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import {
  applyPurchasePriceChange,
  applySalePriceChange,
  disablePriceEntry,
  getActivePriceEntries,
  upsertPriceEntry,
} from "@/lib/entreprise-price-library";
import { computeTarifMarge, ttcFromHt } from "@/lib/fournisseur-prix-utils";
import { filterFournisseursForCompany } from "@/lib/fourniture/helpers";
import type {
  EntreprisePriceLibrary,
  EntreprisePriceLibraryEntry,
  Parametres,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type Props = {
  parametres: Parametres;
  companyId: string;
  onParametresChange: (patch: Partial<Parametres>) => void;
};

type SortKey =
  | "name"
  | "reference"
  | "category"
  | "supplierName"
  | "purchasePriceHT";
type SortDir = "asc" | "desc";

const READONLY_FIELD_CLASS =
  "cursor-not-allowed border border-border bg-white text-muted-foreground";

const EMPTY_FORM = {
  name: "",
  reference: "",
  category: "",
  unit: "u",
  purchasePriceHT: "",
  purchasePriceTTC: "",
  salePriceHT: "",
  salePriceTTC: "",
  vatRate: "20",
  supplierId: "",
  supplierName: "",
};

export function EntreprisePriceLibraryView({
  parametres,
  companyId,
  onParametresChange,
}: Props) {
  const library = parametres.entreprisePriceLibrary ?? { entries: [] };
  const fournisseurs = useMemo(
    () => filterFournisseursForCompany(parametres.fournisseurs ?? [], companyId),
    [parametres.fournisseurs, companyId],
  );

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const entries = useMemo(
    () => getActivePriceEntries(library, companyId),
    [library, companyId],
  );

  const sortedEntries = useMemo(() => {
    const rows = [...entries];
    const dir = sortDir === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      switch (sortKey) {
        case "purchasePriceHT": {
          const av = a.purchasePriceHT ?? Infinity;
          const bv = b.purchasePriceHT ?? Infinity;
          return (av - bv) * dir;
        }
        default: {
          const av = (a[sortKey] ?? "").toString().toLowerCase();
          const bv = (b[sortKey] ?? "").toString().toLowerCase();
          return av.localeCompare(bv, "fr") * dir;
        }
      }
    });

    return rows;
  }, [entries, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function sortIndicator(key: SortKey): string {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const formMargin = useMemo(() => {
    const purchase = form.purchasePriceHT ? Number(form.purchasePriceHT) : undefined;
    const sale = form.salePriceHT ? Number(form.salePriceHT) : undefined;
    return computeTarifMarge(purchase, sale);
  }, [form.purchasePriceHT, form.salePriceHT]);

  function patchLibrary(nextLibrary: EntreprisePriceLibrary) {
    onParametresChange({ entreprisePriceLibrary: nextLibrary });
  }

  function loadFormFromEntry(entry: EntreprisePriceLibraryEntry) {
    const vat = entry.vatRate ?? 20;
    setForm({
      name: entry.name,
      reference: entry.reference ?? "",
      category: entry.category ?? "",
      unit: entry.unit,
      purchasePriceHT:
        entry.purchasePriceHT != null ? String(entry.purchasePriceHT) : "",
      purchasePriceTTC:
        entry.purchasePriceHT != null
          ? String(ttcFromHt(entry.purchasePriceHT, vat))
          : "",
      salePriceHT: entry.salePriceHT != null ? String(entry.salePriceHT) : "",
      salePriceTTC:
        entry.salePriceHT != null ? String(ttcFromHt(entry.salePriceHT, vat)) : "",
      vatRate: entry.vatRate != null ? String(entry.vatRate) : "20",
      supplierId: entry.supplierId ?? "",
      supplierName: entry.supplierName ?? "",
    });
  }

  function startEdit(entry: EntreprisePriceLibraryEntry) {
    setEditingId(entry.id);
    loadFormFromEntry(entry);
    document.getElementById("fourniture-create-product")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function duplicateEntry(entry: EntreprisePriceLibraryEntry) {
    patchLibrary(
      upsertPriceEntry(library, {
        companyId,
        name: `${entry.name} (copie)`,
        reference: entry.reference,
        category: entry.category,
        unit: entry.unit,
        type: entry.type,
        purchasePriceHT: entry.purchasePriceHT,
        salePriceHT: entry.salePriceHT,
        marginRate: entry.marginRate,
        vatRate: entry.vatRate,
        supplierId: entry.supplierId,
        supplierName: entry.supplierName,
        source: "manual",
        isVerified: false,
        salePriceMode: entry.salePriceMode,
      }),
    );
  }

  function updatePurchaseHT(ht: string) {
    const vat = Number(form.vatRate) || 20;
    const htNum = ht ? Number(ht) : undefined;
    setForm((prev) => ({
      ...prev,
      purchasePriceHT: ht,
      purchasePriceTTC: htNum != null ? String(ttcFromHt(htNum, vat)) : "",
    }));
  }

  function updateSaleHT(ht: string) {
    const vat = Number(form.vatRate) || 20;
    const htNum = ht ? Number(ht) : undefined;
    setForm((prev) => ({
      ...prev,
      salePriceHT: ht,
      salePriceTTC: htNum != null ? String(ttcFromHt(htNum, vat)) : "",
    }));
  }

  function updateVat(vat: string) {
    const vatNum = Number(vat) || 20;
    const purchaseHT = form.purchasePriceHT ? Number(form.purchasePriceHT) : undefined;
    const saleHT = form.salePriceHT ? Number(form.salePriceHT) : undefined;
    setForm((prev) => ({
      ...prev,
      vatRate: vat,
      purchasePriceTTC:
        purchaseHT != null ? String(ttcFromHt(purchaseHT, vatNum)) : prev.purchasePriceTTC,
      salePriceTTC:
        saleHT != null ? String(ttcFromHt(saleHT, vatNum)) : prev.salePriceTTC,
    }));
  }

  function saveEntry() {
    if (!form.name.trim()) {
      setFormError("Le nom est obligatoire.");
      return;
    }
    setFormError("");

    const purchase = form.purchasePriceHT ? Number(form.purchasePriceHT) : undefined;
    let sale = form.salePriceHT ? Number(form.salePriceHT) : undefined;
    const coefficient = library.defaultMarkupCoefficient ?? 1.65;
    let marginRate: number | undefined;

    if (typeof purchase === "number" && sale == null) {
      const computed = applyPurchasePriceChange({
        purchasePriceHT: purchase,
        salePriceMode: "coefficient",
        markupCoefficient: coefficient,
      });
      sale = computed.salePriceHT;
      marginRate = computed.marginRate;
    } else if (typeof purchase === "number" && typeof sale === "number") {
      marginRate = applySalePriceChange({
        purchasePriceHT: purchase,
        salePriceHT: sale,
      }).marginRate;
    }

    const selectedSupplier = fournisseurs.find((f) => f.id === form.supplierId);
    const supplierName =
      form.supplierId && form.supplierId !== "__custom__"
        ? selectedSupplier?.nom
        : form.supplierName.trim() || undefined;
    const supplierId =
      form.supplierId && form.supplierId !== "__custom__" ? form.supplierId : undefined;

    const existing = editingId
      ? library.entries.find((entry) => entry.id === editingId)
      : undefined;

    patchLibrary(
      upsertPriceEntry(library, {
        id: editingId ?? undefined,
        companyId,
        name: form.name.trim(),
        reference: form.reference.trim() || undefined,
        category: form.category.trim() || undefined,
        unit: form.unit.trim() || "u",
        type: "material",
        purchasePriceHT: purchase,
        salePriceHT: sale,
        marginRate,
        markupCoefficient: coefficient,
        vatRate: form.vatRate ? Number(form.vatRate) : undefined,
        supplierId,
        supplierName,
        source: existing?.source ?? "manual",
        isVerified: existing?.isVerified ?? true,
        salePriceMode: "manual",
      }),
    );
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  return (
    <div className="space-y-8">
      <Card className="border-border/70 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Liste des produits</h2>
          <p className="text-xs text-muted-foreground">
            {sortedEntries.length} produit{sortedEntries.length > 1 ? "s" : ""}
          </p>
        </div>

        {sortedEntries.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Aucun produit dans la bibliothèque.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-neutral-50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">
                    <button type="button" className="hover:text-foreground" onClick={() => toggleSort("name")}>
                      Produit{sortIndicator("name")}
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <button type="button" className="hover:text-foreground" onClick={() => toggleSort("reference")}>
                      Référence{sortIndicator("reference")}
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <button type="button" className="hover:text-foreground" onClick={() => toggleSort("category")}>
                      Catégorie{sortIndicator("category")}
                    </button>
                  </th>
                  <th className="px-3 py-3">Unité</th>
                  <th className="px-3 py-3">
                    <button type="button" className="hover:text-foreground" onClick={() => toggleSort("supplierName")}>
                      Fournisseur{sortIndicator("supplierName")}
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <button type="button" className="hover:text-foreground" onClick={() => toggleSort("purchasePriceHT")}>
                      Achat HT{sortIndicator("purchasePriceHT")}
                    </button>
                  </th>
                  <th className="px-3 py-3">Achat TTC</th>
                  <th className="px-3 py-3">Vente HT</th>
                  <th className="px-3 py-3">Vente TTC</th>
                  <th className="px-3 py-3">TVA</th>
                  <th className="px-3 py-3">Marge</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => {
                  const vat = entry.vatRate ?? 20;
                  const achatTTC =
                    entry.purchasePriceHT != null
                      ? ttcFromHt(entry.purchasePriceHT, vat)
                      : undefined;
                  const venteTTC =
                    entry.salePriceHT != null
                      ? ttcFromHt(entry.salePriceHT, vat)
                      : undefined;
                  const { margeEuro, margePourcent } = computeTarifMarge(
                    entry.purchasePriceHT,
                    entry.salePriceHT,
                  );

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-border/40 hover:bg-neutral-50/60"
                    >
                      <td className="px-3 py-3 font-medium">{entry.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {entry.reference ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {entry.category ?? "—"}
                      </td>
                      <td className="px-3 py-3">{entry.unit}</td>
                      <td className="px-3 py-3">{entry.supplierName ?? "—"}</td>
                      <td className="px-3 py-3 tabular-nums">
                        {entry.purchasePriceHT != null
                          ? formatCurrency(entry.purchasePriceHT)
                          : "—"}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {achatTTC != null ? formatCurrency(achatTTC) : "—"}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {entry.salePriceHT != null
                          ? formatCurrency(entry.salePriceHT)
                          : "—"}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {venteTTC != null ? formatCurrency(venteTTC) : "—"}
                      </td>
                      <td className="px-3 py-3">{vat} %</td>
                      <td className="px-3 py-3 tabular-nums text-xs">
                        {margeEuro != null
                          ? `${formatCurrency(margeEuro)} (${margePourcent} %)`
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(entry)}
                          >
                            Modifier
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              patchLibrary(disablePriceEntry(library, entry.id, companyId))
                            }
                          >
                            Supprimer
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => duplicateEntry(entry)}
                          >
                            Dupliquer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div id="fourniture-create-product">
        <Card className="border-border/70 p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Créer un produit</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <section className="sm:col-span-2 lg:col-span-3">
              <Label>Nom</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </section>
            <section>
              <Label>Référence</Label>
              <Input
                value={form.reference}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reference: e.target.value }))
                }
              />
            </section>
            <section>
              <Label>Catégorie</Label>
              <Input
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
              />
            </section>
            <section>
              <Label>Unité</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
              />
            </section>
            <section>
              <Label>Fournisseur</Label>
              {fournisseurs.length > 0 ? (
                <Select
                  value={form.supplierId || "__custom__"}
                  onChange={(event) => {
                    const value = event.target.value;
                    const f = fournisseurs.find((item) => item.id === value);
                    setForm((prev) => ({
                      ...prev,
                      supplierId: value,
                      supplierName: f?.nom ?? prev.supplierName,
                    }));
                  }}
                >
                  <option value="__custom__">Autre (saisie libre)</option>
                  {fournisseurs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom || "Sans nom"}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={form.supplierName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      supplierName: e.target.value,
                      supplierId: "__custom__",
                    }))
                  }
                  placeholder="Nom du fournisseur"
                />
              )}
            </section>
            <section>
              <Label>Prix achat HT</Label>
              <Input
                type="number"
                step="0.01"
                value={form.purchasePriceHT}
                onChange={(e) => updatePurchaseHT(e.target.value)}
              />
            </section>
            <section>
              <Label>TVA (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.vatRate}
                onChange={(e) => updateVat(e.target.value)}
              />
            </section>
            <section>
              <Label>Prix achat TTC</Label>
              <Input
                readOnly
                className={READONLY_FIELD_CLASS}
                value={form.purchasePriceTTC}
              />
            </section>
            <section>
              <Label>Prix vente HT</Label>
              <Input
                type="number"
                step="0.01"
                value={form.salePriceHT}
                onChange={(e) => updateSaleHT(e.target.value)}
              />
            </section>
            <section>
              <Label>Prix vente TTC</Label>
              <Input
                readOnly
                className={READONLY_FIELD_CLASS}
                value={form.salePriceTTC}
              />
            </section>
            <section className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs text-muted-foreground">
                Marge calculée :{" "}
                {formMargin.margeEuro != null
                  ? `${formatCurrency(formMargin.margeEuro)} (${formMargin.margePourcent} %)`
                  : "—"}
              </p>
            </section>
          </div>
          {formError ? <p className="mt-2 text-xs text-red-500">{formError}</p> : null}
          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={saveEntry}>
              {editingId ? "Enregistrer" : "Ajouter le produit"}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
              >
                Annuler
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
