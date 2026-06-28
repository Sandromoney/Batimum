import {
  findBatimumCatalogueEntry,
  getAdjustedBatimumPrice,
} from "@/lib/batimum-prix-catalogue";
import { resolveLibraryPrice } from "@/lib/batimum-price-library";
import { getRegionalCoefficient } from "@/lib/batimum-coefficients-regionaux";
import {
  normalizeBibliothequeKey,
  type BibliothequePrixResolution,
} from "@/lib/bibliotheque-entreprise";
import {
  FIABILITE_BATIMUM_REGIONAL,
  FIABILITE_BATIMUM_STANDARD,
  FIABILITE_MANUEL_VERROUILLE,
  SEUIL_FIABILITE_APPRIS_FORTE,
  getFiabiliteEntrepriseEntry,
} from "@/lib/prix-fiabilite";
import type { BtpNiveauPrix } from "@/lib/btp-tarifs-reference";
import type { BibliothequeEntrepriseEntry } from "@/lib/types";

export type { BibliothequePrixResolution };

function findBibliothequeMatch(
  entries: BibliothequeEntrepriseEntry[],
  designation: string,
): BibliothequeEntrepriseEntry | undefined {
  const key = normalizeBibliothequeKey(designation);
  if (!key) return undefined;

  const exact = entries.find(
    (entry) => !entry.desactive && entry.normaliseKey === key,
  );
  if (exact) return exact;

  return entries.find(
    (entry) =>
      !entry.desactive &&
      (entry.normaliseKey.includes(key) || key.includes(entry.normaliseKey)),
  );
}

/**
 * Résolution des prix MUM IA — ordre strict :
 * 1. Manuel verrouillé (98 %)
 * 2. Appris forte fiabilité (≥ 85 %)
 * 3. Appris moyen (< 85 %)
 * 4. Régional Batimum (70 %)
 * 5. Standard Batimum (60 %)
 * 6. Prix à vérifier
 */
export function resolvePrixBibliothequePrioritaire(params: {
  designation: string;
  bibliothequeEntries?: BibliothequeEntrepriseEntry[];
  regionCode: string;
  departementCode: string;
  niveauPrix: BtpNiveauPrix;
  coefficientManuel?: number | null;
  ville?: string;
}): BibliothequePrixResolution {
  const entries = params.bibliothequeEntries ?? [];
  const match = findBibliothequeMatch(entries, params.designation);

  if (match) {
    const fiabilite = getFiabiliteEntrepriseEntry({
      source: match.source,
      verrouille: match.verrouille,
      nombreUtilisations: match.nombreUtilisations,
      fiabilite: match.fiabilite,
    });

    if (match.source === "manuel" && match.verrouille) {
      return {
        prixHT: match.prixMoyenHT,
        source: "manuel",
        prixAVerifier: false,
        fiabilite: FIABILITE_MANUEL_VERROUILLE,
        designationRef: match.designation,
        tvaHabituelle: match.tauxTVA,
      };
    }

    if (fiabilite >= SEUIL_FIABILITE_APPRIS_FORTE) {
      return {
        prixHT: match.prixMoyenHT,
        source: "appris",
        prixAVerifier: false,
        fiabilite,
        designationRef: match.designation,
        tvaHabituelle: match.tauxTVA,
      };
    }

    return {
      prixHT: match.prixMoyenHT,
      source: "appris",
      prixAVerifier: false,
      fiabilite,
      designationRef: match.designation,
      tvaHabituelle: match.tauxTVA,
    };
  }

  const libraryPrice = resolveLibraryPrice(params.designation);
  if (libraryPrice && !libraryPrice.suggestionOnly) {
    return {
      prixHT: libraryPrice.prixHT,
      source: "batimum",
      prixAVerifier: false,
      fiabilite: libraryPrice.fiabilite,
      designationRef: params.designation,
      tvaHabituelle: 10,
    };
  }

  const catalogue = findBatimumCatalogueEntry(params.designation);
  if (catalogue) {
    const prixRegional = getAdjustedBatimumPrice(catalogue, {
      regionCode: params.regionCode,
      departementCode: params.departementCode,
      ville: params.ville,
      coefficientManuel: params.coefficientManuel,
      niveauPrix: params.niveauPrix,
      field: "moyen",
    });

    const regionalCoef = getRegionalCoefficient({
      regionCode: params.regionCode,
      departementCode: params.departementCode,
      ville: params.ville,
      coefficientManuel: params.coefficientManuel,
    });
    const hasRegionalCoef = regionalCoef !== 1;

    return {
      prixHT: prixRegional,
      source: hasRegionalCoef ? "regional" : "batimum",
      prixAVerifier: false,
      fiabilite: hasRegionalCoef
        ? FIABILITE_BATIMUM_REGIONAL
        : FIABILITE_BATIMUM_STANDARD,
      designationRef: catalogue.designation,
      tvaHabituelle: catalogue.tvaHabituelle,
    };
  }

  return {
    prixHT: 0,
    source: "a_verifier",
    prixAVerifier: true,
    fiabilite: 0,
  };
}

export function formatPrixPrioriteGuide(params: {
  entries: BibliothequeEntrepriseEntry[];
  regionCode: string;
  departementCode: string;
  niveauPrix: BtpNiveauPrix;
  coefficientManuel?: number | null;
}): string {
  const sample = params.entries.slice(0, 20);
  const lines = [
    "ORDRE DE PRIORITÉ DES PRIX (NE JAMAIS INVENTER) :",
    "1. Prix manuel verrouillé entreprise",
    "2. Prix appris entreprise (forte fiabilité)",
    "3. Prix moyen appris entreprise",
    "4. Bibliothèque métier Batimum V3",
    "5. Prix régional Batimum (standard × coefficient régional)",
    "6. Prix standard Batimum",
    "7. Si aucun prix fiable → prixAVerifier=true + « Prix à vérifier »",
    "",
  ];

  if (sample.length > 0) {
    lines.push("Exemples résolus pour votre entreprise :");
    for (const entry of sample) {
      const resolved = resolvePrixBibliothequePrioritaire({
        designation: entry.designation,
        bibliothequeEntries: params.entries,
        regionCode: params.regionCode,
        departementCode: params.departementCode,
        niveauPrix: params.niveauPrix,
        coefficientManuel: params.coefficientManuel,
      });
      lines.push(
        `- « ${entry.designation} » → ${resolved.prixHT} € HT (${resolved.source}, fiabilité ${resolved.fiabilite ?? "?"}%)`,
      );
    }
  }

  return lines.join("\n");
}
