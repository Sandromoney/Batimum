import type { CategoriePilotageChantier, Chantier, Devis, TypeChantier } from "@/lib/types";

export const CATEGORIES_PILOTAGE: CategoriePilotageChantier[] = [
  "depannage",
  "salle_de_bain",
  "carrelage",
  "placo",
  "renovation_complete",
  "long_chantier",
  "petit_chantier",
  "autre",
];

export const CATEGORIE_PILOTAGE_LABELS: Record<CategoriePilotageChantier, string> = {
  depannage: "Dépannage",
  salle_de_bain: "Salle de bain",
  carrelage: "Carrelage",
  placo: "Placo",
  renovation_complete: "Rénovation complète",
  long_chantier: "Long chantier",
  petit_chantier: "Petit chantier",
  autre: "Autre",
};

export function getCategoriePilotageLabel(
  categorie?: CategoriePilotageChantier,
  personnalise?: string,
): string {
  if (!categorie) return personnalise?.trim() || "Non classé";
  if (categorie === "autre" && personnalise?.trim()) {
    return personnalise.trim();
  }
  return CATEGORIE_PILOTAGE_LABELS[categorie];
}

export function inferCategoriePilotageFromTypeChantier(
  type?: TypeChantier,
): CategoriePilotageChantier | undefined {
  switch (type) {
    case "salle_de_bain":
      return "salle_de_bain";
    case "cuisine":
      return "renovation_complete";
    case "renovation":
      return "renovation_complete";
    case "extension":
      return "long_chantier";
    case "maison_neuve":
      return "long_chantier";
    case "autre":
      return "autre";
    default:
      return undefined;
  }
}

export function resolveChantierCategoriePilotage(
  chantier: Chantier,
  devis?: Devis,
): CategoriePilotageChantier {
  if (chantier.categoriePilotage) return chantier.categoriePilotage;
  if (devis?.categoriePilotage) return devis.categoriePilotage;
  return (
    inferCategoriePilotageFromTypeChantier(chantier.type ?? devis?.typeChantier) ??
    "autre"
  );
}
