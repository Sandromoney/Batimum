import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";
import {
  estimatePlinthesMlFromCorpus,
  isForbiddenPlinthesQuantity,
} from "@/lib/batimum-price-library";
import { extractHauteurSousPlafond } from "@/lib/ai-devis-unites";
import { getLigneDesignation, isSectionLigne } from "@/lib/devis-lignes";
import type { BibliothequeRatioEntry, Devis, RatioType, TypeChantier } from "@/lib/types";
import { generateId } from "@/lib/utils";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export const DEFAULT_BIBLIOTHEQUE_RATIOS: BibliothequeRatioEntry[] = [
  {
    id: "std-sdb-faiencage",
    ratioType: "sdb_surface_faiencage",
    label: "Surface faïence / surface SDB",
    valeurMoyenne: 3.2,
    valeurMin: 2.5,
    valeurMax: 4.5,
    uniteSource: "m²",
    uniteCible: "m²",
    nombreObservations: 0,
    fiabilite: 55,
    source: "standard",
  },
  {
    id: "std-sdb-spots",
    ratioType: "sdb_surface_spots",
    label: "Nombre de spots / surface SDB",
    valeurMoyenne: 0.6,
    valeurMin: 0.3,
    valeurMax: 1.2,
    uniteSource: "m²",
    uniteCible: "u",
    nombreObservations: 0,
    fiabilite: 50,
    source: "standard",
  },
  {
    id: "std-sdb-plomberie",
    ratioType: "sdb_plomberie_ml",
    label: "Longueur plomberie / surface SDB",
    valeurMoyenne: 1.8,
    valeurMin: 1.2,
    valeurMax: 3,
    uniteSource: "m²",
    uniteCible: "ml",
    nombreObservations: 0,
    fiabilite: 50,
    source: "standard",
  },
  {
    id: "std-cuisine-credence",
    ratioType: "cuisine_credence_ml",
    label: "Longueur crédence / longueur cuisine",
    valeurMoyenne: 0.85,
    valeurMin: 0.6,
    valeurMax: 1,
    uniteSource: "ml",
    uniteCible: "ml",
    nombreObservations: 0,
    fiabilite: 55,
    source: "standard",
  },
  {
    id: "std-logement-peinture",
    ratioType: "logement_peinture_m2",
    label: "Surface peinture / surface logement",
    valeurMoyenne: 3.5,
    valeurMin: 2.8,
    valeurMax: 4.5,
    uniteSource: "m²",
    uniteCible: "m²",
    nombreObservations: 0,
    fiabilite: 55,
    source: "standard",
  },
  {
    id: "std-logement-prises",
    ratioType: "logement_prises",
    label: "Nombre de prises / surface logement",
    valeurMoyenne: 0.12,
    valeurMin: 0.08,
    valeurMax: 0.2,
    uniteSource: "m²",
    uniteCible: "u",
    nombreObservations: 0,
    fiabilite: 50,
    source: "standard",
  },
  {
    id: "std-logement-interrupteurs",
    ratioType: "logement_interrupteurs",
    label: "Nombre d'interrupteurs / surface logement",
    valeurMoyenne: 0.06,
    valeurMin: 0.04,
    valeurMax: 0.12,
    uniteSource: "m²",
    uniteCible: "u",
    nombreObservations: 0,
    fiabilite: 50,
    source: "standard",
  },
  {
    id: "std-maison-besoins",
    ratioType: "maison_besoins",
    label: "Coefficient besoins maison / surface",
    valeurMoyenne: 1.15,
    valeurMin: 1,
    valeurMax: 1.35,
    uniteSource: "m²",
    uniteCible: "coef",
    nombreObservations: 0,
    fiabilite: 45,
    source: "standard",
  },
];

export type ChantierMetrics = {
  surfaceSdbM2?: number;
  surfaceLogementM2?: number;
  longueurCuisineMl?: number;
  hauteurSousPlafondM?: number;
};

function parseSurfaceM2(text: string, context: string): number | null {
  const patterns = [
    new RegExp(`${context}[^\\d]{0,40}(\\d+[,.]?\\d*)\\s*m[²2]`, "i"),
    new RegExp(`(\\d+[,.]?\\d*)\\s*m[²2][^\\n]{0,30}${context}`, "i"),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = Number(match[1].replace(",", "."));
      if (value > 0 && value < 500) return value;
    }
  }
  return null;
}

