import {
  BATIMUM_PRIX_CATALOGUE,
  findBatimumCatalogueEntry,
  getAdjustedBatimumPrice,
} from "@/lib/batimum-prix-catalogue";
import { resolveLibraryPrice } from "@/lib/batimum-price-library";
import {
  deduplicatePostesGlobauxSections,
  detectPostesGlobauxOverlaps,
  getGlobalBundleIdsFromText,
  isSubPostExplicitlySeparate,
  POSTES_GLOBAUX_BUNDLES,
  textMatchesKeywords,
  type AiDevisLigneLike,
  type AiDevisSectionLike,
} from "@/lib/ai-devis-postes-globaux";
import { resolveLigneTauxTVA, applyTvaRulesToLigne } from "@/lib/ai-devis-tva";
import { enrichAiDevisSections } from "@/lib/ai-devis-enrichment";
import {
  formatForfaitGlobalMessage,
  runCoherenceEngine,
} from "@/lib/ai-devis-coherence";
import {
  SUGGESTION_ONLY_CATALOGUE_IDS,
} from "@/lib/batimum-price-library";
import { resolvePrixBibliothequePrioritaire } from "@/lib/bibliotheque-prix";
import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";
import type { AiDevisLigne, AiDevisResult, AiDevisSection } from "@/lib/ai-devis";
import { computeAiDevisTotalHT, computeAiSectionSubtotal } from "@/lib/ai-devis";
import type { BtpNiveauPrix } from "@/lib/btp-tarifs-reference";
import type { BibliothequeEntrepriseEntry, BibliothequeRatioEntry } from "@/lib/types";

export type AiDevisVerificationReport = {
  /** Éléments explicitement demandés par le client (après filtrage forfaits). */
  elementsDemandes: string[];
  /** Éléments repérés dans le devis final. */
  elementsDetectes: string[];
  elementsManquants: string[];
  doublonsDetectes: string[];
  conflitsPostesGlobaux: string[];
  elementsAjoutes: string[];
  /** Informations complémentaires ajoutées selon standards Batimum. */
  informationsComplementaires: string[];
  /** Suggestions IA intégrées au devis. */
  suggestionsIAIntegrees: string[];
  /** Suggestions IA non intégrées (validation utilisateur requise). */
  suggestionsIANonIntegrees: string[];
  /** Éléments retirés car inclus dans un forfait global. */
  forfaitsGlobaux: string[];
  complet: boolean;
  /** Étapes de vérification métier exécutées */
  etapes?: string[];
  sourcesPrix?: Array<{ designation: string; source: string; fiabilite: number }>;
  conversionsUnites?: string[];
  ratiosAppliques?: string[];
  correctionsCoherence?: string[];
};

export type AiDevisVerificationContext = {
  descriptionChantier: string;
  lotsIdentifies?: string[];
  reponsesQuestions?: Record<string, string>;
  hypothesesFromAnalysis?: string[];
  regionCode: string;
  departementCode: string;
  niveauPrix: BtpNiveauPrix;
  tauxTVA: number;
  bibliothequeEntries?: BibliothequeEntrepriseEntry[];
  coefficientRegionalManuel?: number | null;
  ratioEntries?: BibliothequeRatioEntry[];
};

type ChantierElementRef = {
  id: string;
  label: string;
  keywords: string[];
  catalogueId?: string;
  sectionTitre: string;
  unite: string;
  tva: number;
  coveredByGlobals: string[];
};

/** Demande formulée explicitement dans la description utilisateur. */
type ExplicitDemand = {
  id: string;
  label: string;
  elementIds: string[];
  /** Ne jamais retirer de la liste des éléments obligatoires (priorité sur forfaits). */
  mandatory: boolean;
  /** Une ligne combinée peut couvrir tous les elementIds. */
  allowCombinedLine: boolean;
  clientDetail?: string;
};

