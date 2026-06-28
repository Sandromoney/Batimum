import { getLigneDesignation, isSectionLigne } from "@/lib/devis-lignes";
import {
  ligneMontantHT,
  ligneMontantTVA,
} from "@/lib/devis-tva";
import type { LigneDevis } from "@/lib/types";

export type SectionSubtotal = {
  sectionId: string;
  sectionTitle: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeSectionSubtotal(
  lignes: LigneDevis[],
  defaultTva: number,
): Pick<SectionSubtotal, "totalHT" | "totalTVA" | "totalTTC"> {
  let totalHT = 0;
  let totalTVA = 0;

  for (const ligne of lignes) {
    if (isSectionLigne(ligne)) continue;
    const ht = ligneMontantHT(ligne);
    totalHT += ht;
    totalTVA += ligneMontantTVA(ligne, defaultTva);
  }

  totalHT = round2(totalHT);
  totalTVA = round2(totalTVA);

  return {
    totalHT,
    totalTVA,
    totalTTC: round2(totalHT + totalTVA),
  };
}

/** Index de ligne après lequel afficher le sous-total de section. */
export function getSectionSubtotalsAfterIndex(
  lignes: LigneDevis[],
  defaultTva: number,
): Map<number, SectionSubtotal> {
  const result = new Map<number, SectionSubtotal>();
  let currentSection: LigneDevis | null = null;
  let sectionLignes: LigneDevis[] = [];
  let sectionEndIndex = -1;

  const commit = () => {
    if (!currentSection || sectionLignes.length === 0) return;

    result.set(sectionEndIndex, {
      sectionId: currentSection.id,
      sectionTitle: getLigneDesignation(currentSection).trim() || "Section",
      ...computeSectionSubtotal(sectionLignes, defaultTva),
    });
  };

  lignes.forEach((ligne, index) => {
    if (isSectionLigne(ligne)) {
      commit();
      currentSection = ligne;
      sectionLignes = [];
      return;
    }

    if (currentSection) {
      sectionLignes.push(ligne);
      sectionEndIndex = index;
    }
  });

  commit();
  return result;
}

export function formatSectionSubtotalLabel(
  sectionTitle: string,
  totalHT: number,
  formatCurrency: (amount: number) => string,
): string {
  return `Sous-total ${sectionTitle} : ${formatCurrency(totalHT)} HT`;
}
