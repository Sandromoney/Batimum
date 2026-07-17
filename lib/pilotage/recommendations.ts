import {
  buildChantiersRentabilite,
} from "@/lib/pilotage/calculations";
import {
  computeAnalyseParTypeChantier,
  computeEmployeEfficaciteDomains,
  getTypeChantierLePlusRapide,
  getTypeChantierLePlusRentable,
} from "@/lib/pilotage/analytics";
import { employeDisplayLabel } from "@/lib/employee-access";
import type { AppData } from "@/lib/types";

export type PilotageConstat = {
  id: string;
  message: string;
};

const INSUFFICIENT_DATA_MESSAGE =
  "Données insuffisantes pour générer une analyse fiable.";

/** Constats factuels — uniquement à partir des données réelles. */
export function generatePilotageConstats(data: AppData): PilotageConstat[] {
  const analyses = computeAnalyseParTypeChantier(data);
  const classements = buildChantiersRentabilite(data);
  const constats: PilotageConstat[] = [];

  const typesFiables = analyses.filter((item) => item.nombreChantiers >= 2);
  const typeTop = getTypeChantierLePlusRentable(typesFiables);
  if (typeTop) {
    constats.push({
      id: `type-rentable-${typeTop.categorie}`,
      message: `Type de chantier le plus rentable : ${typeTop.label} — meilleur taux de marge ${typeTop.rentabiliteMoyenne.toFixed(0)} %.`,
    });
  }

  const typeRapide = getTypeChantierLePlusRapide(typesFiables);
  if (
    typeRapide &&
    typeRapide.categorie !== typeTop?.categorie &&
    typeRapide.tempsMoyenPrevu > 0
  ) {
    constats.push({
      id: `type-rapide-${typeRapide.categorie}`,
      message: `Type de chantier le plus rapide : ${typeRapide.label} — écart temps moyen ${typeRapide.ecartMoyenHeures >= 0 ? "+" : ""}${typeRapide.ecartMoyenHeures.toFixed(0)} h.`,
    });
  }

  const employesEfficaces = computeEmployeEfficaciteDomains(data)
    .filter((row) => row.meilleurType && row.heuresTravaillees > 0)
    .sort((a, b) => a.ecartTempsPctMoyen - b.ecartTempsPctMoyen);

  const employeEfficace = employesEfficaces[0];
  if (employeEfficace?.meilleurType) {
    const prenom =
      employeEfficace.employe.prenom ||
      employeDisplayLabel(employeEfficace.employe);
    constats.push({
      id: `employe-type-${employeEfficace.employe.id}`,
      message: `Employé le plus efficace sur ${employeEfficace.meilleurTypeLabel.toLowerCase()} : ${prenom}.`,
    });
  }

  const depassementMax = [...classements]
    .filter(
      (item) =>
        item.rentabilite.tempsPrevuHeures > 0 &&
        item.rentabilite.ecartTempsHeures > 0,
    )
    .sort(
      (a, b) =>
        b.rentabilite.ecartTempsHeures - a.rentabilite.ecartTempsHeures,
    )[0];

  if (depassementMax) {
    constats.push({
      id: `depassement-${depassementMax.chantier.id}`,
      message: `Chantier avec le plus gros dépassement : ${depassementMax.chantier.nom} — +${Math.round(depassementMax.rentabilite.ecartTempsHeures)} h vs prévu.`,
    });
  }

  if (constats.length === 0) {
    return [{ id: "insufficient", message: INSUFFICIENT_DATA_MESSAGE }];
  }

  return constats.slice(0, 5);
}

/** @deprecated Utiliser generatePilotageConstats */
export function generatePilotageRecommendations(data: AppData) {
  return generatePilotageConstats(data);
}

export type PilotageRecommendation = PilotageConstat;