/** Ligne unique couvrant plusieurs postes (ex. meuble + miroir sur une seule ligne). */
const COMBINED_LINE_RULES: Array<{
  elementIds: string[];
  matchLine: (text: string) => boolean;
}> = [
  {
    elementIds: ["v1-plomb-meuble-double", "v1-elec-miroir"],
    matchLine: (text) =>
      textMatchesKeywords(text, ["meuble double vasque", "double vasque", "meuble 2 vasques"]) &&
      textMatchesKeywords(text, ["miroir", "miroir led", "miroir lumineux"]),
  },
  {
    elementIds: ["v1-plomb-meuble-vasque", "v1-elec-miroir"],
    matchLine: (text) =>
      textMatchesKeywords(text, ["meuble vasque"]) &&
      !textMatchesKeywords(text, ["double vasque", "meuble double"]) &&
      textMatchesKeywords(text, ["miroir", "miroir led", "miroir lumineux"]),
  },
];

/** Demandes composites : si le client les formule, exiger chaque composant. */
const COMPOSITE_DEMANDS: Array<{
  id: string;
  label: string;
  match: (corpus: string) => boolean;
  requiredElementIds: string[];
}> = [
  {
    id: "meuble-double-miroir",
    label: "Meuble double vasque avec miroir",
    match: (corpus) =>
      textMatchesKeywords(corpus, ["meuble double vasque", "double vasque"]) &&
      textMatchesKeywords(corpus, ["miroir"]),
    requiredElementIds: ["v1-plomb-meuble-double", "v1-elec-miroir"],
  },
  {
    id: "meuble-vasque-miroir",
    label: "Meuble vasque avec miroir",
    match: (corpus) =>
      textMatchesKeywords(corpus, ["meuble vasque"]) &&
      textMatchesKeywords(corpus, ["miroir"]) &&
      !textMatchesKeywords(corpus, ["double vasque", "meuble double"]),
    requiredElementIds: ["v1-plomb-meuble-vasque", "v1-elec-miroir"],
  },
  {
    id: "douche-complete-explicite",
    label: "Douche complète",
    match: (corpus) => textMatchesKeywords(corpus, ["douche complete", "douche complète"]),
    requiredElementIds: ["douche-complete"],
  },
];

const GLOBAL_CATALOGUE_IDS: Record<string, string> = {
  "douche-complete": "v1-plomb-douche-complete",
};

const CATEGORIE_SECTION: Record<string, string> = {
  Placo: "PARTIE PLACO",
  Isolation: "PARTIE ISOLATION",
  "Carrelage / Faïence": "PARTIE CARRELAGE / FAÏENCE",
  Sols: "PARTIE SOLS",
  Peinture: "PARTIE PEINTURE / FINITIONS",
  Plomberie: "PARTIE PLOMBERIE",
  Électricité: "PARTIE ÉLECTRICITÉ",
  Dépose: "PARTIE DÉPOSE / PRÉPARATION",
  "Évacuation / Nettoyage": "PARTIE NETTOYAGE / ÉVACUATION",
};

function buildElementRegistry(): ChantierElementRef[] {
  const fromCatalogue: ChantierElementRef[] = BATIMUM_PRIX_CATALOGUE.map((entry) => ({
    id: entry.id,
    label: entry.designation,
    keywords: [entry.designation, ...entry.motsCles],
    catalogueId: entry.id,
    sectionTitre: CATEGORIE_SECTION[entry.categorie] ?? "PARTIE DIVERS",
    unite: entry.unite,
    tva: entry.tvaHabituelle,
    coveredByGlobals: POSTES_GLOBAUX_BUNDLES.filter((bundle) =>
      bundle.suppressesKeywords.some((kw) =>
        textMatchesKeywords(`${entry.designation} ${entry.motsCles.join(" ")}`, [kw]),
      ),
    ).map((bundle) => bundle.id),
  }));

  const globals: ChantierElementRef[] = POSTES_GLOBAUX_BUNDLES.map((bundle) => ({
    id: bundle.id,
    label: bundle.label,
    keywords: bundle.matchKeywords,
    catalogueId: GLOBAL_CATALOGUE_IDS[bundle.id],
    sectionTitre: "PARTIE PLOMBERIE",
    unite: "forfait",
    tva: 10,
    coveredByGlobals: POSTES_GLOBAUX_BUNDLES.filter(
      (other) => other.priority > bundle.priority,
    ).map((other) => other.id),
  }));

  return [...globals, ...fromCatalogue];
}

