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
      statut: (
        entry.statut === "transforme" || entry.statut === "supprime"
          ? entry.statut
          : "genere"
      ) as MumIaHistoriqueStatut,
      devisBrouillonId: entry.devisBrouillonId?.trim() || undefined,
      devisIa: entry.devisIa as AiDevisResult,
    }))
    .filter((entry) => entry.devisIa && entry.descriptionChantier.length > 0)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function createMumIaHistoriqueEntry(params: {
  devisIa: AiDevisResult;
  context: MumIaHistoriqueContext;
}): MumIaHistoriqueEntry {
  const { devisIa, context } = params;
  const totalHT = round2(devisIa.totalHT);
  const taux = context.tauxTVA;

  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    titre: devisIa.titre || "Devis IA",
    descriptionChantier: context.descriptionChantier,
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
  };
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
        entry.regionLabel,
        entry.departementLabel,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export const MUM_IA_HISTORIQUE_STATUT_LABELS: Record<MumIaHistoriqueStatut, string> = {
  genere: "Généré",
  transforme: "Transformé en brouillon",
  supprime: "Supprimé",
};

export function excerptDescription(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}
