import { resolvePrixBibliothequePrioritaire } from "@/lib/bibliotheque-prix";
import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";
import {
  buildSupplierPriceContext,
  resolveBestSupplierPrice,
} from "@/lib/supplier-price";
import {
  getReliabilityLabel,
  getSourceLabel,
  mapReliabilityFromEntry,
  priceEntryToBibliothequeEntry,
} from "@/lib/entreprise-price-library/normalize";
import { isFournisseurActive } from "@/lib/fourniture/helpers";
import type {
  BibliothequeEntrepriseEntry,
  EntreprisePriceLibrary,
  EntreprisePriceLibraryEntry,
  EntreprisePriceReliability,
  EntreprisePriceSource,
  Parametres,
} from "@/lib/types";
import type { BtpNiveauPrix } from "@/lib/btp-tarifs-reference";

export type EntreprisePriceResolution = {
  designation: string;
  purchasePriceHT?: number;
  salePriceHT: number;
  marginRate?: number;
  vatRate?: number;
  source: EntreprisePriceSource | "batimum" | "a_verifier";
  sourceLabel: string;
  reliability: EntreprisePriceReliability;
  confidence: number;
  prixAVerifier: boolean;
  supplierId?: string;
  supplierName?: string;
  matchedEntry?: EntreprisePriceLibraryEntry;
};

function findLibraryMatch(
  entries: EntreprisePriceLibraryEntry[],
  designation: string,
): EntreprisePriceLibraryEntry | undefined {
  const key = normalizeBibliothequeKey(designation);
  const exact = entries.find(
    (entry) => !entry.desactive && entry.normaliseKey === key,
  );
  if (exact) return exact;

  return entries.find(
    (entry) =>
      !entry.desactive &&
      entry.normaliseKey &&
      (entry.normaliseKey.includes(key) || key.includes(entry.normaliseKey)),
  );
}

function findBestVerifiedLibraryMatch(
  entries: EntreprisePriceLibraryEntry[],
  designation: string,
): EntreprisePriceLibraryEntry | undefined {
  const key = normalizeBibliothequeKey(designation);
  const matches = entries.filter(
    (entry) =>
      !entry.desactive &&
      entry.isVerified &&
      typeof entry.purchasePriceHT === "number" &&
      entry.normaliseKey &&
      (entry.normaliseKey === key ||
        entry.normaliseKey.includes(key) ||
        key.includes(entry.normaliseKey)),
  );
  if (matches.length === 0) return undefined;
  return [...matches].sort(
    (a, b) => (a.purchasePriceHT ?? Infinity) - (b.purchasePriceHT ?? Infinity),
  )[0];
}

function toBibliothequeEntries(
  library: EntreprisePriceLibrary,
): BibliothequeEntrepriseEntry[] {
  return library.entries
    .map(priceEntryToBibliothequeEntry)
    .filter((entry): entry is BibliothequeEntrepriseEntry => Boolean(entry));
}