const ELEMENT_REGISTRY = buildElementRegistry();

function buildClientCorpus(context: AiDevisVerificationContext): string {
  return [
    context.descriptionChantier,
    ...(context.lotsIdentifies ?? []),
    ...(context.hypothesesFromAnalysis ?? []),
    ...Object.values(context.reponsesQuestions ?? {}),
  ]
    .filter(Boolean)
    .join("\n");
}

function getElementById(id: string): ChantierElementRef | undefined {
  return ELEMENT_REGISTRY.find((element) => element.id === id);
}

function lineText(ligne: Pick<AiDevisLigneLike, "designation" | "description">): string {
  return `${ligne.designation} ${ligne.description}`;
}

function lineCoversElementId(
  ligne: Pick<AiDevisLigneLike, "designation" | "description">,
  elementId: string,
): boolean {
  const element = getElementById(elementId);
  if (!element) return false;
  return lineMatchesElement(ligne, element);
}

function lineCoversCombinedRule(
  ligne: Pick<AiDevisLigneLike, "designation" | "description">,
  elementIds: string[],
): boolean {
  const text = lineText(ligne);
  const rule = COMBINED_LINE_RULES.find(
    (item) =>
      item.elementIds.length === elementIds.length &&
      item.elementIds.every((id) => elementIds.includes(id)),
  );
  if (rule?.matchLine(text)) return true;
  return elementIds.every((id) => lineCoversElementId(ligne, id));
}

/**
 * Extrait les demandes explicites depuis la description utilisateur (prioritaire).
 */
function extractExplicitDemandsFromDescription(description: string): ExplicitDemand[] {
  const demands: ExplicitDemand[] = [];
  const dimMatch = description.match(/(\d{2,3})\s*cm/i);
  const clientDim = dimMatch ? `${dimMatch[1]} cm` : undefined;

  const hasMeubleDouble = textMatchesKeywords(description, [
    "meuble double vasque",
    "double vasque",
    "meuble 2 vasques",
  ]);
  const hasMeubleSimple = textMatchesKeywords(description, ["meuble vasque"]) && !hasMeubleDouble;
  const hasMiroir = textMatchesKeywords(description, [
    "miroir led",
    "miroir lumineux",
    "miroir",
  ]);

  if (hasMeubleDouble && hasMiroir) {
    demands.push({
      id: "explicit-meuble-double-miroir",
      label: clientDim
        ? `Meuble double vasque ${clientDim} avec miroir`
        : "Meuble double vasque avec miroir",
      elementIds: ["v1-plomb-meuble-double", "v1-elec-miroir"],
      mandatory: true,
      allowCombinedLine: true,
      clientDetail: clientDim,
    });
  } else if (hasMeubleDouble) {
    demands.push({
      id: "explicit-meuble-double",
      label: clientDim ? `Meuble double vasque ${clientDim}` : "Meuble double vasque",
      elementIds: ["v1-plomb-meuble-double"],
      mandatory: true,
      allowCombinedLine: false,
      clientDetail: clientDim,
    });
  } else if (hasMeubleSimple && hasMiroir) {
    demands.push({
      id: "explicit-meuble-miroir",
      label: "Meuble vasque avec miroir",
      elementIds: ["v1-plomb-meuble-vasque", "v1-elec-miroir"],
      mandatory: true,
      allowCombinedLine: true,
    });
  } else if (hasMeubleSimple) {
    demands.push({
      id: "explicit-meuble-vasque",
      label: "Meuble vasque",
      elementIds: ["v1-plomb-meuble-vasque"],
      mandatory: true,
      allowCombinedLine: false,
    });
  } else if (hasMiroir) {
    demands.push({
      id: "explicit-miroir",
      label: textMatchesKeywords(description, ["miroir led"])
        ? "Miroir LED / lumineux"
        : "Miroir lumineux",
      elementIds: ["v1-elec-miroir"],
      mandatory: true,
      allowCombinedLine: false,
    });
  }

  if (textMatchesKeywords(description, ["douche complete", "douche complète"])) {
    demands.push({
      id: "explicit-douche-complete",
      label: "Douche complète",
      elementIds: ["douche-complete"],
      mandatory: true,
      allowCombinedLine: false,
    });
  }

  return demands;
}

