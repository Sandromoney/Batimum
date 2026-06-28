/**
 * Bibliothèque de prix Batimum — base HT indicative pour MUM IA.
 * Les prix sont des références de départ, toujours modifiables par l'artisan.
 * L'IA ne doit jamais les présenter comme des vérités absolues.
 */

import {
  BATIMUM_LIBRARY_SECTIONS,
  type RawPriceRow,
} from "@/lib/batimum-price-library-data";
import {
  BATIMUM_CATEGORIES,
  BATIMUM_CORPS_ETAT,
  BATIMUM_PRICE_LIBRARY_VERSION,
  type BatimumCategory,
  type BatimumCorpsEtat,
  type BatimumPriceLibraryEntry,
} from "@/lib/batimum-price-library-types";

export {
  BATIMUM_CATEGORIES,
  BATIMUM_CORPS_ETAT,
  BATIMUM_PRICE_LIBRARY_VERSION,
  type BatimumCategory,
  type BatimumCorpsEtat,
  type BatimumPriceLibraryEntry,
};

const DEFAULT_NOTE =
  "Base HT indicative Batimum — modifiable par l'artisan. Ne jamais présenter comme vérité absolue.";

const CATALOGUE_ID_MAP: Record<string, string> = {
  "Dépose salle de bain complète": "v1-depose-sdb-complete",
  "Dépose carrelage sol": "v1-depose-carrelage",
  "Dépose faïence murale": "v1-depose-faience",
  "Protection chantier": "v1-protection-chantier",
  "Évacuation gravats": "v1-evac-gravats",
  "Nettoyage fin chantier": "v1-nettoyage-fin",
  "Reprise plomberie douche italienne": "lib-plomb-douche-italienne",
  "Déplacement évier jusqu'à 2 m": "lib-plomb-deplacement-evier",
  "Création plomberie îlot central": "lib-plomb-ilot-central",
  "Attente lave-vaisselle": "lib-plomb-attente-lave-vaisselle",
  "Évier 1 bac + mitigeur fourni/posé": "lib-plomb-evier-mitigeur",
  "Meuble double vasque fourni/posé": "v1-plomb-meuble-double",
  "WC suspendu fourni/posé": "v1-plomb-wc-suspendu",
  "Receveur extra-plat fourni/posé": "v1-plomb-receveur",
  "Paroi douche fixe fournie/posée": "v1-plomb-paroi",
  "Robinetterie douche complète": "lib-plomb-robinetterie-douche",
  "Sèche-serviettes électrique fourni/posé": "v1-plomb-seche-serviettes",
  "Prise électrique standard": "v1-elec-prise",
  "Interrupteur simple": "v1-elec-interrupteur",
  "Spot LED fourni/posé": "v1-elec-spot",
  "Alimentation miroir LED": "v1-elec-miroir",
  "VMC simple flux": "v1-elec-vmc",
  "Faux plafond BA13 hydro fourni/posé": "v1-placo-faux-plafond-hydro",
  "Doublage hydro sur ossature": "lib-placo-doublage-hydro",
  "Cloison hydro 72/48": "lib-placo-cloison-hydro",
  "Jointage placo": "v1-placo-bande-joint",
  "Laine de verre 200 mm": "v1-iso-200",
  "Carrelage grès cérame fourni/posé": "v1-carrelage-fp-std",
  "Pose faïence fournie/posée": "v1-faience-fp-std",
  "Plinthes carrelage": "v1-carrelage-plinthes",
  "Peinture plafond": "v1-peinture-plafond",
  "Peinture murs": "v1-peinture-murs",
  "Faux plafond BA13 standard fourni/posé": "v1-placo-faux-plafond-ba13",
};

const SUGGESTION_ONLY_LABELS = new Set([
  "VMC simple flux",
  "VMC hygroréglable",
]);

const EXTRA_KEYWORDS: Record<string, string[]> = {
  "Reprise plomberie douche italienne": [
    "douche italienne",
    "plomberie douche italienne",
    "modification plomberie douche",
  ],
  "Déplacement évier jusqu'à 2 m": ["deplacement evier 2 m", "déplacement évier 2 m"],
  "Création plomberie îlot central": ["ilot central", "îlot central", "reseau ilot"],
  "Plinthes carrelage": ["plinthes assorties", "plinthe carrelage"],
  "Carrelage grès cérame fourni/posé": ["gres cerame 60x60", "carrelage 60x60"],
};

