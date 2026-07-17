import { getLigneDesignation, isSectionLigne } from "@/lib/devis-lignes";
import {
  DEFAULT_BIBLIOTHEQUE_RATIOS,
  learnRatiosFromDevis,
  normalizeBibliothequeRatios,
} from "@/lib/bibliotheque-ratios";
import {
  FIABILITE_MANUEL_VERROUILLE,
  getFiabiliteAppris,
  getFiabiliteEntrepriseEntry,
} from "@/lib/prix-fiabilite";
import type {
  BibliothequeEntreprise,
  BibliothequeEntrepriseEntry,
  BibliothequeSource,
  Devis,
  LigneDevis,
  StatutDevis,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

export const DEFAULT_BIBLIOTHEQUE_ENTREPRISE: BibliothequeEntreprise = {
  entries: [],
  apprentissageAutomatique: true,
  apprendreDepuisEnvoye: true,
  apprendreDepuisSigne: true,
  learnedDevis: {},
  ratios: normalizeBibliothequeRatios(DEFAULT_BIBLIOTHEQUE_RATIOS),
};

const LEARN_STATUTS = new Set<StatutDevis>(["envoye", "signe"]);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeBibliothequeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function inferCategorieFromSection(sectionTitle: string): string {
  const upper = sectionTitle.toUpperCase();
  if (upper.includes("DÉPOSE") || upper.includes("DEPOSE") || upper.includes("PRÉPARATION")) {
    return "Dépose / préparation";
  }
  if (upper.includes("PROTECTION")) return "Protection chantier";
  if (upper.includes("PLACO")) return "Placo";
  if (upper.includes("ISOLATION")) return "Isolation";
  if (upper.includes("ÉLECTRIC") || upper.includes("ELECTRIC")) return "Électricité";
  if (upper.includes("PLOMBERIE")) return "Plomberie";
  if (upper.includes("CARRELAGE") || upper.includes("FAÏENCE") || upper.includes("FAIENCE")) {
    return "Carrelage / faïence";
  }
  if (upper.includes("SOL")) return "Sols";
  if (upper.includes("PEINTURE") || upper.includes("FINITION")) return "Peinture / finitions";
  if (upper.includes("MENUISERIE")) return "Menuiseries";
  if (upper.includes("SANITAIRE")) return "Sanitaires";
  if (upper.includes("NETTOYAGE") || upper.includes("ÉVACUATION") || upper.includes("EVACUATION")) {
    return "Nettoyage / évacuation";
  }
  if (upper.includes("DÉPLACEMENT") || upper.includes("DEPLACEMENT") || upper.includes("INSTALLATION")) {
    return "Déplacement / installation";
  }
  return "Autre";
}

function extractLocalisationFromDevis(devis: Devis): {
  regionLabel?: string;
  departementCode?: string;
} {
  const text = [devis.descriptionChantier, devis.notesInternes].filter(Boolean).join("\n");
  const match = text.match(/Localisation\s*:\s*([^,\n]+),\s*([^\n]+)/i);
  if (!match) return {};

  const departementPart = match[1]?.trim() ?? "";
  const regionLabel = match[2]?.trim();
  const deptCode = departementPart.match(/\b(\d{2}|2A|2B)\b/i)?.[1]?.toUpperCase();

  return {
    regionLabel: regionLabel || undefined,
    departementCode: deptCode,
  };
}

function isDevisExcludedFromLearning(devis: Devis): boolean {
  if (devis.statut === "brouillon" || devis.statut === "refuse" || devis.statut === "archive") {
    return true;
  }

  const historique = devis.historique ?? [];
  const hasIaGenere = historique.some((entry) => entry.type === "ia_genere");
  const hasIaTransforme = historique.some(
    (entry) => entry.type === "ia_transforme_brouillon",
  );

  if (hasIaGenere && !hasIaTransforme) return true;

  const titre = (devis.titre ?? "").toLowerCase();
  if (titre.includes("test mum") || titre.includes("test ia")) return true;

  return false;
}

function isDevisEligibleForLearning(devis: Devis): boolean {
  if (isDevisExcludedFromLearning(devis)) return false;
  if (!LEARN_STATUTS.has(devis.statut)) return false;
  return true;
}

function shouldLearnTransition(
  before: Devis | undefined,
  after: Devis,
): after is Devis & { statut: "envoye" | "signe" } {
  if (!isDevisEligibleForLearning(after)) return false;
  if (before?.statut === after.statut) return false;
  if (before?.statut === "refuse" || after.statut === "refuse") return false;
  return after.statut === "envoye" || after.statut === "signe";
}

function computeStatsFromPrices(prices: number[]): {
  prixMinHT: number;
  prixMoyenHT: number;
  prixMaxHT: number;
} {
  if (prices.length === 0) {
    return { prixMinHT: 0, prixMoyenHT: 0, prixMaxHT: 0 };
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  return {
    prixMinHT: round2(min),
    prixMoyenHT: round2(avg),
    prixMaxHT: round2(max),
  };
}

function mergeEntryFromObservation(
  existing: BibliothequeEntrepriseEntry | undefined,
  observation: {
    categorie: string;
    designation: string;
    unite: string;
    prixUnitaireHT: number;
    tauxTVA?: number;
    date: string;
    regionLabel?: string;
    departementCode?: string;
    source: BibliothequeSource;
  },
): BibliothequeEntrepriseEntry {
  const normaliseKey = normalizeBibliothequeKey(observation.designation);
  const observed = round2(observation.prixUnitaireHT);

  if (!existing) {
    const nombreUtilisations = 1;
    return {
      id: generateId(),
      categorie: observation.categorie,
      designation: observation.designation,
      unite: observation.unite || "u",
      ...computeStatsFromPrices([observed]),
      tauxTVA: observation.tauxTVA,
      nombreUtilisations,
      derniereUtilisation: observation.date,
      source: observation.source,
      verrouille: observation.source === "manuel",
      fiabilite: getFiabiliteAppris(nombreUtilisations),
      regionLabel: observation.regionLabel,
      departementCode: observation.departementCode,
      normaliseKey,
      prixObserves: [observed],
    };
  }

  if (existing.verrouille && existing.source === "manuel") {
    return {
      ...existing,
      nombreUtilisations: existing.nombreUtilisations + 1,
      derniereUtilisation: observation.date,
      fiabilite: FIABILITE_MANUEL_VERROUILLE,
      categorie: existing.categorie || observation.categorie,
      unite: existing.unite || observation.unite,
      tauxTVA: existing.tauxTVA ?? observation.tauxTVA,
    };
  }

  const prixObserves = [...(existing.prixObserves ?? [existing.prixMoyenHT]), observed];
  const stats = computeStatsFromPrices(prixObserves);
  const nombreUtilisations = existing.nombreUtilisations + 1;

  return {
    ...existing,
    categorie: observation.categorie || existing.categorie,
    designation: existing.source === "manuel" ? existing.designation : observation.designation,
    unite: observation.unite || existing.unite,
    ...stats,
    tauxTVA: observation.tauxTVA ?? existing.tauxTVA,
    nombreUtilisations,
    derniereUtilisation: observation.date,
    source: existing.source === "manuel" ? "manuel" : "appris",
    fiabilite: getFiabiliteEntrepriseEntry({
      source: existing.source === "manuel" ? "manuel" : "appris",
      verrouille: existing.verrouille,
      nombreUtilisations,
    }),
    regionLabel: observation.regionLabel ?? existing.regionLabel,
    departementCode: observation.departementCode ?? existing.departementCode,
    normaliseKey,
    prixObserves,
  };
}

export function learnFromDevisLignes(
  bibliotheque: BibliothequeEntreprise,
  devis: Devis,
  trigger: "envoye" | "signe",
): BibliothequeEntreprise {
  if (!bibliotheque.apprentissageAutomatique) return bibliotheque;
  if (trigger === "envoye" && bibliotheque.apprendreDepuisEnvoye === false) {
    return bibliotheque;
  }
  if (trigger === "signe" && bibliotheque.apprendreDepuisSigne === false) {
    return bibliotheque;
  }
  if (isDevisExcludedFromLearning(devis)) return bibliotheque;

  const previousTrigger = bibliotheque.learnedDevis[devis.id];
  if (previousTrigger === "signe") return bibliotheque;
  if (previousTrigger === "envoye" && trigger === "envoye") return bibliotheque;

  const localisation = extractLocalisationFromDevis(devis);
  const date = devis.sentAt ?? devis.signedAt ?? devis.dateDevis ?? devis.date;
  let currentSection = "Autre";
  const inactive = bibliotheque.entries.filter((entry) => entry.desactive);
  let working = [...bibliotheque.entries.filter((entry) => !entry.desactive)];

  for (const ligne of devis.lignes) {
    if (isSectionLigne(ligne)) {
      currentSection = inferCategorieFromSection(getLigneDesignation(ligne));
      continue;
    }

    const designation = getLigneDesignation(ligne).trim();
    const prix = Number(ligne.prixUnitaire);
    const quantite = Number(ligne.quantite);

    if (!designation || prix <= 0 || quantite <= 0) continue;

    const normaliseKey = normalizeBibliothequeKey(designation);
    const index = working.findIndex(
      (entry) => entry.normaliseKey === normaliseKey,
    );

    const merged = mergeEntryFromObservation(index >= 0 ? working[index] : undefined, {
      categorie: currentSection,
      designation,
      unite: ligne.unite?.trim() || "u",
      prixUnitaireHT: prix,
      tauxTVA: ligne.tauxTVA,
      date,
      regionLabel: localisation.regionLabel,
      departementCode: localisation.departementCode,
      source: "appris",
    });

    if (index >= 0) {
      working[index] = merged;
    } else {
      working.push(merged);
    }
  }

  return {
    ...bibliotheque,
    entries: [...inactive, ...working],
    ratios:
      trigger === "signe"
        ? learnRatiosFromDevis(bibliotheque.ratios ?? [], devis)
        : bibliotheque.ratios,
    learnedDevis: {
      ...bibliotheque.learnedDevis,
      [devis.id]: trigger,
    },
  };
}

export function syncBibliothequeFromDevisList(
  bibliotheque: BibliothequeEntreprise,
  beforeList: Devis[],
  afterList: Devis[],
): BibliothequeEntreprise {
  if (!bibliotheque.apprentissageAutomatique) return bibliotheque;

  const beforeMap = new Map(beforeList.map((devis) => [devis.id, devis]));
  let next = bibliotheque;

  for (const after of afterList) {
    const before = beforeMap.get(after.id);
    if (!shouldLearnTransition(before, after)) continue;
    next = learnFromDevisLignes(next, after, after.statut);
  }

  return next;
}

export function normalizeBibliothequeEntreprise(
  partial?: Partial<BibliothequeEntreprise> | null,
): BibliothequeEntreprise {
  const p = partial ?? {};
  const entries: BibliothequeEntrepriseEntry[] = Array.isArray(p.entries)
    ? p.entries
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          id: entry.id || generateId(),
          categorie: String(entry.categorie ?? "Autre"),
          designation: String(entry.designation ?? ""),
          unite: String(entry.unite ?? "u"),
          prixMoyenHT: round2(Number(entry.prixMoyenHT) || 0),
          prixMinHT: round2(Number(entry.prixMinHT) || 0),
          prixMaxHT: round2(Number(entry.prixMaxHT) || 0),
          tauxTVA: entry.tauxTVA != null ? Number(entry.tauxTVA) : undefined,
          nombreUtilisations: Math.max(0, Number(entry.nombreUtilisations) || 0),
          derniereUtilisation: String(entry.derniereUtilisation ?? ""),
          source: (entry.source === "manuel" ? "manuel" : "appris") as BibliothequeSource,
          verrouille: Boolean(entry.verrouille),
          desactive: Boolean(entry.desactive),
          regionLabel: entry.regionLabel?.trim() || undefined,
          departementCode: entry.departementCode?.trim() || undefined,
          normaliseKey:
            entry.normaliseKey?.trim() ||
            normalizeBibliothequeKey(String(entry.designation ?? "")),
          fiabilite:
            entry.fiabilite != null
              ? Number(entry.fiabilite)
              : getFiabiliteEntrepriseEntry({
                  source: entry.source === "manuel" ? "manuel" : "appris",
                  verrouille: Boolean(entry.verrouille),
                  nombreUtilisations: Math.max(0, Number(entry.nombreUtilisations) || 0),
                }),
          prixObserves: Array.isArray(entry.prixObserves)
            ? entry.prixObserves.map((price) => round2(Number(price) || 0))
            : undefined,
        }))
        .filter((entry) => entry.designation.trim().length > 0)
    : [];

  return {
    entries,
    apprentissageAutomatique: p.apprentissageAutomatique !== false,
    apprendreDepuisEnvoye: p.apprendreDepuisEnvoye !== false,
    apprendreDepuisSigne: p.apprendreDepuisSigne !== false,
    departementPrincipal: p.departementPrincipal?.trim() || undefined,
    regionPrincipale: p.regionPrincipale?.trim() || undefined,
    coefficientRegionalManuel:
      p.coefficientRegionalManuel != null && Number(p.coefficientRegionalManuel) > 0
        ? round2(Number(p.coefficientRegionalManuel))
        : p.coefficientRegionalManuel === null
          ? null
          : undefined,
    learnedDevis:
      p.learnedDevis && typeof p.learnedDevis === "object" ? p.learnedDevis : {},
    ratios: normalizeBibliothequeRatios(p.ratios),
  };
}

