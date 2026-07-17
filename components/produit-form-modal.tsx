"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  formatUnitAbbr,
  findUnitOption,
  PRODUCT_UNIT_OPTIONS,
  unitStorageValue,
} from "@/lib/fourniture/product-units";
import {
  computeSaleFromMode,
  isValidPurchasePrice,
  type SalePriceMode,
} from "@/lib/fourniture/sale-price-modes";
import { getFournisseurEnseigneLabel } from "@/lib/fourniture/helpers";
import type { Fournisseur, FournisseurTarifLigne } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export type ProduitFormValues = {
  reference?: string;
  nomProduit: string;
  categorie?: string;
  unite: string;
  conditionnement?: string;
  commentaire?: string;
  prixAchatHT: number;
  tauxTVA: number;
  prixAchatTTC?: number;
  prixVenteHT?: number;
  prixVenteTTC?: number;
  aVerifier: boolean;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  fournisseur: Fournisseur;
  initial?: FournisseurTarifLigne | null;
  onClose: () => void;
  onSubmit: (values: ProduitFormValues) => void;
};

function parsePositiveNumber(raw: string): number | undefined {
  const cleaned = raw.trim().replace(",", ".");
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return undefined;
  return value;
}

export function ProduitFormModal({
  open,
  mode,
  fournisseur,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [designation, setDesignation] = useState("");
  const [unitOptionId, setUnitOptionId] = useState<string>("u");
  const [customUnit, setCustomUnit] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  const [showUnitList, setShowUnitList] = useState(false);
  const [purchaseHtRaw, setPurchaseHtRaw] = useState("");
  const [tvaRaw, setTvaRaw] = useState("20");
  const [saleMode, setSaleMode] = useState<SalePriceMode>("coefficient");
  const [saleHtRaw, setSaleHtRaw] = useState("");
  const [coefficientRaw, setCoefficientRaw] = useState("1,50");
  const [marginRaw, setMarginRaw] = useState("");
  const [reference, setReference] = useState("");
  const [category, setCategory] = useState("");
  const [conditionnement, setConditionnement] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [verified, setVerified] = useState(false);
  const [complementOpen, setComplementOpen] = useState(false);
  const [touched, setTouched] = useState({
    designation: false,
    unit: false,
    purchase: false,
    sale: false,
  });

  useEffect(() => {
    if (!open) return;

    if (initial) {
      setDesignation(initial.nomProduit ?? "");
      const unitFound = findUnitOption(initial.unite ?? "u");
      if (unitFound) {
        setUnitOptionId(unitFound.id);
        setCustomUnit("");
      } else {
        setUnitOptionId("other");
        setCustomUnit(initial.unite ?? "");
      }
      const achat =
        initial.prixEntrepriseSaisi ?? initial.prixRemise ?? undefined;
      setPurchaseHtRaw(achat != null ? String(achat).replace(".", ",") : "");
      setTvaRaw(String(initial.tauxTVA ?? 20).replace(".", ","));
      setSaleMode(initial.prixVenteHT != null ? "manual" : "coefficient");
      setSaleHtRaw(
        initial.prixVenteHT != null
          ? String(initial.prixVenteHT).replace(".", ",")
          : "",
      );
      setCoefficientRaw("1,50");
      setMarginRaw("");
      setReference(initial.reference ?? "");
      setCategory(initial.categorie ?? "");
      setConditionnement(initial.conditionnement ?? "");
      setCommentaire(initial.commentaire ?? "");
      setVerified(!initial.aVerifier);
      setComplementOpen(
        Boolean(
          initial.reference ||
            initial.categorie ||
            initial.conditionnement ||
            initial.commentaire,
        ),
      );
    } else {
      setDesignation("");
      setUnitOptionId("u");
      setCustomUnit("");
      setPurchaseHtRaw("");
      setTvaRaw("20");
      setSaleMode("coefficient");
      setSaleHtRaw("");
      setCoefficientRaw("1,50");
      setMarginRaw("");
      setReference("");
      setCategory("");
      setConditionnement("");
      setCommentaire("");
      setVerified(false);
      setComplementOpen(false);
    }
    setUnitSearch("");
    setShowUnitList(false);
    setTouched({
      designation: false,
      unit: false,
      purchase: false,
      sale: false,
    });
  }, [open, initial]);

  const purchaseHt = parsePositiveNumber(purchaseHtRaw);
  const tva = parsePositiveNumber(tvaRaw) ?? 20;
  const coefficient = parsePositiveNumber(coefficientRaw);
  const marginWanted = parsePositiveNumber(marginRaw);
  const saleHtManual = parsePositiveNumber(saleHtRaw);

  const unitValue = unitStorageValue(unitOptionId, customUnit);

  const computed = useMemo(
    () =>
      computeSaleFromMode({
        prixAchatHT: purchaseHt,
        tauxTVA: tva,
        mode: saleMode,
        prixVenteHTManuel: saleHtManual,
        coefficient,
        margeSouhaiteePourcent: marginWanted,
      }),
    [purchaseHt, tva, saleMode, saleHtManual, coefficient, marginWanted],
  );

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return PRODUCT_UNIT_OPTIONS;
    return PRODUCT_UNIT_OPTIONS.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.abbr.toLowerCase().includes(q),
    );
  }, [unitSearch]);

  const errors = {
    designation: !designation.trim() ? "La désignation est obligatoire." : "",
    unit: !unitValue ? "L'unité est obligatoire." : "",
    purchase: !isValidPurchasePrice(purchaseHt)
      ? purchaseHtRaw.trim()
        ? "Indiquez un prix d'achat HT valide (supérieur à 0)."
        : "Le prix d'achat HT est obligatoire."
      : "",
    sale:
      saleMode === "manual" && !isValidPurchasePrice(saleHtManual)
        ? "Indiquez un prix de vente HT valide."
        : saleMode === "coefficient" &&
            (coefficient == null || coefficient <= 0)
          ? "Indiquez un coefficient valide."
          : saleMode === "margin" && marginWanted == null
            ? "Indiquez une marge souhaitée."
            : "",
  };

  const canSubmit =
    !errors.designation &&
    !errors.unit &&
    !errors.purchase &&
    !errors.sale &&
    computed.prixVenteHT != null;

  function submit() {
    setTouched({
      designation: true,
      unit: true,
      purchase: true,
      sale: true,
    });
    if (!canSubmit || purchaseHt == null) return;

    onSubmit({
      reference: reference.trim() || undefined,
      nomProduit: designation.trim(),
      categorie: category.trim() || undefined,
      unite: unitValue,
      conditionnement: conditionnement.trim() || undefined,
      commentaire: commentaire.trim() || undefined,
      prixAchatHT: purchaseHt,
      tauxTVA: tva,
      prixAchatTTC: computed.prixAchatTTC,
      prixVenteHT: computed.prixVenteHT,
      prixVenteTTC: computed.prixVenteTTC,
      aVerifier: !verified,
    });
  }

  if (!open) return null;

  const selectedUnitLabel =
    unitOptionId === "other"
      ? customUnit || "Autre unité"
      : findUnitOption(unitOptionId)?.label ?? "unité";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex h-[95vh] w-full max-w-[760px] flex-col overflow-hidden rounded-t-2xl border border-border/80 bg-white shadow-xl sm:h-auto sm:max-h-[85vh] sm:rounded-2xl">
        <div className="shrink-0 border-b border-border/70 px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">
            {mode === "edit" ? "Modifier le produit" : "Ajouter un produit"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Fournisseur : {getFournisseurEnseigneLabel(fournisseur)}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            <section>
              <Label>Désignation</Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, designation: true }))}
                placeholder="Ex. Tube PER 16"
                className="mt-1"
              />
              {touched.designation && errors.designation ? (
                <p className="mt-1 text-xs text-red-600">{errors.designation}</p>
              ) : null}
            </section>

            <section className="relative">
              <Label>Unité</Label>
              <button
                type="button"
                className="mt-1 flex h-10 w-full items-center justify-between rounded-xl border border-border/80 bg-white px-3 text-left text-sm"
                onClick={() => setShowUnitList((v) => !v)}
              >
                <span>
                  {selectedUnitLabel}
                  {unitValue ? (
                    <span className="ml-2 text-muted-foreground">
                      ({formatUnitAbbr(unitValue)})
                    </span>
                  ) : null}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              {showUnitList ? (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-border/80 bg-white p-2 shadow-lg">
                  <Input
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    placeholder="Rechercher une unité…"
                    className="mb-2 h-9"
                  />
                  <div className="max-h-48 overflow-y-auto">
                    {filteredUnits.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-emerald-50"
                        onClick={() => {
                          setUnitOptionId(option.id);
                          setCustomUnit("");
                          setShowUnitList(false);
                          setTouched((t) => ({ ...t, unit: true }));
                        }}
                      >
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.abbr}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                      onClick={() => {
                        setUnitOptionId("other");
                        setShowUnitList(false);
                      }}
                    >
                      Autre unité
                    </button>
                  </div>
                </div>
              ) : null}
              {unitOptionId === "other" ? (
                <Input
                  className="mt-2"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, unit: true }))}
                  placeholder="Saisir une unité"
                />
              ) : null}
              {touched.unit && errors.unit ? (
                <p className="mt-1 text-xs text-red-600">{errors.unit}</p>
              ) : null}
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <section>
                <Label>Prix d&apos;achat HT</Label>
                <Input
                  inputMode="decimal"
                  value={purchaseHtRaw}
                  onChange={(e) => setPurchaseHtRaw(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, purchase: true }))}
                  placeholder="Ex. 10,00"
                  className="mt-1"
                />
                {touched.purchase && errors.purchase ? (
                  <p className="mt-1 text-xs text-red-600">{errors.purchase}</p>
                ) : null}
              </section>
              <section>
                <Label>TVA (%)</Label>
                <Input
                  inputMode="decimal"
                  value={tvaRaw}
                  onChange={(e) => setTvaRaw(e.target.value)}
                  className="mt-1"
                />
              </section>
            </div>

            <section>
              <Label>Mode de calcul du prix de vente</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["manual", "Saisie manuelle"],
                    ["coefficient", "Coefficient"],
                    ["margin", "Marge souhaitée"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSaleMode(id)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${
                      saleMode === id
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-border/70 bg-white hover:border-emerald-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                {saleMode === "manual" ? (
                  <>
                    <Label>Prix vente HT</Label>
                    <Input
                      inputMode="decimal"
                      className="mt-1"
                      value={saleHtRaw}
                      onChange={(e) => setSaleHtRaw(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, sale: true }))}
                      placeholder="Ex. 15,00"
                    />
                  </>
                ) : null}
                {saleMode === "coefficient" ? (
                  <>
                    <Label>Coefficient</Label>
                    <Input
                      inputMode="decimal"
                      className="mt-1"
                      value={coefficientRaw}
                      onChange={(e) => setCoefficientRaw(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, sale: true }))}
                    />
                  </>
                ) : null}
                {saleMode === "margin" ? (
                  <>
                    <Label>Marge souhaitée (%)</Label>
                    <Input
                      inputMode="decimal"
                      className="mt-1"
                      value={marginRaw}
                      onChange={(e) => setMarginRaw(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, sale: true }))}
                      placeholder="Ex. 50"
                    />
                  </>
                ) : null}
                {touched.sale && errors.sale ? (
                  <p className="mt-1 text-xs text-red-600">{errors.sale}</p>
                ) : null}
              </div>
            </section>

            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4">
              <p className="text-sm font-semibold text-foreground">Récapitulatif</p>
              <div className="mt-2 grid gap-1 text-sm text-foreground/90 sm:grid-cols-2">
                <p>
                  Achat HT :{" "}
                  {purchaseHt != null ? formatCurrency(purchaseHt) : "—"}
                </p>
                <p>
                  Achat TTC :{" "}
                  {computed.prixAchatTTC != null
                    ? formatCurrency(computed.prixAchatTTC)
                    : "—"}
                </p>
                <p>
                  Vente HT :{" "}
                  {computed.prixVenteHT != null
                    ? formatCurrency(computed.prixVenteHT)
                    : "—"}
                </p>
                <p>
                  Vente TTC :{" "}
                  {computed.prixVenteTTC != null
                    ? formatCurrency(computed.prixVenteTTC)
                    : "—"}
                </p>
                <p className="sm:col-span-2">
                  Marge :{" "}
                  {computed.margeEuro != null
                    ? `${formatCurrency(computed.margeEuro)} — ${computed.margePourcent} %`
                    : "—"}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-white px-3 py-2.5 text-sm font-medium"
              onClick={() => setComplementOpen((v) => !v)}
            >
              Informations complémentaires
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  complementOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {complementOpen ? (
              <div className="grid gap-3 rounded-xl border border-border/60 bg-white p-3 sm:grid-cols-2">
                <section>
                  <Label>Référence</Label>
                  <Input
                    className="mt-1"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </section>
                <section>
                  <Label>Catégorie</Label>
                  <Input
                    className="mt-1"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </section>
                <section>
                  <Label>Conditionnement</Label>
                  <Input
                    className="mt-1"
                    value={conditionnement}
                    onChange={(e) => setConditionnement(e.target.value)}
                  />
                </section>
                <section className="sm:col-span-2">
                  <Label>Commentaire</Label>
                  <Textarea
                    className="mt-1"
                    rows={2}
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                  />
                </section>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-white p-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  Marquer ce prix comme vérifié
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Ce prix sera prioritaire dans le comparatif et pour MUM IA.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="shrink-0 border-t border-border/70 bg-white px-5 py-3">
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" disabled={!canSubmit} onClick={submit}>
              {mode === "edit" ? "Enregistrer" : "Ajouter le produit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
