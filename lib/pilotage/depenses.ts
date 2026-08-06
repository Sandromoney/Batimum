/**
 * Dépenses Pilotage (saisie manuelle + import facture fournisseur).
 * Stockage local au module — n'altère pas AppData / autres modules.
 */

export type PilotageDepenseSource = "manuel" | "pdf_fournisseur";

export type PilotageDepense = {
  id: string;
  fournisseur: string;
  libelle: string;
  date: string;
  montantHT: number;
  tauxTVA: number;
  montantTVA: number;
  montantTTC: number;
  source: PilotageDepenseSource;
  fichierImport?: string;
  createdAt: string;
};

const STORAGE_PREFIX = "batimum.pilotage.depenses";

function storageKey(companyId?: string | null): string {
  const id = companyId?.trim() || "local";
  return `${STORAGE_PREFIX}.${id}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeDepenseAmounts(input: {
  montantHT: number;
  tauxTVA?: number;
  montantTTC?: number;
}): { montantHT: number; tauxTVA: number; montantTVA: number; montantTTC: number } {
  const tauxTVA =
    typeof input.tauxTVA === "number" && Number.isFinite(input.tauxTVA)
      ? Math.max(0, input.tauxTVA)
      : 20;
  let montantHT = Number.isFinite(input.montantHT) ? Math.max(0, input.montantHT) : 0;
  let montantTTC =
    typeof input.montantTTC === "number" && Number.isFinite(input.montantTTC)
      ? Math.max(0, input.montantTTC)
      : round2(montantHT * (1 + tauxTVA / 100));

  if (montantHT <= 0 && montantTTC > 0) {
    montantHT = round2(montantTTC / (1 + tauxTVA / 100));
  }
  if (montantTTC <= 0 && montantHT > 0) {
    montantTTC = round2(montantHT * (1 + tauxTVA / 100));
  }

  const montantTVA = round2(Math.max(0, montantTTC - montantHT));
  return {
    montantHT: round2(montantHT),
    tauxTVA,
    montantTVA,
    montantTTC: round2(montantTTC),
  };
}

export function loadPilotageDepenses(companyId?: string | null): PilotageDepense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is PilotageDepense =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as PilotageDepense).id === "string" &&
          typeof (item as PilotageDepense).montantHT === "number",
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export function savePilotageDepenses(
  depenses: PilotageDepense[],
  companyId?: string | null,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(companyId), JSON.stringify(depenses));
}

export function upsertPilotageDepense(
  depense: PilotageDepense,
  companyId?: string | null,
): PilotageDepense[] {
  const current = loadPilotageDepenses(companyId);
  const next = [depense, ...current.filter((item) => item.id !== depense.id)];
  savePilotageDepenses(next, companyId);
  return next;
}

export function removePilotageDepense(
  id: string,
  companyId?: string | null,
): PilotageDepense[] {
  const next = loadPilotageDepenses(companyId).filter((item) => item.id !== id);
  savePilotageDepenses(next, companyId);
  return next;
}