export function getActiveBibliothequeEntries(
  bibliotheque: BibliothequeEntreprise,
): BibliothequeEntrepriseEntry[] {
  return bibliotheque.entries
    .filter((entry) => !entry.desactive)
    .sort((a, b) => b.derniereUtilisation.localeCompare(a.derniereUtilisation));
}

export function upsertManualBibliothequeEntry(
  bibliotheque: BibliothequeEntreprise,
  patch: Partial<BibliothequeEntrepriseEntry> & { id?: string },
): BibliothequeEntreprise {
  const designation = String(patch.designation ?? "").trim();
  if (!designation) return bibliotheque;

  const normaliseKey = normalizeBibliothequeKey(designation);
  const prix = round2(Number(patch.prixMoyenHT) || 0);
  const entries = [...bibliotheque.entries];
  const index = patch.id
    ? entries.findIndex((entry) => entry.id === patch.id)
    : entries.findIndex((entry) => entry.normaliseKey === normaliseKey && !entry.desactive);

  const base: BibliothequeEntrepriseEntry = {
    id: patch.id ?? generateId(),
    categorie: String(patch.categorie ?? "Autre"),
    designation,
    unite: String(patch.unite ?? "u"),
    prixMoyenHT: prix,
    prixMinHT: round2(Number(patch.prixMinHT) || prix),
    prixMaxHT: round2(Number(patch.prixMaxHT) || prix),
    tauxTVA: patch.tauxTVA != null ? Number(patch.tauxTVA) : undefined,
    nombreUtilisations: Math.max(0, Number(patch.nombreUtilisations) || 0),
    derniereUtilisation: patch.derniereUtilisation || new Date().toISOString().slice(0, 10),
    source: "manuel",
    verrouille: patch.verrouille !== false,
    desactive: false,
    fiabilite: patch.verrouille !== false ? FIABILITE_MANUEL_VERROUILLE : getFiabiliteAppris(0),
    regionLabel: patch.regionLabel,
    departementCode: patch.departementCode,
    normaliseKey,
    prixObserves: [prix],
  };

  if (index >= 0) {
    entries[index] = { ...entries[index], ...base, id: entries[index].id };
  } else {
    entries.push(base);
  }

  return { ...bibliotheque, entries };
}

