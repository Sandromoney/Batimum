import type { LigneDevis } from "@/lib/types";
import { generateId } from "@/lib/utils";

export const DEFAULT_DEVIS_SECTION_TITLE = "PARTIE ...";

export function isSectionLigne(ligne: LigneDevis): boolean {
  return ligne.typeLigne === "section";
}

export function getLigneDesignation(ligne: LigneDevis): string {
  if (ligne.designation != null && ligne.designation !== "") return ligne.designation;
  const parts = ligne.description?.split("\n") ?? [];
  return parts[0] ?? "";
}

export function getLigneDescriptionCourte(ligne: LigneDevis): string {
  if (ligne.descriptionCourte != null && ligne.descriptionCourte !== "") {
    return ligne.descriptionCourte;
  }
  const parts = ligne.description?.split("\n") ?? [];
  return parts.length > 1 ? parts.slice(1).join("\n") : "";
}

export function combineLigneDescriptionText(
  designation: string,
  descriptionCourte: string,
): string {
  const hasDesignation = designation.trim().length > 0;
  const hasCourte = descriptionCourte.trim().length > 0;
  if (!hasDesignation && !hasCourte) return "";
  if (!hasCourte) return designation;
  if (!hasDesignation) return descriptionCourte;
  return `${designation}\n${descriptionCourte}`;
}

export function syncLigneDescription(ligne: LigneDevis): LigneDevis {
  if (isSectionLigne(ligne)) {
    const designation = ligne.designation ?? ligne.description ?? "";
    return { ...ligne, description: designation };
  }

  const designation = ligne.designation ?? "";
  const courte = ligne.descriptionCourte ?? "";
  return {
    ...ligne,
    description: combineLigneDescriptionText(designation, courte),
  };
}

export function patchLigneFields(
  ligne: LigneDevis,
  patch: Partial<LigneDevis>,
): LigneDevis {
  return syncLigneDescription({ ...ligne, ...patch });
}

export function isEmptyLigneDevis(ligne: LigneDevis): boolean {
  if (isSectionLigne(ligne)) {
    return !getLigneDesignation(ligne).trim();
  }
  return (
    !getLigneDesignation(ligne).trim() &&
    !getLigneDescriptionCourte(ligne).trim() &&
    Number(ligne.prixUnitaire) === 0
  );
}

export function createEmptyLigneDevis(defaultTva: number): LigneDevis {
  return {
    id: "",
    description: "",
    designation: "",
    quantite: 1,
    unite: "u",
    prixUnitaire: 0,
    tauxTVA: defaultTva,
    typeLigne: "ligne",
  };
}

export function createSectionLigne(
  title: string = DEFAULT_DEVIS_SECTION_TITLE,
): LigneDevis {
  return {
    id: generateId(),
    description: title,
    designation: title,
    quantite: 0,
    unite: "",
    prixUnitaire: 0,
    typeLigne: "section",
  };
}

export function hasSectionLigne(lignes: LigneDevis[]): boolean {
  return lignes.some((ligne) => isSectionLigne(ligne));
}

export function ensureLeadingSectionLigne(lignes: LigneDevis[]): LigneDevis[] {
  if (hasSectionLigne(lignes)) return lignes;
  return [createSectionLigne(), ...lignes];
}

export function getLignePdfLabel(ligne: LigneDevis): string {
  return getLignePdfDescription(ligne);
}

export function getLignePdfDescription(ligne: LigneDevis): string {
  if (isSectionLigne(ligne)) {
    return getLigneDesignation(ligne);
  }
  return combineLigneDescriptionText(
    getLigneDesignation(ligne),
    getLigneDescriptionCourte(ligne),
  );
}

export function splitDevisPdfDescription(
  doc: { splitTextToSize: (text: string, maxWidth: number) => string[] },
  text: string,
  maxWidth: number,
): string[] {
  const normalized = text || "-";
  return normalized.split("\n").flatMap((paragraph) => {
    if (paragraph === "") return [""];
    return doc.splitTextToSize(paragraph, maxWidth);
  });
}
