import { getClientDisplayName } from "@/lib/clients";
import { getDevisDisplayStatut } from "@/lib/devis-statut";
import { getFactureDisplayStatut, isFacturePayee } from "@/lib/facture-statut";
import { getDueFactureRelanceNiveaux } from "@/lib/facture-relances-auto";
import { buildDataFingerprint, getCachedValue } from "@/lib/insights-cache";
import {
  buildChantiersRentabilite,
  computeMonthlyPilotageKpis,
} from "@/lib/pilotage/calculations";
import { computeEmployePerformance } from "@/lib/pilotage/analytics";
import { calculateSaasMetrics } from "@/lib/saas-calculations";
import type { AppData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export type BatimumInsightTone = "alert" | "info" | "success" | "neutral";

export type BatimumInsightCard = {
  id: string;
  tone: BatimumInsightTone;
  title: string;
  description?: string;
  href?: string;
  priority: number;
};

export type BatimumPilotageSynthese = {
  greetingName: string;
  lines: string[];
  hasAlerts: boolean;
};

function todayISO(referenceDate = new Date()) {
  return referenceDate.toISOString().slice(0, 10);
}

function addDaysISO(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthKey(referenceDate: Date) {
  return `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
}

function countDevisARelancer(data: AppData) {
  return data.devis.filter((devis) => {
    const statut = getDevisDisplayStatut(devis);
    return ["envoye", "en_attente", "en_retard"].includes(statut);
  });
}

function countFacturesEcheanceDemain(data: AppData, tomorrow: string) {
  return data.factures.filter(
    (facture) =>
      !isFacturePayee(facture) &&
      facture.dateEcheance === tomorrow,
  );
}

function getChantiersBudgetDepasse(data: AppData) {
  return buildChantiersRentabilite(data).filter(
    (item) =>
      item.rentabilite.ecartCoutTotal > 0 &&
      item.rentabilite.fiabilite !== "non_calculable",
  );
}

function getMeilleurChantierDuMois(data: AppData, referenceDate: Date) {
  const kpis = computeMonthlyPilotageKpis(data, referenceDate);
  const top = kpis.plusRentables[0];
  if (!top || top.rentabilite.margeReelle <= 0) return null;
  return top;
}

function getEmployeLePlusRentable(data: AppData) {
  const performances = computeEmployePerformance(data).filter(
    (row) => row.heuresTravaillees > 0,
  );
  if (performances.length === 0) return null;

  return [...performances].sort((a, b) => {
    const scoreA =
      a.chantiersRentables * 100 -
      a.chantiersNonRentables * 50 +
      (a.heuresPrevuesSurChantiers > 0
        ? (a.heuresPrevuesSurChantiers - a.heuresTravaillees) /
          a.heuresPrevuesSurChantiers
        : 0);
    const scoreB =
      b.chantiersRentables * 100 -
      b.chantiersNonRentables * 50 +
      (b.heuresPrevuesSurChantiers > 0
        ? (b.heuresPrevuesSurChantiers - b.heuresTravaillees) /
          b.heuresPrevuesSurChantiers
        : 0);
    return scoreB - scoreA;
  })[0];
}

function computeCaProgressionPct(data: AppData, referenceDate: Date) {
  const metrics = calculateSaasMetrics(data, referenceDate);
  const objectif = data.parametres.objectifCaMensuel ?? 15000;
  if (objectif <= 0) return null;
  return Math.min(
    100,
    Math.round((metrics.chiffreAffairesMensuel / objectif) * 100),
  );
}

function computeCaEvolutionPct(data: AppData, referenceDate: Date) {
  const metrics = calculateSaasMetrics(data, referenceDate);
  const prevMonth = new Date(referenceDate);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const prevMetrics = calculateSaasMetrics(data, prevMonth);
  if (prevMetrics.chiffreAffairesMensuel <= 0) return null;
  return Math.round(
    ((metrics.chiffreAffairesMensuel - prevMetrics.chiffreAffairesMensuel) /
      prevMetrics.chiffreAffairesMensuel) *
      100,
  );
}

function sumFacturesImpayees(data: AppData) {
  return data.factures
    .filter((facture) => !isFacturePayee(facture))
    .reduce((sum, facture) => sum + (facture.montantTTC ?? 0), 0);
}

export function buildTodayInsightCards(
  data: AppData,
  referenceDate = new Date(),
): BatimumInsightCard[] {
  const fingerprint = buildDataFingerprint([
    data.devis.length,
    data.factures.length,
    data.chantiers.length,
    data.clients.length,
    data.planning.length,
    monthKey(referenceDate),
    todayISO(referenceDate),
  ]);

  return getCachedValue("today-insights", fingerprint, () => {
    const today = todayISO(referenceDate);
    const tomorrow = addDaysISO(today, 1);
    const cards: BatimumInsightCard[] = [];

    const devisARelancer = countDevisARelancer(data);
    if (devisARelancer.length > 0) {
      cards.push({
        id: "devis-relancer",
        tone: "alert",
        title: `${devisARelancer.length} devis à relancer`,
        description: "En attente de réponse client",
        href: "/devis",
        priority: 10,
      });
    }

    const facturesDemain = countFacturesEcheanceDemain(data, tomorrow);
    if (facturesDemain.length > 0) {
      const first = facturesDemain[0];
      const client = data.clients.find((c) => c.id === first.clientId);
      cards.push({
        id: "facture-echeance-demain",
        tone: "alert",
        title: `${facturesDemain.length} facture${facturesDemain.length > 1 ? "s" : ""} arrive${facturesDemain.length > 1 ? "nt" : ""} à échéance demain`,
        description: client
          ? `${first.numero} — ${getClientDisplayName(client)}`
          : first.numero,
        href: "/factures",
        priority: 15,
      });
    }

    const budgetDepasse = getChantiersBudgetDepasse(data);
    if (budgetDepasse.length > 0) {
      const worst = [...budgetDepasse].sort(
        (a, b) => b.rentabilite.ecartCoutTotal - a.rentabilite.ecartCoutTotal,
      )[0];
      cards.push({
        id: "chantier-budget",
        tone: "alert",
        title: `${budgetDepasse.length} chantier${budgetDepasse.length > 1 ? "s" : ""} dépasse${budgetDepasse.length > 1 ? "nt" : ""} le budget prévu`,
        description: `${worst.chantier.nom} (+${formatCurrency(worst.rentabilite.ecartCoutTotal)})`,
        href: `/chantiers/${worst.chantier.id}`,
        priority: 20,
      });
    }

    const meilleurChantier = getMeilleurChantierDuMois(data, referenceDate);
    if (meilleurChantier) {
      cards.push({
        id: "meilleur-chantier",
        tone: "success",
        title: `Votre meilleur chantier du mois : ${meilleurChantier.chantier.nom}`,
        description: `Marge ${formatCurrency(meilleurChantier.rentabilite.margeReelle)} (${meilleurChantier.rentabilite.tauxMargeReelle.toFixed(0)} %)`,
        href: `/chantiers/${meilleurChantier.chantier.id}`,
        priority: 40,
      });
    }

    const employeTop = getEmployeLePlusRentable(data);
    if (employeTop) {
      cards.push({
        id: "employe-rentable",
        tone: "success",
        title: `Votre salarié le plus rentable : ${employeTop.employe.prenom} ${employeTop.employe.nom}`,
        description: `${employeTop.chantiersRentables} chantier${employeTop.chantiersRentables > 1 ? "s" : ""} rentable${employeTop.chantiersRentables > 1 ? "s" : ""}`,
        href: "/pilotage",
        priority: 45,
      });
    }

    const caPct = computeCaProgressionPct(data, referenceDate);
    if (caPct !== null && caPct > 0) {
      cards.push({
        id: "objectif-ca",
        tone: caPct >= 80 ? "success" : "info",
        title: `Vous avez atteint ${caPct} % de votre objectif mensuel`,
        description: `Objectif ${formatCurrency(data.parametres.objectifCaMensuel ?? 15000)}`,
        href: "/dashboard",
        priority: 50,
      });
    }

    const relances = data.factures.reduce((total, facture) => {
      return total + getDueFactureRelanceNiveaux(facture, data.parametres, today).length;
    }, 0);
    if (relances > 0) {
      cards.push({
        id: "relances-factures",
        tone: "info",
        title: `${relances} relance${relances > 1 ? "s" : ""} de facture à envoyer`,
        href: "/factures",
        priority: 25,
      });
    }

    const chantiersRetard = data.chantiers.filter((c) =>
      ["en_retard", "retard_demarrage"].includes(c.statut),
    );
    if (chantiersRetard.length > 0) {
      cards.push({
        id: "chantiers-retard",
        tone: "alert",
        title: `${chantiersRetard.length} chantier${chantiersRetard.length > 1 ? "s" : ""} en retard`,
        href: "/chantiers",
        priority: 12,
      });
    }

    if (cards.length === 0) {
      cards.push({
        id: "all-clear",
        tone: "neutral",
        title: "Aucun problème détecté aujourd'hui",
        description: "Votre activité est sous contrôle",
        priority: 100,
      });
    }

    return cards.sort((a, b) => a.priority - b.priority);
  });
}

export function buildPilotageSynthese(
  data: AppData,
  referenceDate = new Date(),
): BatimumPilotageSynthese {
  const fingerprint = buildDataFingerprint([
    data.devis.length,
    data.factures.length,
    data.chantiers.length,
    data.employes.length,
    monthKey(referenceDate),
    todayISO(referenceDate),
  ]);

  return getCachedValue("pilotage-synthese", fingerprint, () => {
    const today = todayISO(referenceDate);
    const greetingName =
      data.parametres.utilisateur?.trim().split(/\s+/)[0] || "vous";
    const lines: string[] = [];

    const devisARelancer = countDevisARelancer(data);
    if (devisARelancer.length > 0) {
      lines.push(
        `${devisARelancer.length} devis ${devisARelancer.length > 1 ? "sont" : "est"} à relancer.`,
      );
    }

    const caEvolution = computeCaEvolutionPct(data, referenceDate);
    if (caEvolution !== null && caEvolution !== 0) {
      lines.push(
        `Votre CA ${caEvolution > 0 ? "progresse" : "recule"} de ${Math.abs(caEvolution)} %.`,
      );
    }

    const budgetDepasse = getChantiersBudgetDepasse(data);
    if (budgetDepasse.length > 0) {
      const worst = [...budgetDepasse].sort(
        (a, b) => b.rentabilite.ecartTempsHeures - a.rentabilite.ecartTempsHeures,
      )[0];
      if (worst.rentabilite.ecartTempsHeures > 0) {
        lines.push(
          `Le chantier ${worst.chantier.nom} dépasse le temps prévu de ${worst.rentabilite.ecartTempsHeures.toFixed(1)} h.`,
        );
      } else {
        lines.push(
          `Le chantier ${worst.chantier.nom} dépasse le budget prévu de ${formatCurrency(worst.rentabilite.ecartCoutTotal)}.`,
        );
      }
    }

    const employeTop = getEmployeLePlusRentable(data);
    if (employeTop) {
      lines.push(
        `Votre salarié ${employeTop.employe.prenom} est actuellement le plus rentable.`,
      );
    }

    const impayees = sumFacturesImpayees(data);
    if (impayees > 0) {
      lines.push(
        `Vos factures impayées représentent ${formatCurrency(impayees)}.`,
      );
    }

    const caPct = computeCaProgressionPct(data, referenceDate);
    if (caPct !== null) {
      lines.push(`Objectif mensuel atteint à ${caPct} %.`);
    }

    if (lines.length === 0) {
      lines.push("Aucune alerte prioritaire — continuez sur cette lancée.");
    }

    return {
      greetingName,
      lines,
      hasAlerts: lines.some((line) => !line.includes("Aucune alerte")),
    };
  });
}