function getClientDetailForElement(
  elementId: string,
  explicitDemands: ExplicitDemand[],
): string | undefined {
  for (const demand of explicitDemands) {
    if (demand.elementIds.includes(elementId)) {
      return demand.clientDetail;
    }
  }
  return undefined;
}

function isElementPresentInDevis(
  elementId: string,
  sections: AiDevisSectionLike[],
  presentIds: Set<string>,
  activeGlobals: string[],
  mandatoryIds: Set<string>,
): boolean {
  if (presentIds.has(elementId)) return true;

  if (sections.some((section) => section.lignes.some((l) => lineCoversElementId(l, elementId)))) {
    return true;
  }

  for (const rule of COMBINED_LINE_RULES) {
    if (!rule.elementIds.includes(elementId)) continue;
    if (sections.some((section) => section.lignes.some((l) => rule.matchLine(lineText(l))))) {
      return true;
    }
  }

  const element = getElementById(elementId);
  if (!element) return false;

  if (mandatoryIds.has(elementId)) {
    return false;
  }

  return element.coveredByGlobals.some((globalId) => activeGlobals.includes(globalId));
}

function lineMatchesElement(
  ligne: Pick<AiDevisLigneLike, "designation" | "description">,
  element: ChantierElementRef,
): boolean {
  return textMatchesKeywords(lineText(ligne), element.keywords);
}

function labelForElementId(id: string): string {
  return ELEMENT_REGISTRY.find((element) => element.id === id)?.label ?? id;
}

function extractRawRequestedElementIds(corpus: string): string[] {
  const requested: string[] = [];

  for (const element of ELEMENT_REGISTRY) {
    if (textMatchesKeywords(corpus, element.keywords)) {
      requested.push(element.id);
    }
  }

  for (const composite of COMPOSITE_DEMANDS) {
    if (composite.match(corpus)) {
      requested.push(...composite.requiredElementIds);
    }
  }

  return [...new Set(requested)];
}

/**
 * Si un forfait global est demandé, exclure ses sous-postes sauf demande séparée explicite.
 * Les éléments mandatory (demande explicite utilisateur) ne sont jamais retirés.
 */
function refineRequestedElementIds(
  corpus: string,
  rawIds: string[],
  mandatoryIds: Set<string>,
): string[] {
  const globalsInCorpus = getGlobalBundleIdsFromText(corpus);

  const filtered = rawIds.filter((id) => {
    if (mandatoryIds.has(id)) return true;

    const element = getElementById(id);
    if (!element) return false;

    for (const globalId of globalsInCorpus) {
      if (!element.coveredByGlobals.includes(globalId)) continue;

      if (isSubPostExplicitlySeparate(corpus, element.keywords, globalId)) {
        return true;
      }
      return false;
    }

    return true;
  });

  return [...new Set([...mandatoryIds, ...filtered])];
}

function detectPresentElementIds(sections: AiDevisSectionLike[]): string[] {
  const present = new Set<string>();

  for (const section of sections) {
    for (const ligne of section.lignes) {
      for (const element of ELEMENT_REGISTRY) {
        if (lineMatchesElement(ligne, element)) {
          present.add(element.id);
        }
      }
    }
  }

  return [...present];
}

