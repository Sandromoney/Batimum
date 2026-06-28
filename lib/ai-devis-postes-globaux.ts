import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";

export type AiDevisLigneLike = {
  designation: string;
  description: string;
  quantite: number;
  unite: string;
  prixUnitaireHT: number;
  tauxTVA: number;
  prixAVerifier: boolean;
};

export type AiDevisSectionLike = {
  titre: string;
  lignes: AiDevisLigneLike[];
  sousTotalHT: number;
};

export type PosteGlobalBundle = {
  id: string;
  /** Plus élevé = poste plus global (prime sur les autres). */
  priority: number;
  label: string;
  /** Mots-clés pour détecter la présence du poste global. */
  matchKeywords: string[];
  /** Sous-postes à ne pas facturer en plus si le global est présent. */
  suppressesKeywords: string[];
};

/**
 * Postes globaux Batimum — éviter la double facturation des sous-éléments inclus.
 * Hiérarchie : salle de bain complète > douche complète > receveur / paroi / colonne.
 */
export const POSTES_GLOBAUX_BUNDLES: PosteGlobalBundle[] = [
  {
    id: "sdb-complete",
    priority: 100,
    label: "Salle de bain complète",
    matchKeywords: [
      "salle de bain complete",
      "salle de bain complète",
      "renovation salle de bain complete",
      "renovation salle de bain complète",
      "sdb complete",
      "sdb complète",
      "creation salle de bain complete",
    ],
    suppressesKeywords: [
      "meuble vasque",
      "meuble double vasque",
      "miroir lumineux",
      "miroir",
      "robinetterie",
      "mitigeur",
      "douche complete",
      "douche complète",
      "receveur",
      "receveur douche",
      "paroi douche",
      "paroi de douche",
      "colonne de douche",
      "colonne douche",
      "baignoire",
      "wc suspendu",
      "wc au sol",
      "seche serviettes",
      "sèche-serviettes",
      "etancheite spec",
      "étanchéité spec",
    ],
  },
  {
    id: "douche-complete",
    priority: 50,
    label: "Douche complète",
    matchKeywords: [
      "douche complete",
      "douche complète",
      "douche fournie posee",
      "douche fournie posée",
      "installation douche complete",
      "installation douche complète",
    ],
    suppressesKeywords: [
      "receveur",
      "receveur douche",
      "bac douche",
      "paroi douche",
      "paroi de douche",
      "paroi verre",
      "colonne de douche",
      "colonne douche",
      "mitigeur douche",
      "robinet douche",
      "etancheite douche",
      "étanchéité douche",
    ],
  },
  {
    id: "cuisine-complete",
    priority: 80,
    label: "Cuisine complète",
    matchKeywords: [
      "cuisine complete",
      "cuisine complète",
      "renovation cuisine complete",
      "renovation cuisine complète",
      "amenagement cuisine complete",
      "aménagement cuisine complète",
      "cuisine equipee",
      "cuisine équipée",
      "cuisine cle en main",
      "cuisine clé en main",
    ],
    suppressesKeywords: [
      "meuble cuisine",
      "meubles cuisine",
      "meuble bas",
      "meuble haut",
      "plan de travail",
      "electromenager",
      "électroménager",
      "four",
      "plaque",
      "hotte",
      "evier",
      "évier",
      "robinetterie cuisine",
      "mitigeur cuisine",
      "credence",
      "crédence",
    ],
  },
];

export function getGlobalBundleIdsFromText(text: string): string[] {
  return POSTES_GLOBAUX_BUNDLES.filter((bundle) =>
    textMatchesKeywords(text, bundle.matchKeywords),
  )
    .sort((a, b) => b.priority - a.priority)
    .map((bundle) => bundle.id);
}

const SEPARATE_POSTE_MARKERS = [
  "separement",
  "separe",
  "en plus",
  "hors forfait",
  "en sus",
  "supplement",
  "poste distinct",
  "poste separe",
  "non inclus",
  "a part",
  "à part",
  "en complement",
  "en complément",
];

/**
 * Sous-poste explicitement demandé en plus d'un forfait global
 * (ex. « douche complète + paroi design en sus »).
 */
