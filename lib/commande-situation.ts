import { isSectionLigne } from "./devis-lignes";
import { ligneMontantTTC, resolveLigneDefaultTva } from "./devis-tva";
import type { Commande, CommandeLigneSituation, Devis } from "./types";
export const SITUATION_POURCENTAGE_PRESETS = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
] as const;

export function getDevisLignesFacturables(devis: Devis) {
  return (devis.lignes ?? []).filter((ligne) => !isSectionLigne(ligne));
}

export function getLigneSituationEntry(
  commande: Commande,
  ligneDevisId: string,
): CommandeLigneSituation | undefined {
  return commande.lignesSituation?.find((entry) => entry.ligneDevisId === ligneDevisId);
}

export function getLigneSituationPourcentageFacture(
  commande: Commande,
  ligneDevisId: string,
): number {
  return getLigneSituationEntry(commande, ligneDevisId)?.pourcentageFacture ?? 0;
}

export function computeLigneMontantTTC(
  devis: Devis,
  ligneId: string,
  defaultTva: number,
): number {
  const ligne = devis.lignes?.find((item) => item.id === ligneId);
  if (!ligne || isSectionLigne(ligne)) return 0;
  const tva = resolveLigneDefaultTva(devis, defaultTva);
  return ligneMontantTTC(ligne, tva);
}

export function computeSituationMontantFromLignes({
  devis,
  commande,
  targetPourcentages,
  defaultTva,
}: {
  devis: Devis;
  commande: Commande;
  targetPourcentages: Record<string, number>;
  defaultTva: number;
}): {
  montantTTC: number;
  pourcentageGlobal: number;
  lignes: Array<{
    ligneDevisId: string;
    designation: string;
    montantLigneTTC: number;
    dejaFacture: number;
    cible: number;
    montantFacture: number;
  }>;
} {
  const lignes = getDevisLignesFacturables(devis);
  let montantTTC = 0;
  let totalLignesTTC = 0;
  let totalFactureTTC = 0;
  const details: Array<{
    ligneDevisId: string;
    designation: string;
    montantLigneTTC: number;
    dejaFacture: number;
    cible: number;
    montantFacture: number;
  }> = [];

  for (const ligne of lignes) {
    const montantLigneTTC = computeLigneMontantTTC(devis, ligne.id, defaultTva);
    totalLignesTTC += montantLigneTTC;
    const dejaFacture = getLigneSituationPourcentageFacture(commande, ligne.id);
    const cible = Math.min(
      100,
      Math.max(dejaFacture, targetPourcentages[ligne.id] ?? dejaFacture),
    );
    const montantFacture =
      Math.round(montantLigneTTC * ((cible - dejaFacture) / 100) * 100) / 100;
    montantTTC += montantFacture;
    totalFactureTTC += montantLigneTTC * (cible / 100);
    details.push({
      ligneDevisId: ligne.id,
      designation: ligne.designation || ligne.description || "Ligne",
      montantLigneTTC,
      dejaFacture,
      cible,
      montantFacture,
    });
  }

  const pourcentageGlobal =
    totalLignesTTC > 0
      ? Math.round((totalFactureTTC / totalLignesTTC) * 1000) / 10
      : 0;

  return {
    montantTTC: Math.round(montantTTC * 100) / 100,
    pourcentageGlobal,
    lignes: details,
  };
}

export function validateLigneSituationTargets({
  devis,
  commande,
  targetPourcentages,
  defaultTva,
  resteAFacturer,
}: {
  devis: Devis;
  commande: Commande;
  targetPourcentages: Record<string, number>;
  defaultTva: number;
  resteAFacturer: number;
}): string | null {
  for (const ligne of getDevisLignesFacturables(devis)) {
    const dejaFacture = getLigneSituationPourcentageFacture(commande, ligne.id);
    const cible = targetPourcentages[ligne.id] ?? dejaFacture;
    if (cible > 100 + 0.01) {
      return "Impossible de dépasser 100 % sur une ligne.";
    }
    if (cible < dejaFacture - 0.01) {
      return "Le pourcentage cible ne peut pas être inférieur au déjà facturé sur une ligne.";
    }
  }

  const summary = computeSituationMontantFromLignes({
    devis,
    commande,
    targetPourcentages,
    defaultTva,
  });

  if (summary.pourcentageGlobal > 100 + 0.1) {
    return "Impossible de dépasser 100 % sur le devis.";
  }

  if (!(summary.montantTTC > 0)) {
    return "Sélectionnez un avancement supérieur au déjà facturé.";
  }

  if (summary.montantTTC > resteAFacturer + 0.01) {
    return "Le montant dépasse le restant à facturer.";
  }

  return null;
}

export function buildUpdatedLignesSituation(
  commande: Commande,
  targetPourcentages: Record<string, number>,
): CommandeLigneSituation[] {
  const map = new Map(
    (commande.lignesSituation ?? []).map((entry) => [
      entry.ligneDevisId,
      entry.pourcentageFacture,
    ]),
  );

  Object.entries(targetPourcentages).forEach(([ligneDevisId, value]) => {
    const current = map.get(ligneDevisId) ?? 0;
    map.set(ligneDevisId, Math.min(100, Math.max(current, value)));
  });

  return [...map.entries()].map(([ligneDevisId, pourcentageFacture]) => ({
    ligneDevisId,
    pourcentageFacture,
  }));
}
