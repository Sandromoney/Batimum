import {
  formatBatimumCatalogueForPrompt,
  BATIMUM_PRIX_CATALOGUE,
  type BtpNiveauPrix,
} from "@/lib/batimum-prix-catalogue";
import { getRegionalCoefficient } from "@/lib/batimum-coefficients-regionaux";

export type { BtpNiveauPrix };

export type BtpMetier =
  | "depose"
  | "protection"
  | "placo"
  | "isolation"
  | "electricite"
  | "plomberie"
  | "carrelage"
  | "sols"
  | "peinture"
  | "menuiserie"
  | "sanitaires"
  | "nettoyage"
  | "deplacement";

export type BtpTarifReference = {
  metier: BtpMetier;
  designation: string;
  unite: string;
  prixHTMin: number;
  prixHTMoyen: number;
  prixHTMax: number;
  tvaHabituelle: number;
  margeMateriauPct: number;
  commentaire: string;
  regions?: string[];
};

export const BTP_METIER_LABELS: Record<BtpMetier, string> = {
  depose: "Dépose / préparation",
  protection: "Protection chantier",
  placo: "Placo / doublage / faux plafond",
  isolation: "Isolation",
  electricite: "Électricité",
  plomberie: "Plomberie",
  carrelage: "Carrelage / faïence",
  sols: "Sols",
  peinture: "Peinture / finitions",
  menuiserie: "Menuiseries",
  sanitaires: "Sanitaires",
  nettoyage: "Nettoyage / évacuation",
  deplacement: "Déplacement / installation",
};

export const BTP_SECTION_TITLES = [
  "PARTIE DÉPOSE / PRÉPARATION",
  "PARTIE PROTECTION CHANTIER",
  "PARTIE PLACO",
  "PARTIE ISOLATION",
  "PARTIE ÉLECTRICITÉ",
  "PARTIE PLOMBERIE",
  "PARTIE CARRELAGE / FAÏENCE",
  "PARTIE SOLS",
  "PARTIE PEINTURE / FINITIONS",
  "PARTIE MENUISERIES",
  "PARTIE SANITAIRES",
  "PARTIE NETTOYAGE / ÉVACUATION",
  "PARTIE DÉPLACEMENT / INSTALLATION CHANTIER",
] as const;

const CATEGORIE_TO_METIER: Record<string, BtpMetier> = {
  Placo: "placo",
  Isolation: "isolation",
  "Carrelage / Faïence": "carrelage",
  Sols: "sols",
  Peinture: "peinture",
  Plomberie: "plomberie",
  Électricité: "electricite",
  Dépose: "depose",
  "Évacuation / Nettoyage": "nettoyage",
  // Rétrocompatibilité anciennes catégories
  "Dépose / préparation": "depose",
  "Protection chantier": "protection",
  "Évacuation gravats": "nettoyage",
  "Faux plafonds": "placo",
  Cloisons: "placo",
  Carrelage: "carrelage",
  Faïence: "carrelage",
  "Salle de bain": "plomberie",
  Sanitaires: "sanitaires",
  "Menuiseries intérieures": "menuiserie",
  "Nettoyage fin de chantier": "nettoyage",
};

export const BTP_TARIFS_REFERENCE: BtpTarifReference[] = BATIMUM_PRIX_CATALOGUE.map(
  (entry) => ({
    metier: CATEGORIE_TO_METIER[entry.categorie] ?? "deplacement",
    designation: entry.designation,
    unite: entry.unite,
    prixHTMin: entry.prixMinHT,
    prixHTMoyen: entry.prixMoyenHT,
    prixHTMax: entry.prixMaxHT,
    tvaHabituelle: entry.tvaHabituelle,
    margeMateriauPct:
      entry.type === "fourniture" ? 35 : entry.type === "pose" ? 0 : 20,
    commentaire: entry.notes ?? "",
  }),
);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getNiveauPrixMultiplier(niveau: BtpNiveauPrix): number {
  switch (niveau) {
    case "economique":
      return 0.92;
    case "premium":
      return 1.18;
    default:
      return 1;
  }
}

export function getRegionalPriceCoefficient(
  regionCode: string,
  departementCode: string,
  coefficientManuel?: number | null,
): number {
  return getRegionalCoefficient({
    regionCode,
    departementCode,
    coefficientManuel,
  });
}

export function getAdjustedTarifPrice(
  tarif: BtpTarifReference,
  niveau: BtpNiveauPrix,
  regionCode: string,
  departementCode: string,
  field: "min" | "moyen" | "max" = "moyen",
  coefficientManuel?: number | null,
): number {
  const base =
    field === "min"
      ? tarif.prixHTMin
      : field === "max"
        ? tarif.prixHTMax
        : tarif.prixHTMoyen;

  return round2(
    base *
      getRegionalPriceCoefficient(regionCode, departementCode, coefficientManuel) *
      getNiveauPrixMultiplier(niveau),
  );
}

export function formatTarifsForPrompt(params: {
  regionCode: string;
  regionLabel: string;
  departementCode: string;
  departementLabel: string;
  niveauPrix: BtpNiveauPrix;
  coefficientManuel?: number | null;
  ville?: string;
}): string {
  return formatBatimumCatalogueForPrompt(params);
}

export const BTP_LOTS_A_ANALYSER = Object.values(BTP_METIER_LABELS);