export function resolveEntreprisePrice(params: {
  designation: string;
  library: EntreprisePriceLibrary;
  parametres: Parametres;
  companyId: string;
  regionCode: string;
  departementCode: string;
  niveauPrix: BtpNiveauPrix;
  coefficientManuel?: number | null;
  ville?: string;
}): EntreprisePriceResolution {
  const archivedIds = new Set(
    (params.parametres.fournisseurs ?? [])
      .filter((item) => !isFournisseurActive(item))
      .map((item) => item.id),
  );

  const entries = params.library.entries.filter(
    (entry) =>
      !entry.desactive &&
      (!entry.companyId || entry.companyId === params.companyId) &&
      (!entry.supplierId || !archivedIds.has(entry.supplierId)),
  );
  const match = params.library.useBestPriceInMumIA
    ? findBestVerifiedLibraryMatch(entries, params.designation)
    : findLibraryMatch(entries, params.designation);

  if (match?.isVerified && typeof match.salePriceHT === "number") {
    return {
      designation: params.designation,
      purchasePriceHT: match.purchasePriceHT,
      salePriceHT: match.salePriceHT,
      marginRate: match.marginRate,
      vatRate: match.vatRate,
      source: match.source,
      sourceLabel: getSourceLabel(
        match.source,
        match.supplierName,
        match.lastUpdatedAt,
      ),
      reliability: "verified",
      confidence: match.confidence,
      prixAVerifier: false,
      supplierId: match.supplierId,
      supplierName: match.supplierName,
      matchedEntry: match,
    };
  }

  const supplierContext = buildSupplierPriceContext(params.parametres);
  const supplierPrice = resolveBestSupplierPrice(
    { designation: params.designation },
    supplierContext,
  );

  if (
    supplierPrice?.disponible &&
    typeof supplierPrice.prixEstimeUnitaire === "number" &&
    !supplierPrice.aVerifier &&
    (supplierPrice.source === "import_remise" ||
      supplierPrice.source === "import_public" ||
      supplierPrice.source === "saisie")
  ) {
    const librarySale = match?.salePriceHT;
    const salePriceHT =
      typeof librarySale === "number"
        ? librarySale
        : supplierPrice.prixEstimeUnitaire *
          (params.library.defaultMarkupCoefficient ?? 1.65);

    return {
      designation: params.designation,
      purchasePriceHT: supplierPrice.prixEstimeUnitaire,
      salePriceHT: Number(salePriceHT.toFixed(2)),
      marginRate: match?.marginRate,
      vatRate: match?.vatRate ?? 10,
      source:
        supplierPrice.source === "saisie"
          ? "manual"
          : supplierPrice.source === "import_public"
            ? "public_price"
            : "import_csv",
      sourceLabel: getSourceLabel(
        supplierPrice.source === "import_public" ? "public_price" : "import_csv",
        supplierPrice.fournisseurNom,
        supplierPrice.dateMiseAJour,
      ),
      reliability: supplierPrice.aVerifier ? "to_verify" : "imported",
      confidence: supplierPrice.aVerifier ? 60 : 85,
      prixAVerifier: Boolean(supplierPrice.aVerifier),
      supplierId: supplierPrice.fournisseurId,
      supplierName: supplierPrice.fournisseurNom,
      matchedEntry: match,
    };
  }

  if (match?.source === "history" && typeof match.salePriceHT === "number") {
    return {
      designation: params.designation,
      purchasePriceHT: match.purchasePriceHT,
      salePriceHT: match.salePriceHT,
      marginRate: match.marginRate,
      vatRate: match.vatRate,
      source: "history",
      sourceLabel: getSourceLabel("history"),
      reliability: "history",
      confidence: match.confidence,
      prixAVerifier: true,
      supplierId: match.supplierId,
      supplierName: match.supplierName,
      matchedEntry: match,
    };
  }

  if (match && typeof match.salePriceHT === "number" && !match.isVerified) {
    return {
      designation: params.designation,
      purchasePriceHT: match.purchasePriceHT,
      salePriceHT: match.salePriceHT,
      marginRate: match.marginRate,
      vatRate: match.vatRate,
      source: match.source,
      sourceLabel: `${getSourceLabel(match.source, match.supplierName, match.lastUpdatedAt)} — non vérifié`,
      reliability: "to_verify",
      confidence: match.confidence,
      prixAVerifier: true,
      supplierId: match.supplierId,
      supplierName: match.supplierName,
      matchedEntry: match,
    };
  }

  if (match && typeof match.salePriceHT === "number") {
    const reliability = mapReliabilityFromEntry(match);
    return {
      designation: params.designation,
      purchasePriceHT: match.purchasePriceHT,
      salePriceHT: match.salePriceHT,
      marginRate: match.marginRate,
      vatRate: match.vatRate,
      source: match.source,
      sourceLabel: getSourceLabel(
        match.source,
        match.supplierName,
        match.lastUpdatedAt,
      ),
      reliability,
      confidence: match.confidence,
      prixAVerifier: reliability === "to_verify" || reliability === "estimated",
      supplierId: match.supplierId,
      supplierName: match.supplierName,
      matchedEntry: match,
    };
  }

  const legacy = resolvePrixBibliothequePrioritaire({
    designation: params.designation,
    bibliothequeEntries: toBibliothequeEntries(params.library),
    regionCode: params.regionCode,
    departementCode: params.departementCode,
    niveauPrix: params.niveauPrix,
    coefficientManuel: params.coefficientManuel,
    ville: params.ville,
  });

  const source: EntreprisePriceResolution["source"] =
    legacy.source === "a_verifier" ? "a_verifier" : legacy.source === "batimum" ? "batimum" : "mum_ai";

  return {
    designation: params.designation,
    salePriceHT: legacy.prixHT,
    vatRate: legacy.tvaHabituelle,
    source,
    sourceLabel:
      legacy.source === "a_verifier"
        ? "Prix estimé par MUM IA — à vérifier"
        : legacy.source === "manuel" || legacy.source === "appris"
          ? getSourceLabel(legacy.source === "manuel" ? "manual" : "appris")
          : "Prix de référence Batimum",
    reliability:
      legacy.source === "a_verifier"
        ? "estimated"
        : legacy.source === "manuel"
          ? "verified"
          : "public",
    confidence: legacy.fiabilite ?? 60,
    prixAVerifier: legacy.prixAVerifier,
    supplierName: undefined,
  };
}

export function formatPriceResolutionForDevisLine(
  resolution: EntreprisePriceResolution,
): string {
  const parts = [
    `Prix vente : ${resolution.salePriceHT.toFixed(2)} €`,
    resolution.purchasePriceHT != null
      ? `Prix achat estimé : ${resolution.purchasePriceHT.toFixed(2)} €`
      : null,
    resolution.marginRate != null
      ? `Marge : ${resolution.marginRate.toFixed(0)} %`
      : null,
    `Source : ${resolution.sourceLabel}`,
    `Fiabilité : ${getReliabilityLabel(resolution.reliability)}`,
  ].filter(Boolean);
  return parts.join(" · ");
}