const EXTRA_NOTES: Record<string, string> = {
  "Reprise plomberie douche italienne":
    "Forfait obligatoire. Ne jamais calculer 0,96 forfait × prix. Minimum 600 € HT.",
  "Plinthes carrelage":
    "Unité ml. Estimation : √(surface) × 4 × 0,8 par pièce, ou ~0,9 × surface totale. Jamais surface × hsp.",
  "Peinture plafond":
    "Surface plafond = surface au sol. Ne jamais utiliser la surface des murs.",
  "VMC simple flux":
    "Suggestion IA uniquement — ne jamais intégrer automatiquement au devis.",
  "VMC hygroréglable":
    "Suggestion IA uniquement — ne jamais intégrer automatiquement au devis.",
};

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(label: string): string {
  return normalizeKey(label).replace(/\s+/g, "-").slice(0, 72);
}

function buildKeywords(label: string): string[] {
  const base = normalizeKey(label);
  const extra = EXTRA_KEYWORDS[label] ?? [];
  return [...new Set([base, ...extra.map(normalizeKey)])];
}

function buildEntry(
  category: BatimumCategory,
  row: RawPriceRow,
): BatimumPriceLibraryEntry {
  const [label, unit, minPrice, defaultPrice, maxPrice] = row;
  const isForfait = unit === "forfait";
  const suggestionOnly = SUGGESTION_ONLY_LABELS.has(label);

  return {
    id: `lib-${slugify(label)}`,
    category,
    corpsEtat: category,
    label,
    unit,
    minPrice,
    defaultPrice,
    maxPrice,
    confidence: suggestionOnly ? 85 : 88,
    notes: EXTRA_NOTES[label] ?? DEFAULT_NOTE,
    keywords: buildKeywords(label),
    catalogueId: CATALOGUE_ID_MAP[label],
    suggestionOnly,
    forceForfait: isForfait,
    minForfaitHT: label === "Peinture plafond" ? 180 : undefined,
    tvaHabituelle:
      label === "Évacuation gravats" || category === "Nettoyage" ? 20 : 10,
  };
}

export const BATIMUM_PRICE_LIBRARY: BatimumPriceLibraryEntry[] =
  BATIMUM_LIBRARY_SECTIONS.flatMap((section) =>
    section.rows.map((row) => buildEntry(section.category, row)),
  );

const LIBRARY_BY_ID = new Map(
  BATIMUM_PRICE_LIBRARY.map((item) => [item.id, item]),
);

export function findPriceLibraryEntry(
  designation: string,
): BatimumPriceLibraryEntry | undefined {
  const key = normalizeKey(designation);
  if (!key) return undefined;

  const exact = BATIMUM_PRICE_LIBRARY.find(
    (item) => normalizeKey(item.label) === key,
  );
  if (exact) return exact;

  const keywordMatch = BATIMUM_PRICE_LIBRARY.find((item) =>
    item.keywords.some((kw) => {
      const kwKey = normalizeKey(kw);
      return kwKey === key || key.includes(kwKey) || kwKey.includes(key);
    }),
  );
  if (keywordMatch) return keywordMatch;

  return BATIMUM_PRICE_LIBRARY.find((item) => {
    const labelKey = normalizeKey(item.label);
    return labelKey.includes(key) || key.includes(labelKey);
  });
}

export function isSuggestionOnlyLibraryEntry(designation: string): boolean {
  return findPriceLibraryEntry(designation)?.suggestionOnly === true;
}

