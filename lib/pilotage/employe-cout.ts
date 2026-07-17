import type { Employe } from "@/lib/types";

export type ResolveEmployeCoutHoraireOptions = {
  /** Taux saisi sur le chantier ou le devis lié. */
  chantierTauxHoraire?: number;
  /** Taux par défaut entreprise (Paramètres). */
  entrepriseTauxDefaut?: number;
};

/**
 * Priorité : coût employé → taux chantier/devis → taux entreprise.
 * Données internes — ne jamais exposer aux comptes employé.
 */
export function resolveEmployeCoutHoraire(
  employe: Employe | undefined,
  options: ResolveEmployeCoutHoraireOptions = {},
): number {
  if (employe?.coutHoraireInterne && employe.coutHoraireInterne > 0) {
    return employe.coutHoraireInterne;
  }
  if (options.chantierTauxHoraire && options.chantierTauxHoraire > 0) {
    return options.chantierTauxHoraire;
  }
  return options.entrepriseTauxDefaut ?? 0;
}

export function computeEntryCoutMainOeuvre(
  heures: number,
  employe: Employe | undefined,
  options: ResolveEmployeCoutHoraireOptions = {},
): number {
  const taux = resolveEmployeCoutHoraire(employe, options);
  return Math.round(heures * taux * 100) / 100;
}