function getActiveGlobalBundleIdsFromDevis(sections: AiDevisSectionLike[]): string[] {
  return POSTES_GLOBAUX_BUNDLES.filter((bundle) =>
    sections.some((section) =>
      section.lignes.some((ligne) =>
        textMatchesKeywords(`${ligne.designation} ${ligne.description}`, bundle.matchKeywords),
      ),
    ),
  ).map((bundle) => bundle.id);
}

function getEffectiveActiveGlobals(corpus: string, sections: AiDevisSectionLike[]): string[] {
  const fromDevis = getActiveGlobalBundleIdsFromDevis(sections);
  const fromCorpus = getGlobalBundleIdsFromText(corpus);
  return [...new Set([...fromDevis, ...fromCorpus])];
}

function isElementCovered(
  elementId: string,
  sections: AiDevisSectionLike[],
  presentIds: Set<string>,
  activeGlobals: string[],
  mandatoryIds: Set<string>,
): boolean {
  return isElementPresentInDevis(
    elementId,
    sections,
    presentIds,
    activeGlobals,
    mandatoryIds,
  );
}

function shouldAutoAddMissing(
  elementId: string,
  sections: AiDevisSectionLike[],
  corpus: string,
  presentIds: Set<string>,
  activeGlobals: string[],
  mandatoryIds: Set<string>,
): boolean {
  if (SUGGESTION_ONLY_CATALOGUE_IDS.has(elementId)) {
    return false;
  }

  if (
    isElementPresentInDevis(elementId, sections, presentIds, activeGlobals, mandatoryIds)
  ) {
    return false;
  }

  if (mandatoryIds.has(elementId)) return true;

  const element = getElementById(elementId);
  if (!element) return false;

  const globalsInCorpus = getGlobalBundleIdsFromText(corpus);
  for (const globalId of globalsInCorpus) {
    if (element.coveredByGlobals.includes(globalId)) {
      return isSubPostExplicitlySeparate(corpus, element.keywords, globalId);
    }
  }

  return true;
}

function detectExactDuplicateDesignations(sections: AiDevisSectionLike[]): string[] {
  const byKey = new Map<string, string[]>();

  for (const section of sections) {
    for (const ligne of section.lignes) {
      const key = normalizeBibliothequeKey(ligne.designation);
      if (!key) continue;
      const list = byKey.get(key) ?? [];
      list.push(ligne.designation);
      byKey.set(key, list);
    }
  }

  return [...byKey.values()]
    .filter((labels) => labels.length > 1)
    .map((labels) => labels[0]);
}

function detectAllPossibleDuplicates(sections: AiDevisSectionLike[]): string[] {
  const exact = detectExactDuplicateDesignations(sections);
  const globalOverlaps = detectPostesGlobauxOverlaps(sections).map(
    (overlap) => `${overlap.suppressedDesignation} / ${overlap.globalLabel}`,
  );
  return [...new Set([...exact, ...globalOverlaps])];
}