export function formatPriceLibraryForPrompt(): string {
  const lines: string[] = [
    `BIBLIOTHÈQUE DE PRIX BATIMUM ${BATIMUM_PRICE_LIBRARY_VERSION} (PRIORITÉ ABSOLUE — BASES HT INDICATIVES) :`,
    "- Ces prix sont des références de départ, modifiables par l'artisan.",
    "- Ne jamais les présenter comme vérité absolue.",
    "- Utiliser defaultPrice sauf prix entreprise verrouillé.",
    "- Forfaits : quantité = 1 (jamais 0,96 forfait).",
    "- Hors bibliothèque : marquer « Prix à vérifier ».",
    "- Prestation non demandée : marquer « Suggestion IA ».",
    "- VMC : suggestion IA uniquement, jamais dans le devis sans validation.",
    formatPlinthesEstimationRulesForPrompt(),
    "",
  ];

  for (const category of BATIMUM_CATEGORIES) {
    const items = BATIMUM_PRICE_LIBRARY.filter((item) => item.category === category);
    if (items.length === 0) continue;
    lines.push(`[${category.toUpperCase()}]`);
    for (const item of items) {
      const flag = item.suggestionOnly ? " [SUGGESTION IA]" : "";
      lines.push(
        `  • ${item.label} | ${item.unit} | ${item.defaultPrice} € HT (${item.minPrice}–${item.maxPrice}) | confiance ${item.confidence}%${flag}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function formatPriceLibraryRulesForPrompt(): string {
  return [
    "RÈGLES BIBLIOTHÈQUE BATIMUM :",
    "1. Poste demandé explicitement → doit apparaître.",
    "2. Poste implicite nécessaire → Suggestion IA.",
    "3. Prix bibliothèque → source « Bibliothèque Batimum ».",
    "4. Prix hors bibliothèque → « Prix à vérifier ».",
    "5. Forfait global → supprimer les doublons.",
    "6. Plinthes : jamais surface × hauteur sous plafond.",
    "7. Plinthes : √(surface) × 4 × 0,8 par pièce, ou ~0,9 × surface totale.",
    "8. Peinture plafond : surface plafond = surface au sol.",
    "9. Peinture murs : périmètre × hauteur, moins ouvertures si connues.",
    "10. Plomberie complexe : forfait, pas de quantités décimales.",
    "11. Électricité : unités entières.",
    "12. Gravats : 1 m³ par défaut si volume inconnu (petit chantier).",
    "13. SDB complète : vérifier douche, meuble, WC, faïence, sol, élec, ventilation, peinture, nettoyage.",
    "14. Cuisine complète : vérifier dépose, plomberie, élec, crédence, sol, peinture, nettoyage.",
    "",
    "INTERDICTIONS :",
    "❌ Quantités 0,96 forfait / 1,13 unité",
    "❌ Prix inventés hors bibliothèque",
    "❌ VMC automatique",
    "❌ Plinthes : surface × hsp (ex. 42 × 2,5 = 105 ml)",
    "❌ Peinture plafond avec surface murs",
  ].join("\n");
}

export const SUGGESTION_ONLY_CATALOGUE_IDS = new Set(
  BATIMUM_PRICE_LIBRARY.filter((item) => item.suggestionOnly).flatMap((item) =>
    [item.id, item.catalogueId].filter(Boolean),
  ) as string[],
);

export type CatalogueLikeEntry = {
  id: string;
  categorie: string;
  designation: string;
  motsCles: string[];
  unite: string;
  prixMinHT: number;
  prixMoyenHT: number;
  prixMaxHT: number;
  tvaHabituelle: number;
  type: "fourniture" | "pose" | "fourniture_et_pose";
  fiabilite: number;
  notes?: string;
};

const CATEGORY_TO_CATALOGUE: Record<BatimumCategory, string> = {
  Dépose: "Dépose",
  Plomberie: "Plomberie",
  Électricité: "Électricité",
  Placo: "Placo",
  Isolation: "Isolation",
  Carrelage: "Carrelage / Faïence",
  Peinture: "Peinture",
  Sols: "Sols",
  Menuiserie: "Menuiseries",
  Maçonnerie: "Maçonnerie",
  Extérieur: "Extérieur",
  Nettoyage: "Évacuation / Nettoyage",
};

export function libraryEntryToCatalogue(
  lib: BatimumPriceLibraryEntry,
): CatalogueLikeEntry {
  const id = lib.catalogueId ?? lib.id;
  return {
    id,
    categorie: CATEGORY_TO_CATALOGUE[lib.category],
    designation: lib.label,
    motsCles: lib.keywords,
    unite: lib.unit,
    prixMinHT: lib.minPrice,
    prixMoyenHT: lib.defaultPrice,
    prixMaxHT: lib.maxPrice,
    tvaHabituelle: lib.tvaHabituelle ?? 10,
    type: "fourniture_et_pose",
    fiabilite: lib.confidence,
    notes: `Batimum ${BATIMUM_PRICE_LIBRARY_VERSION} — ${lib.notes}`,
  };
}

export function mergePriceLibraryIntoCatalogue<T extends CatalogueLikeEntry>(
  catalogue: T[],
): T[] {
  const result = catalogue.map((item) => ({ ...item }));
  const indexById = new Map(result.map((item, index) => [item.id, index]));

  for (const lib of BATIMUM_PRICE_LIBRARY) {
    const mapped = libraryEntryToCatalogue(lib);
    const targetId = lib.catalogueId ?? lib.id;
    const idx = indexById.get(targetId);

    if (idx !== undefined) {
      const existing = result[idx];
      result[idx] = {
        ...existing,
        ...mapped,
        id: existing.id,
        motsCles: [...new Set([...existing.motsCles, ...mapped.motsCles])],
      };
    } else {
      indexById.set(mapped.id, result.length);
      result.push({ ...mapped, id: targetId } as T);
    }
  }

  return result;
}

export function resolveLibraryPrice(designation: string): {
  prixHT: number;
  fiabilite: number;
  unite: string;
  forceForfait: boolean;
  minForfaitHT?: number;
  suggestionOnly: boolean;
} | null {
  const lib = findPriceLibraryEntry(designation);
  if (!lib) return null;

  return {
    prixHT: lib.defaultPrice,
    fiabilite: lib.confidence,
    unite: lib.unit,
    forceForfait: lib.forceForfait === true || lib.unit === "forfait",
    minForfaitHT: lib.minForfaitHT,
    suggestionOnly: lib.suggestionOnly === true,
  };
}

export function getPriceLibraryEntryById(
  id: string,
): BatimumPriceLibraryEntry | undefined {
  return (
    LIBRARY_BY_ID.get(id) ??
    BATIMUM_PRICE_LIBRARY.find((item) => item.catalogueId === id)
  );
}

/** Coefficient d'ouvertures sur le périmètre estimé. */
export const PLINTHES_PERIMETER_COEFFICIENT = 0.8;

/** Facteur surface pour pièces ouvertes (ex. 42 m² → ~38 ml). */
export const PLINTHES_SURFACE_FACTOR = 0.9;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Estimation ml plinthes par pièce.
 * max(√(surface) × 4 × 0,8 ; surface × 0,9)
 */
export function estimatePlinthesMlFromSurfaceM2(surfaceM2: number): number {
  if (surfaceM2 <= 0) return 0;
  const perimeterEstimate =
    Math.sqrt(surfaceM2) * 4 * PLINTHES_PERIMETER_COEFFICIENT;
  const floorFactorEstimate = surfaceM2 * PLINTHES_SURFACE_FACTOR;
  return round2(Math.max(perimeterEstimate, floorFactorEstimate));
}

export function extractRoomSurfacesM2(corpus: string): number[] {
  const surfaces: number[] = [];
  const text = corpus.toLowerCase();

  const roomPatterns = [
    /s[eé]jour[^.\d]{0,40}(\d+[,.]?\d*)\s*m[²2]/gi,
    /cuisine[^.\d]{0,40}(\d+[,.]?\d*)\s*m[²2]/gi,
    /chambre[^.\d]{0,40}(\d+[,.]?\d*)\s*m[²2]/gi,
    /salle de bain[^.\d]{0,40}(\d+[,.]?\d*)\s*m[²2]/gi,
    /sdb[^.\d]{0,20}(\d+[,.]?\d*)\s*m[²2]/gi,
  ];

  for (const pattern of roomPatterns) {
    for (const match of text.matchAll(pattern)) {
      const value = Number(match[1]?.replace(",", "."));
      if (value > 0 && value < 500) surfaces.push(value);
    }
  }

  if (surfaces.length > 0) {
    return [...new Set(surfaces)];
  }

  const totalPatterns = [
    /soit\s+(\d+[,.]?\d*)\s*m[²2]/i,
    /(\d+[,.]?\d*)\s*m[²2]\s+au total/i,
    /surface[^.\d]{0,20}(\d+[,.]?\d*)\s*m[²2]/i,
    /fait\s+(\d+[,.]?\d*)\s*m[²2]/i,
  ];

  for (const pattern of totalPatterns) {
    const match = corpus.match(pattern);
    if (match?.[1]) {
      const value = Number(match[1].replace(",", "."));
      if (value > 0 && value < 2000) return [value];
    }
  }

  return [];
}

export function estimatePlinthesMlFromCorpus(corpus: string): number | null {
  const surfaces = extractRoomSurfacesM2(corpus);
  if (surfaces.length > 0) {
    return round2(
      surfaces.reduce((sum, surface) => sum + estimatePlinthesMlFromSurfaceM2(surface), 0),
    );
  }
  return null;
}

export function isForbiddenPlinthesQuantity(
  quantiteMl: number,
  surfaceM2: number,
  hauteurSousPlafondM: number,
): boolean {
  if (surfaceM2 <= 0 || quantiteMl <= 0) return false;
  const forbidden = round2(surfaceM2 * hauteurSousPlafondM);
  return Math.abs(quantiteMl - forbidden) < 1.5;
}

export function formatPlinthesEstimationRulesForPrompt(): string {
  return [
    "ESTIMATION PLINTHES (ml) :",
    "- Interdit : surface × hauteur sous plafond (ex. 42 m² × 2,5 = 105 ml).",
    "- Par pièce : max(√(surface) × 4 × 0,8 ; surface × 0,9).",
    "- Exemple 42 m² (pièce ouverte) → ~38 ml.",
    "- Exemple séjour 28 m² + cuisine 14 m² → ~25 ml + ~13 ml ≈ 38 ml.",
    "- Prix référence plinthes carrelage : 18 €/ml HT.",
    "- Les plinthes restent en ml : ne jamais convertir en m².",
  ].join("\n");
}
