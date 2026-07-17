import {
  buildComparatifAchats,
  buildComparatifAchatsExportText,
  type ComparatifAchatsResult,
  type ComparatifAchatLigne,
} from "@/lib/comparatif-achats";
import type { Client, Devis, Fournisseur, Parametres } from "@/lib/types";

export type CopiloteAchatLigne = {
  id: string;
  designation: string;
  quantite: number;
  unite?: string;
  famille: ComparatifAchatLigne["famille"];
  fournisseurConseille?: Fournisseur;
  prixPublic?: number;
  prixPublicDate?: string;
  prixRemise?: number;
  remisePourcent?: number;
  coutEstimeEntreprise?: number;
  prixStatus: "available" | "unavailable";
  sourcePrix: ComparatifAchatLigne["comparatifs"][number]["sourcePrix"];
  aVerifier?: boolean;
  scoreFournisseur?: number;
  comparatifs: ComparatifAchatLigne["comparatifs"];
  economiePossible?: number;
  explication?: string;
};

export type CopiloteAchatsResult = Omit<ComparatifAchatsResult, "lignes"> & {
  lignes: CopiloteAchatLigne[];
};

function mapToCopiloteLigne(ligne: ComparatifAchatLigne): CopiloteAchatLigne {
  const best = ligne.meilleurChoix;
  return {
    id: ligne.id,
    designation: ligne.designation,
    quantite: ligne.quantite,
    unite: ligne.unite,
    famille: ligne.famille,
    fournisseurConseille: best?.fournisseur,
    prixPublic: best?.prixPublic,
    prixRemise: best?.prixRemise,
    remisePourcent: best?.remisePourcent,
    coutEstimeEntreprise: best?.coutTotal,
    prixStatus: best?.prixStatus ?? "unavailable",
    sourcePrix: best?.sourcePrix ?? "none",
    aVerifier: best?.aVerifier,
    scoreFournisseur: best?.score,
    comparatifs: ligne.comparatifs,
    economiePossible: ligne.economiePossible,
    explication: ligne.explication,
  };
}

export function buildCopiloteAchats(
  devis: Devis,
  client: Client | undefined,
  parametres: Parametres,
): CopiloteAchatsResult {
  const result = buildComparatifAchats(devis, client, parametres);
  return {
    ...result,
    lignes: result.lignes.map(mapToCopiloteLigne),
  };
}

export function buildCopiloteAchatsExportText(
  devis: Devis,
  client: Client | undefined,
  result: CopiloteAchatsResult,
): string {
  return buildComparatifAchatsExportText(devis, client, result);
}

export {
  buildComparatifAchats,
  buildComparatifAchatsExportText,
} from "@/lib/comparatif-achats";