export function disableBibliothequeEntry(
  bibliotheque: BibliothequeEntreprise,
  entryId: string,
): BibliothequeEntreprise {
  return {
    ...bibliotheque,
    entries: bibliotheque.entries.map((entry) =>
      entry.id === entryId ? { ...entry, desactive: true } : entry,
    ),
  };
}

export function resetBibliothequeEntry(
  bibliotheque: BibliothequeEntreprise,
  entryId: string,
): BibliothequeEntreprise {
  return {
    ...bibliotheque,
    entries: bibliotheque.entries.filter((entry) => entry.id !== entryId),
  };
}

export function toggleBibliothequeEntryLock(
  bibliotheque: BibliothequeEntreprise,
  entryId: string,
): BibliothequeEntreprise {
  return {
    ...bibliotheque,
    entries: bibliotheque.entries.map((entry) => {
      if (entry.id !== entryId || entry.desactive) return entry;
      const verrouille = !entry.verrouille;
      return {
        ...entry,
        verrouille,
        source: "manuel",
        fiabilite: verrouille
          ? FIABILITE_MANUEL_VERROUILLE
          : getFiabiliteEntrepriseEntry({
              source: entry.source,
              verrouille: false,
              nombreUtilisations: entry.nombreUtilisations,
            }),
      };
    }),
  };
}

