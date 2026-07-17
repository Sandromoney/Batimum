import {
  buildChantiersRentabilite,
} from "@/lib/pilotage/calculations";
import {
  chantierHasAchats,
  chantierHasPointages,
} from "@/lib/pilotage/reliability";
import type { AppData } from "@/lib/types";

export type PilotageAlerteIcon =
  | "clock"
  | "trending-up"
  | "briefcase-business"
  | "wrench"
  | "alert-circle"
  | "bar-chart-3"
  | "check-circle";

export type PilotageAlerte = {
  id: string;
  niveau: "info" | "attention" | "positif";
  icone: PilotageAlerteIcon;
  message: string;
};

/** Alertes actionnables uniquement — max 6, les plus importantes d'abord. */
export function generatePilotageAlertes(
  data: AppData,
  referenceDate: Date = new Date(),
): PilotageAlerte[] {
  const alertes: PilotageAlerte[] = [];
  const classements = buildChantiersRentabilite(data);
  const entries = data.chantierTimeEntries ?? [];
  const actifs = new Set(
    data.chantiers
      .filter((c) =>
        ["en_cours", "en_retard", "retard_demarrage"].includes(c.statut),
      )
      .map((c) => c.id),
  );

  const facturesImpayees = data.factures.filter(
    (facture) =>
      facture.statut === "envoyee" ||
      facture.statut === "en_attente" ||
      facture.statut === "en_retard",
  );
  if (facturesImpayees.length > 0) {
    alertes.push({
      id: "factures-impayees",
      niveau: "attention",
      icone: "briefcase-business",
      message: `${facturesImpayees.length} facture${facturesImpayees.length > 1 ? "s" : ""} non réglée${facturesImpayees.length > 1 ? "s" : ""} à relancer.`,
    });
  }

  const devisARelancer = data.devis.filter(
    (devis) =>
      devis.statut === "envoye" ||
      devis.statut === "en_attente" ||
      devis.statut === "en_retard",
  );
  if (devisARelancer.length > 0) {
    alertes.push({
      id: "devis-a-relancer",
      niveau: "attention",
      icone: "briefcase-business",
      message: `${devisARelancer.length} devis à relancer.`,
    });
  }

  for (const chantier of data.chantiers) {
    if (chantier.statut !== "en_retard" && chantier.statut !== "retard_demarrage") {
      continue;
    }
    alertes.push({
      id: `chantier-retard-${chantier.id}`,
      niveau: "attention",
      icone: "alert-circle",
      message: `${chantier.nom} est en retard.`,
    });
  }

  const today = referenceDate.toISOString().slice(0, 10);
  const pointedToday = new Set(
    entries.filter((entry) => entry.date === today).map((entry) => entry.employeId),
  );
  const plannedToday = new Set(
    (data.planning ?? [])
      .filter((event) => event.date === today)
      .flatMap((event) => event.employeIds ?? []),
  );
  for (const employeId of plannedToday) {
    if (pointedToday.has(employeId)) continue;
    const employe = data.employes.find((item) => item.id === employeId);
    if (!employe || employe.statut === "desactive") continue;
    alertes.push({
      id: `employe-sans-pointage-${employeId}`,
      niveau: "attention",
      icone: "clock",
      message: `${employe.prenom} ${employe.nom} : planifié aujourd'hui sans pointage.`,
    });
  }

  for (const item of classements) {
    const { chantier, rentabilite } = item;
    if (!actifs.has(chantier.id) && chantier.statut !== "termine") continue;

    if (
      rentabilite.coutMateriauxPrevu > 0 &&
      rentabilite.achatsReelsHT > rentabilite.coutMateriauxPrevu * 1.12
    ) {
      alertes.push({
        id: `chantier-achats-${chantier.id}`,
        niveau: "attention",
        icone: "wrench",
        message: `Budget dépassé sur ${chantier.nom}.`,
      });
    }

    if (
      rentabilite.tauxMargeReelle < 20 &&
      rentabilite.prixVenteHT > 0 &&
      !rentabilite.rentabiliteIncomplete
    ) {
      alertes.push({
        id: `marge-faible-${chantier.id}`,
        niveau: "attention",
        icone: "trending-up",
        message: `Marge trop faible sur ${chantier.nom} (${Math.round(rentabilite.tauxMargeReelle)} %).`,
      });
    }

    if (
      actifs.has(chantier.id) &&
      !chantierHasAchats(chantier) &&
      rentabilite.prixVenteHT > 0
    ) {
      alertes.push({
        id: `chantier-sans-achat-${chantier.id}`,
        niveau: "attention",
        icone: "wrench",
        message: `Achat manquant sur ${chantier.nom}.`,
      });
    }

    if (
      actifs.has(chantier.id) &&
      rentabilite.tempsPrevuHeures > 0 &&
      rentabilite.ecartTempsHeures >= 3
    ) {
      alertes.push({
        id: `chantier-temps-${chantier.id}`,
        niveau: "attention",
        icone: "clock",
        message: `${chantier.nom} : trop d'heures (+${Math.round(rentabilite.ecartTempsHeures)} h).`,
      });
    }

    if (
      actifs.has(chantier.id) &&
      !chantierHasPointages(chantier.id, entries) &&
      rentabilite.prixVenteHT > 0
    ) {
      alertes.push({
        id: `chantier-sans-pointage-${chantier.id}`,
        niveau: "attention",
        icone: "alert-circle",
        message: `Aucun pointage sur ${chantier.nom}.`,
      });
    }
  }

  return alertes.filter((item) => item.niveau === "attention").slice(0, 6);
}

export function formatEmployeEfficaciteMessage(
  employeNom: string,
  categorie?: string,
): string {
  if (!categorie) return `${employeNom} — données en cours de collecte.`;
  return `${employeNom} — domaine d'efficacité : ${categorie.toLowerCase()}.`;
}