export function extractChantierMetrics(
  corpus: string,
  typeChantier?: TypeChantier,
): ChantierMetrics {
  const text = corpus.toLowerCase();
  const metrics: ChantierMetrics = {};

  metrics.surfaceSdbM2 =
    parseSurfaceM2(text, "salle de bain") ??
    parseSurfaceM2(text, "sdb") ??
    undefined;

  metrics.surfaceLogementM2 =
    parseSurfaceM2(text, "appartement") ??
    parseSurfaceM2(text, "logement") ??
    parseSurfaceM2(text, "maison") ??
    parseSurfaceM2(text, "surface habitable") ??
    parseSurfaceM2(text, "surface") ??
    undefined;

  const cuisineMl =
    text.match(/cuisine[^.\n]{0,30}(\d+[,.]?\d*)\s*ml/i)?.[1] ??
    text.match(/(\d+[,.]?\d*)\s*ml[^.\n]{0,30}cuisine/i)?.[1];
  if (cuisineMl) {
    metrics.longueurCuisineMl = Number(cuisineMl.replace(",", "."));
  }

  const hspMatch =
    text.match(/hsp\s*[:=]?\s*(\d+[,.]?\d*)/i) ??
    text.match(/hauteur[^.\n]{0,20}(\d+[,.]?\d*)\s*m/i);
  if (hspMatch?.[1]) {
    metrics.hauteurSousPlafondM = Number(hspMatch[1].replace(",", "."));
  }

  if (typeChantier === "maison_neuve" && !metrics.surfaceLogementM2) {
    metrics.surfaceLogementM2 = parseSurfaceM2(text, "maison") ?? undefined;
  }

  return metrics;
}

export function normalizeBibliothequeRatios(
  partial?: BibliothequeRatioEntry[] | null,
): BibliothequeRatioEntry[] {
  const incoming = Array.isArray(partial) ? partial : [];
  const byType = new Map<RatioType, BibliothequeRatioEntry>();

  for (const std of DEFAULT_BIBLIOTHEQUE_RATIOS) {
    byType.set(std.ratioType, { ...std });
  }

  for (const entry of incoming) {
    if (!entry?.ratioType) continue;
    const existing = byType.get(entry.ratioType);
    byType.set(entry.ratioType, {
      id: entry.id || existing?.id || generateId(),
      ratioType: entry.ratioType,
      label: entry.label || existing?.label || entry.ratioType,
      valeurMoyenne: round3(Number(entry.valeurMoyenne) || existing?.valeurMoyenne || 0),
      valeurMin: round3(Number(entry.valeurMin) || existing?.valeurMin || 0),
      valeurMax: round3(Number(entry.valeurMax) || existing?.valeurMax || 0),
      uniteSource: entry.uniteSource || existing?.uniteSource || "m²",
      uniteCible: entry.uniteCible || existing?.uniteCible || "u",
      nombreObservations: Math.max(
        0,
        Number(entry.nombreObservations) || existing?.nombreObservations || 0,
      ),
      fiabilite: Math.min(
        98,
        Math.max(0, Number(entry.fiabilite) || existing?.fiabilite || 50),
      ),
      source: entry.source === "appris" ? "appris" : existing?.source ?? "standard",
      valeursObservees: Array.isArray(entry.valeursObservees)
        ? entry.valeursObservees.map((v) => round3(Number(v) || 0))
        : existing?.valeursObservees,
    });
  }

  return [...byType.values()];
}

export function getRatioByType(
  ratios: BibliothequeRatioEntry[],
  ratioType: RatioType,
): BibliothequeRatioEntry | undefined {
  return ratios.find((entry) => entry.ratioType === ratioType);
}

function ligneMatchesRatio(
  designation: string,
  description: string,
  ratioType: RatioType,
): boolean {
  const text = normalizeBibliothequeKey(`${designation} ${description}`);
  switch (ratioType) {
    case "sdb_surface_faiencage":
      return text.includes("faienc") || text.includes("carrelage mural");
    case "sdb_surface_spots":
      return text.includes("spot") || text.includes("eclairage") || text.includes("éclairage");
    case "sdb_plomberie_ml":
      return text.includes("plomberie") || text.includes("alimentation") || text.includes("evacuation");
    case "cuisine_credence_ml":
      return text.includes("credence") || text.includes("crédence");
    case "logement_peinture_m2":
      return text.includes("peinture") || text.includes("enduit");
    case "logement_prises":
      return text.includes("prise") && !text.includes("interrupteur");
    case "logement_interrupteurs":
      return text.includes("interrupteur");
    default:
      return false;
  }
}

