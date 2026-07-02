import type { AiChantierAnalysis } from "@/lib/ai-devis-analysis";
import type { AiDevisResult } from "@/lib/ai-devis";
import type { BtpNiveauPrix } from "@/lib/btp-tarifs-reference";
import type { MumIaHistoriqueEntry, MumIaHistoriqueStatut, TypeChantier } from "@/lib/types";
import { generateId } from "@/lib/utils";

export type MumIaHistoriqueContext = {
  descriptionChantier: string;
  regionCode: string;
  regionLabel: string;
  departementCode: string;
  departementLabel: string;
  typeChantier: TypeChantier;
  tauxTVA: number;
  niveauPrix: BtpNiveauPrix;
  villeEntreprise?: string;
};

export type MumIaHistoriqueFilters = {
  query?: string;
  statut?: MumIaHistoriqueStatut | "tous";
  typeChantier?: TypeChantier | "tous";
  /** Nombre de jours glissants (7, 30, 90) ou undefined = tout */
  derniersJours?: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeStatut(statut: unknown): MumIaHistoriqueStatut {
  if (statut === "analyse" || statut === "transforme" || statut === "supprime") {
    return statut;
  }
  return "genere";
}

export function normalizeMumIaHistorique(
  partial?: MumIaHistoriqueEntry[] | null,
): MumIaHistoriqueEntry[] {
  if (!Array.isArray(partial)) return [];

  return partial
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      id: entry.id || generateId(),
      createdAt: entry.createdAt || new Date().toISOString(),
      titre: String(entry.titre ?? "Devis IA"),
      descriptionChantier: String(entry.descriptionChantier ?? ""),
      precisionsSupplementaires: entry.precisionsSupplementaires?.trim() || undefined,
      regionCode: String(entry.regionCode ?? ""),
      regionLabel: String(entry.regionLabel ?? ""),
      departementCode: String(entry.departementCode ?? ""),
      departementLabel: String(entry.departementLabel ?? ""),
      villeEntreprise: entry.villeEntreprise?.trim() || undefined,
      typeChantier: (entry.typeChantier as TypeChantier) || "renovation",
      niveauPrix: (entry.niveauPrix as BtpNiveauPrix) || "standard",
      tauxTVA: Number(entry.tauxTVA) || 20,
      totalHT: round2(Number(entry.totalHT) || 0),
      totalTTC:
        entry.totalTTC != null ? round2(Number(entry.totalTTC) || 0) : undefined,
      statut: normalizeStatut(entry.statut),
      devisBrouillonId: entry.devisBrouillonId?.trim() || undefined,
      devisIa: entry.devisIa as AiDevisResult | undefined,
      analysisSnapshot: entry.analysisSnapshot as AiChantierAnalysis | undefined,
    }))
    .filter((entry) => entry.descriptionChantier.length > 0)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function createMumIaHistoriqueAnalyseEntry(params: {
  context: MumIaHistoriqueContext;
  analysis: AiChantierAnalysis;
  id?: string;
}): MumIaHistoriqueEntry {
  const { context, analysis } = params;
  const titre =
    analysis.lotsIdentifies.length > 0
      ? `Analyse — ${analysis.lotsIdentifies.slice(0, 2).join(", ")}`
      : excerptDescription(context.descriptionChantier, 60) || "Analyse chantier";

  return {
    id: params.id ?? generateId(),
    createdAt: new Date().toISOString(),
    titre,
    descriptionChantier: context.descriptionChantier,
    regionCode: context.regionCode,
    regionLabel: context.regionLabel,
    departementCode: context.departementCode,
    departementLabel: context.departementLabel,
    villeEntreprise: context.villeEntreprise,
    typeChantier: context.typeChantier,
    niveauPrix: context.niveauPrix,
    tauxTVA: context.tauxTVA,
    totalHT: 0,
    statut: "analyse",
    analysisSnapshot: analysis,
  };
}