export function resetBibliothequeEntreprise(): BibliothequeEntreprise {
  return { ...DEFAULT_BIBLIOTHEQUE_ENTREPRISE };
}

export function exportBibliothequeEntrepriseJson(
  bibliotheque: BibliothequeEntreprise,
): string {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    bibliotheque: normalizeBibliothequeEntreprise(bibliotheque),
  };
  return JSON.stringify(payload, null, 2);
}

export function importBibliothequeEntrepriseJson(
  bibliotheque: BibliothequeEntreprise,
  json: string,
): BibliothequeEntreprise {
  const parsed = JSON.parse(json) as {
    bibliotheque?: Partial<BibliothequeEntreprise>;
    entries?: BibliothequeEntrepriseEntry[];
  };

  const imported = normalizeBibliothequeEntreprise(
    parsed.bibliotheque ?? { entries: parsed.entries ?? [] },
  );

  const mergedEntries = [...bibliotheque.entries];
  for (const entry of imported.entries) {
    const index = mergedEntries.findIndex(
      (existing) =>
        !existing.desactive && existing.normaliseKey === entry.normaliseKey,
    );
    if (index >= 0) {
      mergedEntries[index] = { ...mergedEntries[index], ...entry, id: mergedEntries[index].id };
    } else {
      mergedEntries.push(entry);
    }
  }

  return normalizeBibliothequeEntreprise({
    ...bibliotheque,
    ...imported,
    entries: mergedEntries,
    learnedDevis: bibliotheque.learnedDevis,
  });
}