function computeRatioFiabilite(observations: number, count: number): number {
  if (count <= 0) return 50;
  const base = Math.min(95, 55 + count * 4);
  return Math.round(base);
}

function mergeRatioObservation(
  existing: BibliothequeRatioEntry,
  value: number,
): BibliothequeRatioEntry {
  const valeurs = [...(existing.valeursObservees ?? [existing.valeurMoyenne]), value];
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const moy = valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
  const count = existing.nombreObservations + 1;

  return {
    ...existing,
    valeurMoyenne: round3(moy),
    valeurMin: round3(min),
    valeurMax: round3(max),
    nombreObservations: count,
    fiabilite: computeRatioFiabilite(moy, count),
    source: "appris",
    valeursObservees: valeurs.map(round3),
  };
}

/**
 * Apprentissage des ratios depuis un devis signé ou envoyé.
 */
export function learnRatiosFromDevis(
  ratios: BibliothequeRatioEntry[],
  devis: Devis,
): BibliothequeRatioEntry[] {
  const corpus = [devis.descriptionChantier, devis.titre, devis.notesInternes]
    .filter(Boolean)
    .join("\n");
  const metrics = extractChantierMetrics(corpus, devis.typeChantier);
  const working = normalizeBibliothequeRatios(ratios);

  const observe = (ratioType: RatioType, value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    const index = working.findIndex((r) => r.ratioType === ratioType);
    if (index < 0) return;
    working[index] = mergeRatioObservation(working[index], value);
  };

  if (metrics.surfaceSdbM2) {
    let faiencage = 0;
    let spots = 0;
    let plomberieMl = 0;

    for (const ligne of devis.lignes) {
      if (isSectionLigne(ligne)) continue;
      const designation = getLigneDesignation(ligne);
      const desc = ligne.descriptionCourte ?? "";
      const q = Number(ligne.quantite) || 0;

      if (ligneMatchesRatio(designation, desc, "sdb_surface_faiencage")) {
        faiencage += q;
      }
      if (ligneMatchesRatio(designation, desc, "sdb_surface_spots")) {
        spots += q;
      }
      if (ligneMatchesRatio(designation, desc, "sdb_plomberie_ml")) {
        plomberieMl += q;
      }
    }

    if (faiencage > 0) observe("sdb_surface_faiencage", faiencage / metrics.surfaceSdbM2);
    if (spots > 0) observe("sdb_surface_spots", spots / metrics.surfaceSdbM2);
    if (plomberieMl > 0) observe("sdb_plomberie_ml", plomberieMl / metrics.surfaceSdbM2);
  }

  if (metrics.surfaceLogementM2) {
    let peinture = 0;
    let prises = 0;
    let interrupteurs = 0;

    for (const ligne of devis.lignes) {
      if (isSectionLigne(ligne)) continue;
      const designation = getLigneDesignation(ligne);
      const desc = ligne.descriptionCourte ?? "";
      const q = Number(ligne.quantite) || 0;

      if (ligneMatchesRatio(designation, desc, "logement_peinture_m2")) peinture += q;
      if (ligneMatchesRatio(designation, desc, "logement_prises")) prises += q;
      if (ligneMatchesRatio(designation, desc, "logement_interrupteurs")) interrupteurs += q;
    }

    if (peinture > 0) observe("logement_peinture_m2", peinture / metrics.surfaceLogementM2);
    if (prises > 0) observe("logement_prises", prises / metrics.surfaceLogementM2);
    if (interrupteurs > 0) {
      observe("logement_interrupteurs", interrupteurs / metrics.surfaceLogementM2);
    }
  }

  if (metrics.longueurCuisineMl) {
    let credenceMl = 0;
    for (const ligne of devis.lignes) {
      if (isSectionLigne(ligne)) continue;
      const designation = getLigneDesignation(ligne);
      const desc = ligne.descriptionCourte ?? "";
      if (ligneMatchesRatio(designation, desc, "cuisine_credence_ml")) {
        credenceMl += Number(ligne.quantite) || 0;
      }
    }
    if (credenceMl > 0) {
      observe("cuisine_credence_ml", credenceMl / metrics.longueurCuisineMl);
    }
  }

  return working;
}

