import type { ChantierRentabiliteResume } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function formatChantierBeneficePhrase(
  rentabilite: ChantierRentabiliteResume,
): string {
  if (rentabilite.prixVenteHT <= 0) {
    return "Liez un devis accepté pour connaître le prix de vente et la rentabilité.";
  }

  const hasReelData =
    rentabilite.debourseReel > 0 || rentabilite.tempsReelHeures > 0;

  if (!hasReelData || rentabilite.rentabiliteIncomplete) {
    return "Pointez les heures et enregistrez les achats pour calculer le bénéfice réel.";
  }

  const benefice = rentabilite.beneficeReel;
  const taux = rentabilite.tauxMargeReelle;

  if (benefice < 0) {
    return `Ce chantier affiche un écart négatif de ${formatCurrency(Math.abs(benefice))} — vérifiez les coûts matériaux et main-d'œuvre.`;
  }

  return `Ce chantier vous a rapporté ${formatCurrency(benefice)} de bénéfice avec une marge réelle de ${taux.toFixed(0)} %.`;
}

export function formatChantierTempsComparatif(
  rentabilite: ChantierRentabiliteResume,
): string {
  const { tempsPrevuHeures, tempsReelHeures, ecartTempsHeures } = rentabilite;
  if (tempsPrevuHeures <= 0 && tempsReelHeures <= 0) {
    return "Temps non renseigné — ajoutez une estimation sur le devis.";
  }
  const ecartLabel =
    ecartTempsHeures >= 0
      ? `+${ecartTempsHeures.toFixed(0)} h`
      : `${ecartTempsHeures.toFixed(0)} h`;
  return `Prévu : ${tempsPrevuHeures.toFixed(0)} h · Réel : ${tempsReelHeures.toFixed(0)} h · Écart : ${ecartLabel}`;
}
