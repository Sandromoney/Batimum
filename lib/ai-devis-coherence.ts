import type { AiDevisSection } from "@/lib/ai-devis";
import { computeAiSectionSubtotal } from "@/lib/ai-devis";
import {
  findPriceLibraryEntry,
  isSuggestionOnlyLibraryEntry,
  resolveLibraryPrice,
  estimatePlinthesMlFromCorpus,
  extractRoomSurfacesM2,
  isForbiddenPlinthesQuantity,
} from "@/lib/batimum-price-library";
import { extractChantierMetrics, type ChantierMetrics } from "@/lib/bibliotheque-ratios";
import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";
import { textMatchesKeywords } from "@/lib/ai-devis-postes-globaux";
import { extractHauteurSousPlafond, isPlinthesPoste } from "@/lib/ai-devis-unites";

export type CoherenceEngineReport = {
  corrections: string[];
  informationsComplementaires: string[];
  suggestionsIAIntegrees: string[];
  suggestionsIANonIntegrees: string[];
  forfaitsGlobaux: string[];
  quantitesCorrigees: string[];
  prixReindexes: string[];
};

const FORFAIT_UNITS = new Set(["forfait", "forfait ht", "poste", "lot"]);
const INTEGER_UNITS = new Set(["unité", "unite", "u", "piece", "pièce"]);

function isForfaitUnit(unite: string): boolean {
  return FORFAIT_UNITS.has(unite.toLowerCase().trim());
}

function isIntegerUnit(unite: string): boolean {
  const u = unite.toLowerCase().trim();
  return INTEGER_UNITS.has(u) || u === "unité";
}

function lineText(designation: string, description?: string): string {
  return `${designation} ${description ?? ""}`.toLowerCase();
}

function extractPlafondSurfaceM2(
  corpus: string,
  metrics: ChantierMetrics,
): number | undefined {
  const match =
    corpus.match(/plafond[^.\d]{0,24}(\d+[,.]?\d*)\s*m[²2]/i) ??
    corpus.match(/(\d+[,.]?\d*)\s*m[²2][^.\n]{0,30}plafond/i);
  if (match?.[1]) {
    const value = Number(match[1].replace(",", "."));
    if (value > 0 && value < 200) return value;
  }
  return metrics.surfaceSdbM2;
}

function isPlafondLine(designation: string, description?: string): boolean {
  return textMatchesKeywords(lineText(designation, description), [
    "peinture plafond",
    "plafond",
    "faux plafond",
  ]);
}

function isPlacoLine(designation: string, description?: string): string | null {
  const text = lineText(designation, description);
  if (
    textMatchesKeywords(text, [
      "faux plafond",
      "placo",
      "doublage",
      "cloison",
      "jointage",
      "ba13",
    ])
  ) {
    return "PARTIE PLACO";
  }
  return null;
}

function hasInvalidFractionalQuantity(
  quantite: number,
  unite: string,
): boolean {
  if (isForfaitUnit(unite)) {
    return quantite !== 1;
  }
  if (isIntegerUnit(unite)) {
    return !Number.isInteger(quantite) || quantite < 0;
  }
  return quantite > 0 && quantite < 1 && isForfaitUnit(unite);
}

