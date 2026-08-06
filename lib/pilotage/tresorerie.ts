/**
 * Trésorerie Pilotage — uniquement à partir des données Batimum présentes
 * (factures, devis, achats chantier) + dépenses Pilotage saisies/importées.
 */
import { getChantierAchats } from "@/lib/chantier-marge";
import type { PilotageDepense } from "@/lib/pilotage/depenses";
import type { AppData, Devis, Facture } from "@/lib/types";

export type PilotageTresoreriePoint = {
  label: string;
  date: string;
  solde: number;
  recettes: number;
  depenses: number;
};

export type PilotageTresorerieModel = {
  tresorerieActuelle: number;
  depensesTotalHT: number;
  depensesTotalTTC: number;
  recettesPrevuesHT: number;
  recettesPrevuesTTC: number;
  margePrevisionnelleHT: number;
  previsionFinHorizon: number;
  points: PilotageTresoreriePoint[];
  depensesDetail: Array<{
    id: string;
    label: string;
    fournisseur: string;
    date: string;
    montantHT: number;
    montantTTC: number;
    source: "chantier" | "pilotage";
  }>;
  recettesDetail: Array<{
    id: string;
    label: string;
    date: string;
    montantHT: number;
    montantTTC: number;
    kind: "facture" | "devis";
  }>;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function factureHT(facture: Facture): number {
  if (typeof facture.montantHT === "number") return facture.montantHT;
  if (facture.lignes?.length) {
    return facture.lignes.reduce(
      (sum, ligne) => sum + ligne.quantite * ligne.prixUnitaire,
      0,
    );
  }
  const ttc =
    typeof facture.montantTTC === "number" ? facture.montantTTC : facture.montant;
  const taux = facture.tauxTVA ?? 20;
  return taux > 0 ? ttc / (1 + taux / 100) : ttc;
}

function factureTTC(facture: Facture): number {
  if (typeof facture.montantTTC === "number") return facture.montantTTC;
  if (typeof facture.montant === "number") return facture.montant;
  const ht = factureHT(facture);
  const taux = facture.tauxTVA ?? 20;
  return ht * (1 + taux / 100);
}

function devisHT(devis: Devis): number {
  return typeof devis.montantHT === "number" ? devis.montantHT : 0;
}

function devisTTC(devis: Devis): number {
  if (typeof devis.montantTTC === "number") return devis.montantTTC;
  return devisHT(devis);
}

function isFacturePayee(facture: Facture): boolean {
  return facture.statut === "payee";
}

function isFactureOuverte(facture: Facture): boolean {
  return (
    facture.statut === "envoyee" ||
    facture.statut === "en_attente" ||
    facture.statut === "en_retard"
  );
}

function isDevisSigne(devis: Devis): boolean {
  return devis.statut === "signe" || devis.statut === "accepte";
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeekLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function buildPilotageTresorerie(
  data: AppData,
  depensesPilotage: PilotageDepense[],
  options?: { referenceDate?: Date; horizonWeeks?: number },
): PilotageTresorerieModel {
  const reference = options?.referenceDate ?? new Date();
  const today = reference.toISOString().slice(0, 10);
  const horizonWeeks = options?.horizonWeeks ?? 8;

  const factures = data.factures ?? [];
  const devis = data.devis ?? [];
  const chantiers = data.chantiers ?? [];

  const encaissesTTC = factures
    .filter(isFacturePayee)
    .reduce((sum, item) => sum + factureTTC(item), 0);

  const depensesDetail: PilotageTresorerieModel["depensesDetail"] = [];

  for (const chantier of chantiers) {
    for (const achat of getChantierAchats(chantier)) {
      const ht = achat.montantHT ?? 0;
      const ttc = round2(ht * (1 + (achat.tauxTVA ?? 0) / 100));
      depensesDetail.push({
        id: `achat-${achat.id}`,
        label: achat.libelle || chantier.nom,
        fournisseur: achat.fournisseur || "—",
        date: achat.date || chantier.dateDebut,
        montantHT: round2(ht),
        montantTTC: ttc,
        source: "chantier",
      });
    }
  }

  for (const depense of depensesPilotage) {
    depensesDetail.push({
      id: depense.id,
      label: depense.libelle || "Dépense",
      fournisseur: depense.fournisseur || "—",
      date: depense.date,
      montantHT: depense.montantHT,
      montantTTC: depense.montantTTC,
      source: "pilotage",
    });
  }

  depensesDetail.sort((a, b) => b.date.localeCompare(a.date));

  const depensesTotalHT = round2(
    depensesDetail.reduce((sum, item) => sum + item.montantHT, 0),
  );
  const depensesTotalTTC = round2(
    depensesDetail.reduce((sum, item) => sum + item.montantTTC, 0),
  );

  const tresorerieActuelle = round2(encaissesTTC - depensesTotalTTC);

  const devisDejaFactures = new Set(
    factures
      .flatMap((item) => [item.devisSourceId, item.devisLieId])
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const recettesDetail: PilotageTresorerieModel["recettesDetail"] = [];

  for (const facture of factures.filter(isFactureOuverte)) {
    recettesDetail.push({
      id: `fac-${facture.id}`,
      label: `Facture ${facture.numero}`,
      date: facture.dateEcheance || facture.dateEmission,
      montantHT: round2(factureHT(facture)),
      montantTTC: round2(factureTTC(facture)),
      kind: "facture",
    });
  }

  for (const item of devis.filter(isDevisSigne)) {
    if (devisDejaFactures.has(item.id)) continue;
    recettesDetail.push({
      id: `dev-${item.id}`,
      label: `Devis ${item.numero}`,
      date: item.date || item.dateCreation?.slice(0, 10) || today,
      montantHT: round2(devisHT(item)),
      montantTTC: round2(devisTTC(item)),
      kind: "devis",
    });
  }

  recettesDetail.sort((a, b) => a.date.localeCompare(b.date));

  const recettesPrevuesHT = round2(
    recettesDetail.reduce((sum, item) => sum + item.montantHT, 0),
  );
  const recettesPrevuesTTC = round2(
    recettesDetail.reduce((sum, item) => sum + item.montantTTC, 0),
  );

  const margePrevisionnelleHT = round2(recettesPrevuesHT - depensesTotalHT);

  const points: PilotageTresoreriePoint[] = [];
  let solde = tresorerieActuelle;

  for (let week = 0; week < horizonWeeks; week += 1) {
    const weekStart = addDays(today, week * 7);
    const weekEnd = addDays(weekStart, 6);
    const recettes = round2(
      recettesDetail
        .filter((item) => item.date >= weekStart && item.date <= weekEnd)
        .reduce((sum, item) => sum + item.montantTTC, 0),
    );
    // Les dépenses déjà enregistrées sont déjà dans le solde actuel.
    // Pour la prévision, on ne retire que les dépenses futures saisies (date > today).
    const depenses = round2(
      depensesDetail
        .filter((item) => item.date > today && item.date >= weekStart && item.date <= weekEnd)
        .reduce((sum, item) => sum + item.montantTTC, 0),
    );
    solde = round2(solde + recettes - depenses);
    points.push({
      label: startOfWeekLabel(weekStart),
      date: weekStart,
      solde,
      recettes,
      depenses,
    });
  }

  return {
    tresorerieActuelle,
    depensesTotalHT,
    depensesTotalTTC,
    recettesPrevuesHT,
    recettesPrevuesTTC,
    margePrevisionnelleHT,
    previsionFinHorizon: points[points.length - 1]?.solde ?? tresorerieActuelle,
    points,
    depensesDetail,
    recettesDetail,
  };
}