export type BibliothequePrixResolution = {
  prixHT: number;
  source: "manuel" | "appris" | "regional" | "batimum" | "a_verifier";
  prixAVerifier: boolean;
  fiabilite?: number;
  designationRef?: string;
  tvaHabituelle?: number;
  purchasePriceHT?: number;
  marginRate?: number;
  sourceLabel?: string;
};

export function formatBibliothequeForPrompt(
  entries: BibliothequeEntrepriseEntry[],
): string {
  const active = entries.filter((entry) => !entry.desactive);
  if (active.length === 0) {
    return "BIBLIOTHÈQUE ENTREPRISE : vide — utiliser base régionale Batimum.";
  }

  const manuel = active.filter((entry) => entry.source === "manuel");
  const appris = active.filter((entry) => entry.source === "appris");

  const formatLine = (entry: BibliothequeEntrepriseEntry) => {
    const fiabilite = getFiabiliteEntrepriseEntry({
      source: entry.source,
      verrouille: entry.verrouille,
      nombreUtilisations: entry.nombreUtilisations,
      fiabilite: entry.fiabilite,
    });
    return `- [${entry.source.toUpperCase()}${entry.verrouille ? " VERROUILLÉ" : ""}] ${entry.categorie} | ${entry.designation} | ${entry.unite} | moyen ${entry.prixMoyenHT} € HT (min ${entry.prixMinHT} — max ${entry.prixMaxHT})${entry.tauxTVA != null ? ` | TVA ${entry.tauxTVA}%` : ""} | fiabilité interne ${fiabilite}%`;
  };

  const lines = [
    "BIBLIOTHÈQUE ENTREPRISE (PRIORITÉ ABSOLUE — NE PAS INVENTER DE PRIX) :",
    "Ordre strict : 1) manuel verrouillé 2) appris forte fiabilité 3) appris moyen 4) régional Batimum 5) standard Batimum 6) prix à vérifier",
    "",
    ...(manuel.length > 0
      ? ["--- Prix manuels entreprise ---", ...manuel.map(formatLine), ""]
      : []),
    ...(appris.length > 0
      ? ["--- Prix appris entreprise ---", ...appris.slice(0, 40).map(formatLine)]
      : []),
  ];

  return lines.join("\n");
}

export function serializeBibliothequeForApi(
  bibliotheque: BibliothequeEntreprise,
): BibliothequeEntrepriseEntry[] {
  return getActiveBibliothequeEntries(bibliotheque).map(
    ({ prixObserves: _prixObserves, ...entry }) => entry,
  );
}