export function runCoherenceEngine(
  sections: AiDevisSection[],
  corpus: string,
): { sections: AiDevisSection[]; report: CoherenceEngineReport } {
  const report: CoherenceEngineReport = {
    corrections: [],
    informationsComplementaires: [],
    suggestionsIAIntegrees: [],
    suggestionsIANonIntegrees: [],
    forfaitsGlobaux: [],
    quantitesCorrigees: [],
    prixReindexes: [],
  };

  const metrics = extractChantierMetrics(corpus);
  const plafondSurface = extractPlafondSurfaceM2(corpus, metrics);

  const nextSections: AiDevisSection[] = [];

  for (const section of sections) {
    const lignes = [];

    for (const ligne of section.lignes) {
      let working = { ...ligne };
      const designationKey = normalizeBibliothequeKey(working.designation);

      if (isSuggestionOnlyLibraryEntry(working.designation)) {
        report.suggestionsIANonIntegrees.push(
          `💡 Suggestion IA (non intégrée au devis) : ${working.designation} — validation utilisateur requise.`,
        );
        report.corrections.push(
          `VMC retirée du devis (suggestion IA uniquement) : ${working.designation}`,
        );
        continue;
      }

      if (hasInvalidFractionalQuantity(working.quantite, working.unite)) {
        const previous = working.quantite;
        working.quantite = isForfaitUnit(working.unite)
          ? 1
          : isIntegerUnit(working.unite)
            ? Math.max(1, Math.round(working.quantite))
            : Math.round(working.quantite * 100) / 100;
        report.quantitesCorrigees.push(
          `${working.designation} : ${previous} ${working.unite} → ${working.quantite} ${working.unite}`,
        );
      }

      if (
        isPlinthesPoste(working.designation, working.description) &&
        working.unite.toLowerCase().trim() === "ml"
      ) {
        const surfaces = extractRoomSurfacesM2(corpus);
        const surfaceRef =
          surfaces.reduce((sum, value) => sum + value, 0) ||
          metrics.surfaceLogementM2 ||
          metrics.surfaceSdbM2 ||
          0;
        const hsp = extractHauteurSousPlafond(corpus);
        const estimated = estimatePlinthesMlFromCorpus(corpus);

        if (
          estimated &&
          (isForbiddenPlinthesQuantity(working.quantite, surfaceRef, hsp) ||
            working.quantite >= surfaceRef * 2)
        ) {
          const previous = working.quantite;
          working.quantite = estimated;
          working.quantiteEstimee = true;
          report.quantitesCorrigees.push(
            `Plinthes : ${previous} ml → ${estimated} ml (√(surface) × 4 × 0,8 — interdit surface × hsp)`,
          );
        }
      }

      const library = resolveLibraryPrice(working.designation);
      if (library?.forceForfait && working.quantite !== 1) {
        working.quantite = 1;
        working.unite = "forfait";
        report.quantitesCorrigees.push(
          `${working.designation} : forfait forcé (quantité = 1)`,
        );
      }

      if (library && working.prixUnitaireHT > 0) {
        const libEntry = findPriceLibraryEntry(working.designation);
        if (
          libEntry &&
          (working.prixUnitaireHT < libEntry.minPrice * 0.85 ||
            working.prixUnitaireHT > libEntry.maxPrice * 1.15)
        ) {
          const old = working.prixUnitaireHT;
          working.prixUnitaireHT = library.prixHT;
          working.fiabilitePrix = library.fiabilite;
          working.sourcePrix = "batimum";
          working.prixAVerifier = false;
          report.prixReindexes.push(
            `${working.designation} : ${old} € → ${library.prixHT} € (bibliothèque Batimum)`,
          );
        }
      } else if (library && working.prixUnitaireHT <= 0) {
        working.prixUnitaireHT = library.prixHT;
        working.fiabilitePrix = library.fiabilite;
        working.sourcePrix = "batimum";
        working.prixAVerifier = false;
        if (library.forceForfait) {
          working.unite = "forfait";
          working.quantite = 1;
        }
        report.prixReindexes.push(
          `${working.designation} : prix bibliothèque ${library.prixHT} €`,
        );
      }

      if (
        isPlafondLine(working.designation, working.description) &&
        plafondSurface &&
        working.unite === "m²" &&
        working.quantite > plafondSurface * 1.35
      ) {
        const old = working.quantite;
        working.quantite = Math.round(plafondSurface * 100) / 100;
        working.quantiteEstimee = true;
        report.corrections.push(
          `Surface plafond recalculée indépendamment des murs : ${old} m² → ${working.quantite} m²`,
        );
      }

      if (library?.minForfaitHT && working.unite === "m²") {
        const total = working.quantite * working.prixUnitaireHT;
        if (total < library.minForfaitHT && working.quantite > 0) {
          working.prixUnitaireHT = library.minForfaitHT;
          working.quantite = 1;
          working.unite = "forfait";
          report.corrections.push(
            `${working.designation} : forfait minimum ${library.minForfaitHT} € HT appliqué`,
          );
        }
      }

      const expectedPlacoSection = isPlacoLine(
        working.designation,
        working.description,
      );
      if (
        expectedPlacoSection &&
        section.titre.includes("SOLS") &&
        !section.titre.includes("PLACO")
      ) {
        report.corrections.push(
          `${working.designation} : catégorie incorrecte (doit être en PARTIE PLACO, pas PARTIE SOLS)`,
        );
      }

      if (
        working.description?.includes("Ajouté automatiquement") &&
        textMatchesKeywords(working.designation, ["miroir", "alimentation"])
      ) {
        report.informationsComplementaires.push(
          `Alimentation électrique miroir LED ajoutée automatiquement selon les standards Batimum.`,
        );
        report.suggestionsIAIntegrees.push(working.designation);
      } else if (working.description?.includes("Ajouté automatiquement")) {
        report.informationsComplementaires.push(
          `${working.designation} ajouté automatiquement selon les standards Batimum.`,
        );
        report.suggestionsIAIntegrees.push(working.designation);
      }

      if (designationKey.includes("douche italienne") && working.quantite !== 1) {
        working.quantite = 1;
        working.unite = "forfait";
        working.designation = "Reprise plomberie douche italienne - forfait";
        report.quantitesCorrigees.push(
          "Reprise plomberie douche italienne : forfait forcé (interdiction 0,96 forfait × prix)",
        );
      }

      lignes.push(working);
    }

    if (lignes.length > 0) {
      nextSections.push({
        ...section,
        lignes,
        sousTotalHT: computeAiSectionSubtotal({ ...section, lignes }),
      });
    }
  }

  return { sections: nextSections, report };
}

export function formatForfaitGlobalMessage(
  suppressedItems: string[],
): string[] {
  if (suppressedItems.length === 0) return [];
  return [
    `Ces éléments ont été retirés individuellement afin d'éviter toute double facturation : ${suppressedItems.join(" · ")}`,
  ];
}
