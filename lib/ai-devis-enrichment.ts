import { computeAiDevisConfiance } from "@/lib/ai-devis-confiance";
import { applyUnitConversionToLigne } from "@/lib/ai-devis-unites";
import { resolvePrixBibliothequePrioritaire } from "@/lib/bibliotheque-prix";
import {
  estimateQuantityFromRatios,
  extractChantierMetrics,
  type ChantierMetrics,
} from "@/lib/bibliotheque-ratios";
import type { AiDevisLigne, AiDevisSection } from "@/lib/ai-devis";
import { computeAiSectionSubtotal } from "@/lib/ai-devis";
import type { BtpNiveauPrix } from "@/lib/btp-tarifs-reference";
import type { BibliothequeEntrepriseEntry, BibliothequeRatioEntry } from "@/lib/types";

export type AiDevisEnrichmentContext = {
  corpus: string;
  regionCode: string;
  departementCode: string;
  niveauPrix: BtpNiveauPrix;
  bibliothequeEntries?: BibliothequeEntrepriseEntry[];
  coefficientRegionalManuel?: number | null;
  ratioEntries?: BibliothequeRatioEntry[];
};

export type AiDevisEnrichmentReport = {
  conversionsUnites: string[];
  ratiosAppliques: string[];
  sourcesPrix: Array<{
    designation: string;
    source: string;
    fiabilite: number;
  }>;
};

function enrichLigne(
  ligne: AiDevisLigne,
  context: AiDevisEnrichmentContext,
  metrics: ChantierMetrics,
): { ligne: AiDevisLigne; conversions: string[]; ratios: string[] } {
  const conversions: string[] = [];
  const ratios: string[] = [];
  let working = { ...ligne };

  const unitResult = applyUnitConversionToLigne(working, context.corpus);
  if (unitResult.converted) {
    working = { ...unitResult.ligne, conversionUniteNote: unitResult.note };
    if (unitResult.note) conversions.push(`${working.designation} : ${unitResult.note}`);
  }

  const ratioEstimate = estimateQuantityFromRatios({
    designation: working.designation,
    description: working.description,
    quantite: working.quantite,
    unite: working.unite,
    metrics,
    ratios: context.ratioEntries ?? [],
    corpus: context.corpus,
  });

  if (ratioEstimate) {
    working = {
      ...working,
      quantite: ratioEstimate.quantite,
      quantiteEstimee: true,
      ratioApplique: ratioEstimate.ratioApplique,
      description: working.description
        ? `${working.description} — ${ratioEstimate.ratioApplique}`
        : ratioEstimate.ratioApplique,
    };
    ratios.push(`${working.designation} : ${ratioEstimate.ratioApplique}`);
  }

  const resolved = resolvePrixBibliothequePrioritaire({
    designation: working.designation,
    bibliothequeEntries: context.bibliothequeEntries,
    regionCode: context.regionCode,
    departementCode: context.departementCode,
    niveauPrix: context.niveauPrix,
    coefficientManuel: context.coefficientRegionalManuel,
  });

  if (resolved.prixHT > 0 && (working.prixUnitaireHT <= 0 || working.prixAVerifier)) {
    working = {
      ...working,
      prixUnitaireHT: resolved.prixHT,
      prixAVerifier: resolved.prixAVerifier,
    };
  }

  working = {
    ...working,
    sourcePrix: resolved.source,
    fiabilitePrix: resolved.fiabilite ?? (working.prixAVerifier ? 0 : 60),
    prixAVerifier: working.prixAVerifier || resolved.prixAVerifier,
  };

  return { ligne: working, conversions, ratios };
}

export function enrichAiDevisSections(
  sections: AiDevisSection[],
  context: AiDevisEnrichmentContext,
): {
  sections: AiDevisSection[];
  report: AiDevisEnrichmentReport;
  scoreConfiance: number;
  detailConfiance: ReturnType<typeof computeAiDevisConfiance>["detail"];
  resumeConfiance: string;
} {
  const metrics = extractChantierMetrics(context.corpus);
  const conversionsUnites: string[] = [];
  const ratiosAppliques: string[] = [];
  const sourcesPrix: AiDevisEnrichmentReport["sourcesPrix"] = [];
  const allLignes: AiDevisLigne[] = [];

  const enrichedSections = sections.map((section) => {
    const lignes = section.lignes.map((ligne) => {
      const { ligne: enriched, conversions, ratios } = enrichLigne(
        ligne,
        context,
        metrics,
      );
      conversionsUnites.push(...conversions);
      ratiosAppliques.push(...ratios);
      sourcesPrix.push({
        designation: enriched.designation,
        source: enriched.sourcePrix ?? "a_verifier",
        fiabilite: enriched.fiabilitePrix ?? 0,
      });
      allLignes.push(enriched);
      return enriched;
    });

    return {
      ...section,
      lignes,
      sousTotalHT: computeAiSectionSubtotal({ lignes }),
    };
  });

  const confiance = computeAiDevisConfiance(allLignes);

  return {
    sections: enrichedSections,
    report: {
      conversionsUnites,
      ratiosAppliques,
      sourcesPrix,
    },
    scoreConfiance: confiance.score,
    detailConfiance: confiance.detail,
    resumeConfiance: confiance.resume,
  };
}
