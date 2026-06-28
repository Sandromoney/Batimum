import { devisTotal } from "./data";
import { calculateMontantTTC } from "./devis";
import { computeDevisTvaRecap } from "./devis-tva";
import type {
  Chantier,
  Devis,
  Facture,
  FactureDeduction,
  TypeFacture,
} from "./types";

export const TYPE_FACTURE_LABELS: Record<TypeFacture, string> = {
  classique: "Facture classique",
  acompte: "Facture d'acompte",
  situation: "Facture de situation",
  solde: "Facture de solde",
};

export const TYPES_FACTURE: TypeFacture[] = [
  "classique",
  "acompte",
  "situation",
  "solde",
];

export function normalizeTypeFacture(type?: TypeFacture): TypeFacture {
  if (
    type === "acompte" ||
    type === "situation" ||
    type === "solde" ||
    type === "classique"
  ) {
    return type;
  }
  return "classique";
}

export function getFactureDevisLieId(facture: Pick<Facture, "devisLieId" | "devisSourceId">) {
  return facture.devisLieId ?? facture.devisSourceId;
}

export function getFactureChantierLieId(
  facture: Pick<Facture, "chantierLieId" | "chantierId">,
) {
  return facture.chantierLieId ?? facture.chantierId;
}

export function getMontantFactureTTC(facture: Pick<Facture, "montant" | "montantTTC">) {
  return facture.montantTTC ?? facture.montant;
}

export function resolveDevisTotalTTC(devis: Devis, defaultTva = 0): number {
  const lignes = Array.isArray(devis.lignes) ? devis.lignes : [];
  if (lignes.length > 0) {
    return computeDevisTvaRecap({ ...devis, lignes }, defaultTva).totalTTC;
  }
  const montantHT = devis.montantHT ?? devisTotal(devis);
  const tauxTVA = devis.tauxTVA ?? defaultTva;
  return devis.montantTTC ?? calculateMontantTTC(montantHT, tauxTVA);
}

export function resolveTotalProjetTTC(
  devis: Devis | undefined,
  chantier: Chantier | undefined,
  defaultTva = 0,
): number {
  if (devis) return resolveDevisTotalTTC(devis, defaultTva);
  if (chantier && chantier.budget > 0) return chantier.budget;
  return 0;
}

export function getFacturesLiees(
  factures: Facture[],
  opts: { devisId?: string; chantierId?: string; excludeId?: string },
): Facture[] {
  return factures.filter((facture) => {
    if (opts.excludeId && facture.id === opts.excludeId) return false;
    const devisLie = getFactureDevisLieId(facture);
    const chantierLie = getFactureChantierLieId(facture);
    if (opts.devisId && devisLie === opts.devisId) return true;
    if (opts.chantierId && chantierLie === opts.chantierId) return true;
    return false;
  });
}

export function findFactureClassiqueByDevisId(
  factures: Facture[],
  devisId: string,
): Facture | undefined {
  return factures.find(
    (facture) =>
      getFactureDevisLieId(facture) === devisId &&
      normalizeTypeFacture(facture.typeFacture) === "classique",
  );
}

export type ProgressiveBillingContext = {
  totalDevisTTC: number;
  montantDejaFacture: number;
  montantAcomptes: number;
  montantSituations: number;
  montantClassique: number;
  montantSoldes: number;
  resteAFacturer: number;
  deductions: FactureDeduction[];
};

export const BILLING_EXCEEDS_RESTE_MESSAGE =
  "Le montant dépasse le restant à facturer.";

const MONTANT_TOLERANCE = 0.01;

export function exceedsResteAFacturer(
  montant: number,
  resteAFacturer: number,
): boolean {
  return montant > resteAFacturer + MONTANT_TOLERANCE;
}

export function getDevisPourcentageDejaFacture(
  totalProjetTTC: number,
  montantDejaFacture: number,
): number {
  if (totalProjetTTC <= 0) return 0;
  return Math.min(
    100,
    Math.round((montantDejaFacture / totalProjetTTC) * 1000) / 10,
  );
}

export function validateFactureMontantAgainstDevis(
  montant: number,
  ctx: ProgressiveBillingContext,
): string | null {
  if (!(montant > 0)) {
    return "Le montant doit être supérieur à 0.";
  }
  if (exceedsResteAFacturer(montant, ctx.resteAFacturer)) {
    return BILLING_EXCEEDS_RESTE_MESSAGE;
  }
  return null;
}

export function validateSituationPourcentageAvancement(
  pourcentageAvancement: number,
  ctx: ProgressiveBillingContext,
): string | null {
  const deja = getDevisPourcentageDejaFacture(
    ctx.totalDevisTTC,
    ctx.montantDejaFacture,
  );
  if (pourcentageAvancement > 100 + MONTANT_TOLERANCE) {
    return "Impossible de dépasser 100 % sur le devis.";
  }
  if (pourcentageAvancement < deja - MONTANT_TOLERANCE) {
    return `L'avancement ne peut pas être inférieur au déjà facturé (${deja} %).`;
  }
  return null;
}