export type RatioQuantityEstimate = {
  quantite: number;
  ratioApplique: string;
  quantiteEstimee: boolean;
};

export function estimateQuantityFromRatios(params: {
  designation: string;
  description: string;
  quantite: number;
  unite: string;
  metrics: ChantierMetrics;
  ratios: BibliothequeRatioEntry[];
  corpus?: string;
}): RatioQuantityEstimate | null {
  const { designation, description, quantite, metrics, ratios, corpus } = params;
  const uniteNorm = params.unite.toLowerCase().trim();
  const text = normalizeBibliothequeKey(`${designation} ${description}`);
  const isPlinthes =
    text.includes("plinthe") && (uniteNorm === "ml" || uniteNorm === "m");

  if (isPlinthes && corpus) {
    const estimated = estimatePlinthesMlFromCorpus(corpus);
    const surfaceRef =
      metrics.surfaceLogementM2 ?? metrics.surfaceSdbM2 ?? 0;
    const hsp = extractHauteurSousPlafond(corpus);
    const looksForbidden =
      isForbiddenPlinthesQuantity(quantite, surfaceRef, hsp) ||
      quantite <= 1;

    if (estimated && estimated > 0 && looksForbidden) {
      return {
        quantite: estimated,
        ratioApplique: `Plinthes estimées : √(surface) × 4 × 0,8 → ${estimated} ml (interdit : surface × hsp)`,
        quantiteEstimee: true,
      };
    }
  }

  if (quantite > 1 && !isPlinthes) return null;

  const tryEstimate = (
    ratioType: RatioType,
    baseValue: number | undefined,
    label: string,
    uniteCible: string,
  ): RatioQuantityEstimate | null => {
    if (!baseValue || baseValue <= 0) return null;
    const ratio = getRatioByType(ratios, ratioType);
    if (!ratio) return null;
    const estimated = round2(baseValue * ratio.valeurMoyenne);
    if (estimated <= 0) return null;
    return {
      quantite: estimated,
      ratioApplique: `${label} (${ratio.valeurMoyenne} × ${baseValue} ${ratio.uniteSource} → ${estimated} ${uniteCible}, fiabilité ${ratio.fiabilite}%)`,
      quantiteEstimee: true,
    };
  };

  if (ligneMatchesRatio(designation, description, "sdb_surface_faiencage")) {
    return tryEstimate(
      "sdb_surface_faiencage",
      metrics.surfaceSdbM2,
      "Ratio faïence SDB",
      "m²",
    );
  }
  if (ligneMatchesRatio(designation, description, "sdb_surface_spots")) {
    return tryEstimate("sdb_surface_spots", metrics.surfaceSdbM2, "Ratio spots SDB", "u");
  }
  if (ligneMatchesRatio(designation, description, "logement_peinture_m2")) {
    return tryEstimate(
      "logement_peinture_m2",
      metrics.surfaceLogementM2,
      "Ratio peinture logement",
      "m²",
    );
  }
  if (ligneMatchesRatio(designation, description, "logement_prises")) {
    return tryEstimate(
      "logement_prises",
      metrics.surfaceLogementM2,
      "Ratio prises logement",
      "u",
    );
  }
  if (ligneMatchesRatio(designation, description, "cuisine_credence_ml")) {
    return tryEstimate(
      "cuisine_credence_ml",
      metrics.longueurCuisineMl,
      "Ratio crédence cuisine",
      "ml",
    );
  }

  return null;
}

export function formatRatiosForPrompt(ratios: BibliothequeRatioEntry[]): string {
  const active = normalizeBibliothequeRatios(ratios);
  const lines = [
    "BIBLIOTHÈQUE DES RATIOS MÉTIER (quantités habituelles) :",
    "Utiliser ces ratios pour estimer les quantités quand le client ne les précise pas.",
  ];

  for (const ratio of active) {
    lines.push(
      `- ${ratio.label} : ${ratio.valeurMoyenne} (${ratio.valeurMin}–${ratio.valeurMax}) ${ratio.uniteCible}/${ratio.uniteSource} — source ${ratio.source}, fiabilité ${ratio.fiabilite}%`,
    );
  }

  return lines.join("\n");
}