function removeExactDuplicateLines<T extends AiDevisSectionLike>(sections: T[]): T[] {
  const seen = new Set<string>();

  return sections
    .map((section) => {
      const lignes = section.lignes.filter((ligne) => {
        const key = normalizeBibliothequeKey(ligne.designation);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (lignes.length === 0) return null;

      const sousTotalHT =
        Math.round(
          lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaireHT, 0) * 100,
        ) / 100;

      return { ...section, lignes, sousTotalHT };
    })
    .filter((section): section is T => section !== null);
}

function resolvePriceForElement(
  element: ChantierElementRef,
  context: AiDevisVerificationContext,
): {
  prixHT: number;
  prixAVerifier: boolean;
  tva: number;
  source?: import("@/lib/types").AiPrixSource;
  fiabilite?: number;
} {
  const catalogue = element.catalogueId
    ? BATIMUM_PRIX_CATALOGUE.find((entry) => entry.id === element.catalogueId)
    : findBatimumCatalogueEntry(element.label);

  const resolved = resolvePrixBibliothequePrioritaire({
    designation: element.label,
    bibliothequeEntries: context.bibliothequeEntries,
    regionCode: context.regionCode,
    departementCode: context.departementCode,
    niveauPrix: context.niveauPrix,
    coefficientManuel: context.coefficientRegionalManuel,
  });

  if (resolved.prixHT > 0) {
    return {
      prixHT: resolved.prixHT,
      prixAVerifier: resolved.prixAVerifier,
      tva: resolved.tvaHabituelle ?? element.tva,
      source: resolved.source,
      fiabilite: resolved.fiabilite,
    };
  }

  if (catalogue) {
    const prixHT = getAdjustedBatimumPrice(catalogue, {
      regionCode: context.regionCode,
      departementCode: context.departementCode,
      niveauPrix: context.niveauPrix,
      coefficientManuel: context.coefficientRegionalManuel,
      field: "moyen",
    });
    return {
      prixHT,
      prixAVerifier: false,
      tva: catalogue.tvaHabituelle,
      source: "batimum",
      fiabilite: 60,
    };
  }

  return {
    prixHT: 0,
    prixAVerifier: true,
    tva: element.tva,
    source: "a_verifier",
    fiabilite: 0,
  };
}

function insertMissingLine(
  sections: AiDevisSection[],
  element: ChantierElementRef,
  context: AiDevisVerificationContext,
  clientDetail?: string,
): AiDevisLigne {
  const { prixHT, prixAVerifier, source, fiabilite } = resolvePriceForElement(
    element,
    context,
  );

  const descriptionParts = [
    "Ajouté automatiquement — élément explicitement demandé par le client.",
    clientDetail ? `Précision client : ${clientDetail}` : null,
    prixAVerifier ? "Prix à vérifier." : null,
  ].filter(Boolean);

  const ligne: AiDevisLigne = {
    designation: element.label,
    description: descriptionParts.join(" "),
    quantite: 1,
    unite: element.unite,
    prixUnitaireHT: prixHT,
    tauxTVA: resolveLigneTauxTVA({
      designation: element.label,
      description: descriptionParts.join(" "),
      defaultTva: context.tauxTVA,
      corpus: context.descriptionChantier,
    }),
    prixAVerifier,
    sourcePrix: source,
    fiabilitePrix: fiabilite,
  };

  let section = sections.find((s) => s.titre === element.sectionTitre);
  if (!section) {
    section = {
      titre: element.sectionTitre,
      lignes: [],
      sousTotalHT: 0,
    };
    sections.push(section);
  }

  section.lignes.push(ligne);
  section.sousTotalHT = computeAiSectionSubtotal(section);

  return ligne;
}

export function verifyAndCompleteAiDevis(
  devis: AiDevisResult,
  context: AiDevisVerificationContext,
): { devis: AiDevisResult; rapport: AiDevisVerificationReport } {
  const corpus = buildClientCorpus(context);
  const explicitDemands = extractExplicitDemandsFromDescription(
    context.descriptionChantier,
  );
  const mandatoryIds = new Set(
    explicitDemands.flatMap((demand) => demand.elementIds),
  );

  const rawRequestedIds = extractRawRequestedElementIds(corpus);
  const requestedIds = refineRequestedElementIds(corpus, rawRequestedIds, mandatoryIds);
  const elementsDemandes = [
    ...explicitDemands.map((demand) => demand.label),
    ...requestedIds
      .filter((id) => !mandatoryIds.has(id))
      .map(labelForElementId),
  ];
  const uniqueElementsDemandes = [...new Set(elementsDemandes)];

  let sections: AiDevisSection[] = devis.sections.map((section) => ({
    ...section,
    lignes: [...section.lignes],
  }));

  const doublonsAvant = detectAllPossibleDuplicates(sections);
  const conflitsInitiaux = detectPostesGlobauxOverlaps(sections).map(
    (overlap) =>
      `${overlap.suppressedDesignation} ↔ ${overlap.globalLabel} (${overlap.reason})`,
  );

  const { sections: afterGlobalDedup, removed: globalRemoved } =
    deduplicatePostesGlobauxSections(sections, { corpus });
  sections = afterGlobalDedup;
  sections = removeExactDuplicateLines(sections);

  const presentIds = new Set(detectPresentElementIds(sections));
  const activeGlobals = getEffectiveActiveGlobals(corpus, sections);

  const missingIds = requestedIds.filter((id) =>
    shouldAutoAddMissing(
      id,
      sections,
      corpus,
      presentIds,
      activeGlobals,
      mandatoryIds,
    ),
  );

  const elementsAjoutes: string[] = [];

  for (const missingId of missingIds) {
    const element = getElementById(missingId);
    if (!element) continue;

    const clientDetail = getClientDetailForElement(missingId, explicitDemands);
    const added = insertMissingLine(sections, element, context, clientDetail);
    elementsAjoutes.push(added.designation);
    presentIds.add(missingId);
  }

  const { sections: finalSections, removed: finalGlobalRemoved } =
    deduplicatePostesGlobauxSections(sections, { corpus });
  sections = removeExactDuplicateLines(finalSections);

  const finalPresentIds = new Set(detectPresentElementIds(sections));
  const finalGlobals = getEffectiveActiveGlobals(corpus, sections);
  const elementsManquants = requestedIds
    .filter(
      (id) =>
        !isElementCovered(id, sections, finalPresentIds, finalGlobals, mandatoryIds),
    )
    .map(labelForElementId);

  const elementsDetectes = [...finalPresentIds].map(labelForElementId).sort();

  const allGlobalRemoved = [...globalRemoved, ...finalGlobalRemoved];
  const conflitsPostesGlobaux = [
    ...conflitsInitiaux,
    ...allGlobalRemoved.map((item) => `${item.designation} (${item.reason})`),
  ];

  const doublonsDetectes = [
    ...new Set([...doublonsAvant, ...detectAllPossibleDuplicates(devis.sections)]),
  ];

  const verificationEtapes = [
    "1. Éléments demandés listés",
    "2. Éléments générés analysés",
    "3. Comparaison demande / devis",
    elementsAjoutes.length > 0
      ? `4. ${elementsAjoutes.length} élément(s) oublié(s) ajouté(s)`
      : "4. Aucun élément manquant à ajouter",
    allGlobalRemoved.length > 0 || doublonsDetectes.length > 0
      ? "5. Doublons supprimés"
      : "5. Aucun doublon détecté",
    "6. Cohérence globale vérifiée",
  ];

  const rapport: AiDevisVerificationReport = {
    elementsDemandes: uniqueElementsDemandes,
    elementsDetectes: [...new Set(elementsDetectes)],
    elementsManquants,
    doublonsDetectes,
    conflitsPostesGlobaux: [...new Set(conflitsPostesGlobaux)],
    elementsAjoutes,
    informationsComplementaires: [],
    suggestionsIAIntegrees: [],
    suggestionsIANonIntegrees: [],
    forfaitsGlobaux: [],
    complet: elementsManquants.length === 0,
    etapes: verificationEtapes,
    correctionsCoherence: [],
  };

  const sectionsWithTva = sections.map((section) => ({
    ...section,
    lignes: section.lignes.map((ligne) =>
      applyTvaRulesToLigne(ligne, context.tauxTVA, corpus),
    ),
  }));

  const enriched = enrichAiDevisSections(sectionsWithTva, {
    corpus,
    regionCode: context.regionCode,
    departementCode: context.departementCode,
    niveauPrix: context.niveauPrix,
    bibliothequeEntries: context.bibliothequeEntries,
    coefficientRegionalManuel: context.coefficientRegionalManuel,
    ratioEntries: context.ratioEntries,
  });

  const coherence = runCoherenceEngine(enriched.sections, corpus);

  const forfaitGlobalMessages = formatForfaitGlobalMessage(
    allGlobalRemoved.map((item) => item.designation),
  );

  const suggestionsVmc: string[] = [];
  if (
    textMatchesKeywords(corpus, ["salle de bain", "sdb", "douche"]) &&
    !coherence.sections.some((section) =>
      section.lignes.some((ligne) =>
        textMatchesKeywords(ligne.designation, ["vmc"]),
      ),
    )
  ) {
    suggestionsVmc.push(
      "💡 Suggestion IA (non intégrée au devis) : VMC simple flux — validation utilisateur obligatoire.",
    );
  }

  const rapportFinal: AiDevisVerificationReport = {
    ...rapport,
    sourcesPrix: enriched.report.sourcesPrix,
    conversionsUnites: enriched.report.conversionsUnites,
    ratiosAppliques: enriched.report.ratiosAppliques,
    informationsComplementaires: [
      ...new Set(coherence.report.informationsComplementaires),
    ],
    suggestionsIAIntegrees: [
      ...new Set([
        ...coherence.report.suggestionsIAIntegrees,
        ...elementsAjoutes,
      ]),
    ],
    suggestionsIANonIntegrees: [
      ...new Set([
        ...coherence.report.suggestionsIANonIntegrees,
        ...suggestionsVmc,
      ]),
    ],
    forfaitsGlobaux: forfaitGlobalMessages,
    correctionsCoherence: [
      ...coherence.report.corrections,
      ...coherence.report.quantitesCorrigees,
      ...coherence.report.prixReindexes,
    ],
    etapes: [
      ...(rapport.etapes ?? []),
      "7. Moteur de cohérence bibliothèque Batimum exécuté",
    ],
  };

  const hypothesesUtilisees = [
    ...(context.hypothesesFromAnalysis ?? []),
    ...(devis.hypothèses ?? []),
  ];

  const updatedDevis: AiDevisResult = {
    ...devis,
    sections: coherence.sections,
    totalHT: computeAiDevisTotalHT({ sections: coherence.sections }),
    hypothesesUtilisees,
    scoreConfiance: enriched.scoreConfiance,
    detailConfiance: enriched.detailConfiance,
    pointsAVerifier: [
      ...devis.pointsAVerifier.filter(
        (point) =>
          !point.startsWith("Doublons retirés") &&
          !point.startsWith("Éléments ajoutés") &&
          !point.startsWith("Conflits postes globaux"),
      ),
      enriched.resumeConfiance,
      ...(elementsAjoutes.length > 0
        ? [`Éléments ajoutés automatiquement : ${elementsAjoutes.join(", ")}`]
        : []),
      ...(allGlobalRemoved.length > 0
        ? [
            `Doublons retirés (forfait global) : ${allGlobalRemoved.map((r) => r.designation).join(", ")}`,
          ]
        : []),
    ],
    autoVerification: {
      ...devis.autoVerification,
      postesGlobauxCoherents: allGlobalRemoved.length === 0 && conflitsInitiaux.length === 0,
      doublonsSupprimes: allGlobalRemoved.map(
        (item) => `${item.designation} (${item.reason})`,
      ),
      travauxComplets: rapportFinal.complet,
    },
    rapportVerification: rapportFinal,
  };

  return { devis: updatedDevis, rapport: rapportFinal };
}

export function formatVerificationReportForPrompt(): string {
  return [
    "VÉRIFICATION PRÉ-GÉNÉRATION (OBLIGATOIRE — corriger avant réponse) :",
    "1. Comparer la demande utilisateur avec chaque ligne générée.",
    "2. Ne jamais oublier un élément explicitement demandé.",
    "3. Priorité absolue à la bibliothèque métier Batimum V3.",
    "4. Forfaits : quantité = 1 (jamais 0,96 forfait × prix).",
    "5. VMC : suggestion IA uniquement, jamais dans le devis sans validation.",
    "6. Peinture plafond : surface indépendante des murs, minimum 180 € HT.",
    "7. Reprise plomberie douche italienne : forfait 600–900 € HT (défaut 750 €).",
    "8. Signaler les suggestions IA et les éléments inclus dans un forfait global.",
  ].join("\n");
}