export function buildProgressiveBillingContext(
  factures: Facture[],
  opts: {
    devisId?: string;
    chantierId?: string;
    totalProjetTTC: number;
    excludeFactureId?: string;
  },
): ProgressiveBillingContext {
  const liees = getFacturesLiees(factures, {
    devisId: opts.devisId,
    chantierId: opts.chantierId,
    excludeId: opts.excludeFactureId,
  });

  let montantAcomptes = 0;
  let montantSituations = 0;
  let montantClassique = 0;
  let montantSoldes = 0;

  for (const facture of liees) {
    const type = normalizeTypeFacture(facture.typeFacture);
    const montant = getMontantFactureTTC(facture);
    switch (type) {
      case "acompte":
        montantAcomptes += montant;
        break;
      case "situation":
        montantSituations += montant;
        break;
      case "classique":
        montantClassique += montant;
        break;
      case "solde":
        montantSoldes += montant;
        break;
      default:
        montantClassique += montant;
        break;
    }
  }

  const montantDejaFacture =
    montantAcomptes + montantSituations + montantClassique + montantSoldes;

  const deductions: FactureDeduction[] = liees
    .filter((facture) => {
      const type = normalizeTypeFacture(facture.typeFacture);
      return type === "acompte" || type === "situation";
    })
    .map((facture) => ({
      factureId: facture.id,
      numero: facture.numero,
      montant: getMontantFactureTTC(facture),
      typeFacture: normalizeTypeFacture(facture.typeFacture),
    }));

  return {
    totalDevisTTC: opts.totalProjetTTC,
    montantDejaFacture,
    montantAcomptes,
    montantSituations,
    montantClassique,
    montantSoldes,
    resteAFacturer: Math.max(0, opts.totalProjetTTC - montantDejaFacture),
    deductions,
  };
}

export function computeAcompteMontant(
  totalProjetTTC: number,
  mode: "montant" | "pourcentage",
  valeur: number,
): number {
  if (mode === "pourcentage") {
    return Math.round(totalProjetTTC * (valeur / 100) * 100) / 100;
  }
  return Math.round(valeur * 100) / 100;
}

/** Montant de la situation = part cumulée au % visé − déjà facturé (acomptes + situations). */
export function computeSituationMontant(
  totalProjetTTC: number,
  pourcentageAvancement: number,
  montantDejaFacture: number,
): number {
  const cible =
    Math.round(totalProjetTTC * (pourcentageAvancement / 100) * 100) / 100;
  return Math.max(0, Math.round((cible - montantDejaFacture) * 100) / 100);
}

export function applyProgressiveFactureFields(
  facture: Facture,
  ctx: ProgressiveBillingContext | null,
  totalProjetTTC: number,
): Facture {
  const type = normalizeTypeFacture(facture.typeFacture);
  const base: Facture = {
    ...facture,
    typeFacture: type,
    totalDevisTTC: totalProjetTTC,
  };

  if (!ctx) return base;

  const withContext: Facture = {
    ...base,
    montantDejaFacture: ctx.montantDejaFacture,
    resteAFacturer: ctx.resteAFacturer,
    deductions: ctx.deductions,
    totalAcomptesDeduits: ctx.montantAcomptes,
    totalSituationsDeduits: ctx.montantSituations,
  };

  switch (type) {
    case "acompte": {
      const mode = facture.acompteMode ?? "pourcentage";
      const valeur = facture.acompteValeur ?? 30;
      const montant = computeAcompteMontant(totalProjetTTC, mode, valeur);
      return {
        ...withContext,
        acompteMode: mode,
        acompteValeur: valeur,
        montant,
        montantTTC: montant,
      };
    }
    case "situation": {
      const mode = facture.situationMode ?? "pourcentage";
      let totalSituation = 0;

      if (mode === "montant") {
        totalSituation = Math.max(
          0,
          Math.round((facture.situationMontantLibre ?? 0) * 100) / 100,
        );
      } else if (mode === "quantite") {
        const pourcentage = facture.situationQuantitePourcentage ?? 0;
        totalSituation = computeSituationMontant(
          totalProjetTTC,
          pourcentage,
          ctx.montantDejaFacture,
        );
      } else {
        const pourcentage = facture.pourcentageAvancement ?? 0;
        totalSituation = computeSituationMontant(
          totalProjetTTC,
          pourcentage,
          ctx.montantDejaFacture,
        );
      }

      return {
        ...withContext,
        situationMode: mode,
        pourcentageAvancement: facture.pourcentageAvancement,
        situationQuantitePourcentage: facture.situationQuantitePourcentage,
        situationMontantLibre: facture.situationMontantLibre,
        totalSituation,
        montant: totalSituation,
        montantTTC: totalSituation,
      };
    }
    case "solde": {
      const resteAPayer = Math.max(0, ctx.resteAFacturer);
      return {
        ...withContext,
        resteAPayer,
        montant: resteAPayer,
        montantTTC: resteAPayer,
      };
    }
    default:
      return withContext;
  }
}

export type CreateFactureResult =
  | { ok: true; facture: Facture }
  | { ok: false; error: string };

export function finalizeProgressiveFactureCreation(
  facture: Facture | null,
  ctx: ProgressiveBillingContext,
  options?: {
    situationPourcentage?: number;
    ligneSituationError?: string | null;
  },
): CreateFactureResult {
  if (options?.ligneSituationError) {
    return { ok: false, error: options.ligneSituationError };
  }

  if (!facture) {
    return { ok: false, error: "Impossible de créer la facture." };
  }

  const montant = getMontantFactureTTC(facture);
  const type = normalizeTypeFacture(facture.typeFacture);

  if (type === "situation") {
    const mode = facture.situationMode ?? "pourcentage";
    if (mode === "pourcentage" || mode === "quantite") {
      const pourcentage =
        mode === "quantite"
          ? (facture.situationQuantitePourcentage ?? 0)
          : (facture.pourcentageAvancement ?? 0);
      const pctError = validateSituationPourcentageAvancement(
        pourcentage,
        ctx,
      );
      if (pctError) return { ok: false, error: pctError };
    }
  }

  const montantError = validateFactureMontantAgainstDevis(montant, ctx);
  if (montantError) return { ok: false, error: montantError };

  return { ok: true, facture };
}