export function createMumIaHistoriqueEntry(params: {
  devisIa: AiDevisResult;
  context: MumIaHistoriqueContext;
  precisionsSupplementaires?: string;
  analysisSnapshot?: AiChantierAnalysis;
  id?: string;
}): MumIaHistoriqueEntry {
  const { devisIa, context } = params;
  const totalHT = round2(devisIa.totalHT);
  const taux = context.tauxTVA;

  return {
    id: params.id ?? generateId(),
    createdAt: new Date().toISOString(),
    titre: devisIa.titre || "Devis IA",
    descriptionChantier: context.descriptionChantier,
    precisionsSupplementaires: params.precisionsSupplementaires?.trim() || undefined,
    regionCode: context.regionCode,
    regionLabel: context.regionLabel,
    departementCode: context.departementCode,
    departementLabel: context.departementLabel,
    villeEntreprise: context.villeEntreprise,
    typeChantier: context.typeChantier,
    niveauPrix: context.niveauPrix,
    tauxTVA: taux,
    totalHT,
    totalTTC: round2(totalHT * (1 + taux / 100)),
    statut: "genere",
    devisIa,
    analysisSnapshot: params.analysisSnapshot,
  };
}

export function markMumIaHistoriqueGenere(
  entries: MumIaHistoriqueEntry[],
  entryId: string,
  params: {
    devisIa: AiDevisResult;
    precisionsSupplementaires?: string;
  },
): MumIaHistoriqueEntry[] {
  const totalHT = round2(params.devisIa.totalHT);

  return entries.map((entry) => {
    if (entry.id !== entryId) return entry;
    const taux = entry.tauxTVA;
    return {
      ...entry,
      titre: params.devisIa.titre || entry.titre,
      precisionsSupplementaires:
        params.precisionsSupplementaires?.trim() || entry.precisionsSupplementaires,
      totalHT,
      totalTTC: round2(totalHT * (1 + taux / 100)),
      statut: "genere" as const,
      devisIa: params.devisIa,
    };
  });
}

export function markMumIaHistoriqueTransforme(
  entries: MumIaHistoriqueEntry[],
  entryId: string,
  devisBrouillonId: string,
): MumIaHistoriqueEntry[] {
  return entries.map((entry) =>
    entry.id === entryId
      ? { ...entry, statut: "transforme" as const, devisBrouillonId }
      : entry,
  );
}

export function markMumIaHistoriqueSupprime(
  entries: MumIaHistoriqueEntry[],
  entryId: string,
): MumIaHistoriqueEntry[] {
  return entries.map((entry) =>
    entry.id === entryId ? { ...entry, statut: "supprime" as const } : entry,
  );
}

export function filterMumIaHistorique(
  entries: MumIaHistoriqueEntry[],
  filters: MumIaHistoriqueFilters,
): MumIaHistoriqueEntry[] {
  const query = filters.query?.trim().toLowerCase() ?? "";

  return entries.filter((entry) => {
    if (entry.statut === "supprime" && filters.statut !== "supprime") {
      return false;
    }

    if (filters.statut && filters.statut !== "tous" && entry.statut !== filters.statut) {
      return false;
    }

    if (
      filters.typeChantier &&
      filters.typeChantier !== "tous" &&
      entry.typeChantier !== filters.typeChantier
    ) {
      return false;
    }

    if (filters.derniersJours && filters.derniersJours > 0) {
      const cutoff = Date.now() - filters.derniersJours * 24 * 60 * 60 * 1000;
      if (new Date(entry.createdAt).getTime() < cutoff) return false;
    }

    if (query) {
      const haystack = [
        entry.titre,
        entry.descriptionChantier,
        entry.precisionsSupplementaires,
        entry.regionLabel,
        entry.departementLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export const MUM_IA_HISTORIQUE_STATUT_LABELS: Record<MumIaHistoriqueStatut, string> = {
  analyse: "Analysé",
  genere: "Généré",
  transforme: "Transformé en brouillon",
  supprime: "Supprimé",
};

export function excerptDescription(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}