export function isSubPostExplicitlySeparate(
  corpus: string,
  subPostKeywords: string[],
  bundleId: string,
): boolean {
  const bundle = POSTES_GLOBAUX_BUNDLES.find((item) => item.id === bundleId);
  if (!bundle) return false;

  const normalized = normalizeBibliothequeKey(corpus);
  const hasSeparateMarker = SEPARATE_POSTE_MARKERS.some((marker) =>
    normalized.includes(normalizeBibliothequeKey(marker)),
  );

  const matchesSubPost = textMatchesKeywords(corpus, subPostKeywords);
  if (!matchesSubPost) return false;

  if (hasSeparateMarker) return true;

  // Mot-clé spécifique du sous-poste présent sans formulation « global »
  const specificKeywords = subPostKeywords.filter((kw) => {
    const key = normalizeBibliothequeKey(kw);
    return (
      key.length >= 4 &&
      !bundle.matchKeywords.some((globalKw) => {
        const gk = normalizeBibliothequeKey(globalKw);
        return gk.includes(key) || key.includes(gk);
      })
    );
  });

  const hasGlobalPhrase = textMatchesKeywords(corpus, bundle.matchKeywords);
  if (!hasGlobalPhrase) return matchesSubPost;

  return specificKeywords.some((kw) =>
    normalized.includes(normalizeBibliothequeKey(kw)),
  );
}

export function isLineCoveredByActiveGlobal(
  ligne: Pick<AiDevisLigneLike, "designation" | "description">,
  activeBundleIds: string[],
): boolean {
  const text = lineText(ligne);
  for (const bundleId of activeBundleIds) {
    const bundle = POSTES_GLOBAUX_BUNDLES.find((item) => item.id === bundleId);
    if (!bundle) continue;
    if (textMatchesKeywords(text, bundle.matchKeywords)) continue;
    if (textMatchesKeywords(text, bundle.suppressesKeywords)) return true;
  }
  return false;
}

function lineText(ligne: Pick<AiDevisLigneLike, "designation" | "description">): string {
  return `${ligne.designation} ${ligne.description}`;
}

export function textMatchesKeywords(text: string, keywords: string[]): boolean {
  const normalized = normalizeBibliothequeKey(text);
  if (!normalized) return false;

  return keywords.some((keyword) => {
    const key = normalizeBibliothequeKey(keyword);
    if (!key) return false;
    return normalized.includes(key) || key.includes(normalized);
  });
}

export type PosteGlobalOverlap = {
  globalLabel: string;
  globalDesignation: string;
  suppressedDesignation: string;
  reason: string;
};

