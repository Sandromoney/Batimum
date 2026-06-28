import type { Chantier, EtapeChantier, StatutChantier, TypeChantier } from "./types";
import { generateId } from "./utils";

export const CHANTIER_STATUT_LABELS: Record<StatutChantier, string> = {
  planifie: "À planifier",
  en_cours: "En cours",
  retard_demarrage: "Retard de démarrage",
  en_retard: "En retard",
  termine: "Terminé",
  suspendu: "Suspendu",
};

export const TYPE_CHANTIER_LABELS: Record<TypeChantier, string> = {
  renovation: "Rénovation",
  maison_neuve: "Maison neuve",
  extension: "Extension",
  salle_de_bain: "Salle de bain",
  cuisine: "Cuisine",
  autre: "Autre",
};

type TemplateStep = {
  titre: string;
  poids?: number;
};

const CHANTIER_TEMPLATES: Record<Exclude<TypeChantier, "autre">, TemplateStep[]> = {
  renovation: [
    { titre: "Préparation chantier" },
    { titre: "Dépose / démolition", poids: 2 },
    { titre: "Réseaux plomberie / électricité", poids: 2 },
    { titre: "Isolation / placo", poids: 2 },
    { titre: "Sols / carrelage", poids: 2 },
    { titre: "Peinture / finitions" },
    { titre: "Nettoyage" },
    { titre: "Réception chantier" },
  ],
  maison_neuve: [
    { titre: "Terrassement", poids: 2 },
    { titre: "Fondations", poids: 2 },
    { titre: "Élévation murs", poids: 2 },
    { titre: "Charpente / couverture", poids: 2 },
    { titre: "Menuiseries extérieures" },
    { titre: "Réseaux techniques", poids: 2 },
    { titre: "Isolation / doublage", poids: 2 },
    { titre: "Cloisons" },
    { titre: "Sols" },
    { titre: "Peinture / finitions" },
    { titre: "Réception chantier" },
  ],
  extension: [
    { titre: "Préparation chantier" },
    { titre: "Terrassement / fondations", poids: 2 },
    { titre: "Maçonnerie / structure", poids: 2 },
    { titre: "Charpente / couverture", poids: 2 },
    { titre: "Menuiseries" },
    { titre: "Réseaux techniques", poids: 2 },
    { titre: "Isolation / finitions", poids: 2 },
    { titre: "Réception chantier" },
  ],
  salle_de_bain: [
    { titre: "Dépose existant" },
    { titre: "Plomberie", poids: 2 },
    { titre: "Électricité" },
    { titre: "Support / placo" },
    { titre: "Étanchéité", poids: 2 },
    { titre: "Carrelage / faïence", poids: 2 },
    { titre: "Pose sanitaires" },
    { titre: "Finitions" },
    { titre: "Réception" },
  ],
  cuisine: [
    { titre: "Dépose ancienne cuisine" },
    { titre: "Préparation murs / sols" },
    { titre: "Électricité" },
    { titre: "Plomberie" },
    { titre: "Pose meubles", poids: 2 },
    { titre: "Pose plan de travail", poids: 2 },
    { titre: "Raccordements" },
    { titre: "Finitions" },
    { titre: "Réception" },
  ],
};

export const TYPES_CHANTIER: TypeChantier[] = [
  "renovation",
  "maison_neuve",
  "extension",
  "salle_de_bain",
  "cuisine",
  "autre",
];

export function createEtapesForType(type: TypeChantier): EtapeChantier[] {
  if (type === "autre") return [];

  return CHANTIER_TEMPLATES[type].map((etape) => ({
    id: generateId(),
    titre: etape.titre,
    fait: false,
    poids: etape.poids ?? 1,
  }));
}

export function inferChantierType(chantier: Chantier): TypeChantier {
  if (chantier.type) return chantier.type;

  const text = `${chantier.nom} ${chantier.adresse}`.toLowerCase();
  if (text.includes("sdb") || text.includes("salle de bain")) {
    return "salle_de_bain";
  }
  if (text.includes("cuisine")) return "cuisine";
  if (text.includes("maison neuve") || text.includes("construction")) {
    return "maison_neuve";
  }
  if (text.includes("extension") || text.includes("garage")) {
    return "extension";
  }

  return "renovation";
}

export function getChantierTypeLabel(chantier: Chantier) {
  if (chantier.type === "autre" && chantier.typePersonnalise?.trim()) {
    return chantier.typePersonnalise.trim();
  }

  return TYPE_CHANTIER_LABELS[inferChantierType(chantier)];
}

export function getChantierEtapes(chantier: Chantier): EtapeChantier[] {
  if (chantier.etapes?.length) {
    return chantier.etapes;
  }

  return createEtapesForType(inferChantierType(chantier));
}

export function calculateChantierAvancement(etapes: EtapeChantier[]) {
  const totalPoids = etapes.reduce((total, etape) => total + etape.poids, 0);
  if (totalPoids <= 0) return 0;

  const poidsFait = etapes
    .filter((etape) => etape.fait)
    .reduce((total, etape) => total + etape.poids, 0);

  return Math.round((poidsFait / totalPoids) * 100);
}
