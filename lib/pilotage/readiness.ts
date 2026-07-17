import type { AppData } from "@/lib/types";

export type PilotageReadinessStep = {
  id: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

export type PilotageReadiness = {
  steps: PilotageReadinessStep[];
  completedCount: number;
  isActionable: boolean;
};

/** Indique si le patron a assez de données pour un pilotage fiable. */
export function getPilotageReadiness(data: AppData): PilotageReadiness {
  const hasAchatPrices = data.devis.some((devis) =>
    devis.lignes.some((ligne) => (ligne.prixAchatHT ?? 0) > 0),
  );
  const hasHeuresPrevues =
    data.devis.some(
      (devis) => (devis.pilotageMainOeuvre?.heuresPrevues ?? 0) > 0,
    ) || data.chantiers.some((chantier) => (chantier.heuresPrevues ?? 0) > 0);
  const hasTimeEntries = (data.chantierTimeEntries ?? []).length > 0;
  const hasEmployeCosts =
    data.employes.some(
      (employe) => (employe.coutHoraireInterne ?? 0) > 0,
    ) || (data.parametres.tauxHoraireInterneDefaut ?? 0) > 0;
  const hasCategoriePilotage = data.devis.some(
    (devis) => Boolean(devis.categoriePilotage),
  );

  const steps: PilotageReadinessStep[] = [
    {
      id: "achats",
      label: "Prix d'achat sur les devis",
      hint: "Activez « Coûts internes » dans l'éditeur de devis.",
      href: "/devis",
      done: hasAchatPrices,
    },
    {
      id: "heures-prevues",
      label: "Heures prévues par chantier",
      hint: "Section « Pilotage interne » sur chaque devis.",
      href: "/devis",
      done: hasHeuresPrevues,
    },
    {
      id: "pointage",
      label: "Heures pointées sur les chantiers",
      hint: "Depuis la fiche de chaque chantier en cours.",
      href: "/chantiers",
      done: hasTimeEntries,
    },
    {
      id: "cout-horaire",
      label: "Coût horaire des employés",
      hint: "Paramètres → Employés → Données pilotage.",
      href: "/parametres?section=employes",
      done: hasEmployeCosts,
    },
    {
      id: "categories",
      label: "Types de chantiers classés",
      hint: "Catégorie pilotage sur vos devis (SDB, dépannage…).",
      href: "/devis",
      done: hasCategoriePilotage,
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;
  const isActionable = completedCount >= 3;

  return { steps, completedCount, isActionable };
}