export function detectPostesGlobauxOverlaps(
  sections: Pick<AiDevisSectionLike, "lignes">[],
): PosteGlobalOverlap[] {
  const allLines = sections.flatMap((section) => section.lignes);
  const activeBundles = POSTES_GLOBAUX_BUNDLES.filter((bundle) =>
    allLines.some((ligne) => textMatchesKeywords(lineText(ligne), bundle.matchKeywords)),
  ).sort((a, b) => b.priority - a.priority);

  if (activeBundles.length === 0) return [];

  const overlaps: PosteGlobalOverlap[] = [];
  const globalLines = new Map<string, string>();

  for (const bundle of activeBundles) {
    const globalLine = allLines.find((ligne) =>
      textMatchesKeywords(lineText(ligne), bundle.matchKeywords),
    );
    if (globalLine) {
      globalLines.set(bundle.id, globalLine.designation);
    }
  }

  const highestPriority = activeBundles[0];

  for (const ligne of allLines) {
    const text = lineText(ligne);

    for (const bundle of activeBundles) {
      if (textMatchesKeywords(text, bundle.matchKeywords)) {
        if (bundle.id !== highestPriority.id) {
          overlaps.push({
            globalLabel: highestPriority.label,
            globalDesignation: globalLines.get(highestPriority.id) ?? highestPriority.label,
            suppressedDesignation: ligne.designation,
            reason: `Inclus dans « ${highestPriority.label} » — poste global « ${bundle.label} » redondant`,
          });
        }
        continue;
      }

      if (textMatchesKeywords(text, bundle.suppressesKeywords)) {
        overlaps.push({
          globalLabel: bundle.label,
          globalDesignation: globalLines.get(bundle.id) ?? bundle.label,
          suppressedDesignation: ligne.designation,
          reason: `Sous-poste inclus dans « ${bundle.label} »`,
        });
      }
    }
  }

  const seen = new Set<string>();
  return overlaps.filter((overlap) => {
    const key = `${overlap.suppressedDesignation}::${overlap.globalLabel}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shouldRemoveLine(
  ligne: AiDevisLigneLike,
  activeBundles: PosteGlobalBundle[],
  highestPriority: PosteGlobalBundle | undefined,
  corpus?: string,
): { remove: boolean; reason?: string } {
  const text = lineText(ligne);

  if (!highestPriority) return { remove: false };

  for (const bundle of activeBundles) {
    if (
      bundle.id !== highestPriority.id &&
      textMatchesKeywords(text, bundle.matchKeywords)
    ) {
      return {
        remove: true,
        reason: `Poste global redondant — « ${highestPriority.label} » couvre « ${bundle.label} »`,
      };
    }
  }

  for (const bundle of activeBundles) {
    if (textMatchesKeywords(text, bundle.matchKeywords)) {
      continue;
    }
    if (textMatchesKeywords(text, bundle.suppressesKeywords)) {
      if (
        corpus &&
        isSubPostExplicitlySeparate(corpus, [ligne.designation, ligne.description], bundle.id)
      ) {
        continue;
      }
      return {
        remove: true,
        reason: `Sous-poste inclus dans « ${bundle.label} »`,
      };
    }
  }

  return { remove: false };
}

export function deduplicatePostesGlobauxSections<T extends AiDevisSectionLike>(
  sections: T[],
  options?: { corpus?: string },
): {
  sections: T[];
  removed: Array<{ designation: string; reason: string }>;
} {
  const activeBundles = POSTES_GLOBAUX_BUNDLES.filter((bundle) =>
    sections.some((section) =>
      section.lignes.some((ligne) =>
        textMatchesKeywords(lineText(ligne), bundle.matchKeywords),
      ),
    ),
  ).sort((a, b) => b.priority - a.priority);

  if (activeBundles.length === 0) {
    return { sections, removed: [] };
  }

  const highestPriority = activeBundles[0];
  const removed: Array<{ designation: string; reason: string }> = [];

  const nextSections = sections
    .map((section) => {
      const lignes = section.lignes.filter((ligne) => {
        const decision = shouldRemoveLine(
          ligne,
          activeBundles,
          highestPriority,
          options?.corpus,
        );
        if (decision.remove) {
          removed.push({
            designation: ligne.designation,
            reason: decision.reason ?? "Doublon poste global",
          });
          return false;
        }
        return true;
      });

      if (lignes.length === 0) return null;

      const sousTotalHT =
        Math.round(
          lignes.reduce(
            (sum, ligne) => sum + ligne.quantite * ligne.prixUnitaireHT,
            0,
          ) * 100,
        ) / 100;

      return { ...section, lignes, sousTotalHT };
    })
    .filter((section): section is T => section !== null);

  return { sections: nextSections, removed };
}

export function formatPostesGlobauxRulesForPrompt(): string {
  const rules = POSTES_GLOBAUX_BUNDLES.sort((a, b) => b.priority - a.priority).map(
    (bundle) => {
      const inclus = bundle.suppressesKeywords.slice(0, 12).join(", ");
      return `- « ${bundle.label} » → NE PAS ajouter en plus : ${inclus}${bundle.suppressesKeywords.length > 12 ? "…" : ""}`;
    },
  );

  return [
    "RÈGLES POSTES GLOBAUX (ANTI-DOUBLONS — OBLIGATOIRE) :",
    "Si un poste global/forfait est chiffré, ne pas détailler les sous-postes déjà inclus.",
    "Choisir UNE seule approche : soit le forfait global, soit le détail ligne par ligne — jamais les deux.",
    "",
    ...rules,
    "",
    "Exemples interdits :",
    "- « Douche complète » + receveur + paroi + colonne de douche (sauf si postes séparés explicitement demandés)",
    "- « Salle de bain complète » + meuble vasque + miroir + robinetterie",
    "- « Cuisine complète » + meubles + électroménager + évier + crédence",
    "- « Meuble double vasque avec miroir » → inclure le meuble ET le miroir (pas l'un sans l'autre)",
    "",
    "Avant de répondre : vérifier qu'aucun chevauchement global/sous-poste ne subsiste.",
    "Si un global est retenu, mentionner dans la description du global ce qui est inclus.",
  ].join("\n");
}
