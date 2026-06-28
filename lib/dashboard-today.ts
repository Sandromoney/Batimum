import { getClientDisplayName } from "@/lib/clients";
import { getDevisDisplayStatut } from "@/lib/devis-statut";
import { getFactureDisplayStatut, isFacturePayee } from "@/lib/facture-statut";
import { getDueFactureRelanceNiveaux } from "@/lib/facture-relances-auto";
import { formatTime24h } from "@/lib/utils";
import type { AppData } from "@/lib/types";

export type DashboardTodaySnapshot = {
  devisEnAttente: number;
  facturesEcheance: number;
  chantiersDemarrentAujourdhui: number;
  chantiersEnRetard: number;
  facturesImpayees: number;
  relancesAEnvoyer: number;
};

export type DashboardTodayItem = {
  id: string;
  label: string;
  labelPlural?: string;
  value: number;
  href?: string;
};

export type DashboardTodayDetailLine = {
  id: string;
  categoryId: string;
  text: string;
  href: string;
  priority: number;
};

const DETAIL_LINE_LIMIT = 48;

function todayISO(referenceDate = new Date()) {
  return referenceDate.toISOString().slice(0, 10);
}

function addDaysISO(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function formatRetardJours(days: number): string {
  return `${days} jour${days > 1 ? "s" : ""}`;
}

function chantierRetardText(chantier: { nom: string; statut: string; dateDebut: string; dateFin: string }, today: string): string {
  if (chantier.statut === "retard_demarrage" && chantier.dateDebut && today > chantier.dateDebut) {
    const days = daysBetween(chantier.dateDebut, today);
    return `Chantier ${chantier.nom} - retard de démarrage (${formatRetardJours(days)})`;
  }
  if (chantier.dateFin && today > chantier.dateFin) {
    const days = daysBetween(chantier.dateFin, today);
    return `Chantier ${chantier.nom} - retard de ${formatRetardJours(days)}`;
  }
  return `Chantier ${chantier.nom} - en retard`;
}

export function getDashboardTodaySnapshot(
  data: AppData,
  referenceDate = new Date(),
): DashboardTodaySnapshot {
  const today = todayISO(referenceDate);
  const echeanceLimite = addDaysISO(today, 7);

  const devisEnAttente = data.devis.filter((devis) => {
    const statut = getDevisDisplayStatut(devis);
    return ["envoye", "en_attente", "en_retard", "accepte"].includes(statut);
  }).length;

  const facturesEcheance = data.factures.filter((facture) => {
    if (isFacturePayee(facture) || !facture.dateEcheance) return false;
    return facture.dateEcheance >= today && facture.dateEcheance <= echeanceLimite;
  }).length;

  const chantiersDemarrentAujourdhui = data.chantiers.filter(
    (chantier) => chantier.dateDebut === today,
  ).length;

  const chantiersEnRetard = data.chantiers.filter((chantier) =>
    ["en_retard", "retard_demarrage"].includes(chantier.statut),
  ).length;

  const facturesImpayees = data.factures.filter(
    (facture) => !isFacturePayee(facture),
  ).length;

  const relancesFactures = data.factures.reduce((total, facture) => {
    return total + getDueFactureRelanceNiveaux(facture, data.parametres, today).length;
  }, 0);

  const relancesPreparees = data.relances.filter(
    (relance) => relance.statut === "preparee",
  ).length;

  return {
    devisEnAttente,
    facturesEcheance,
    chantiersDemarrentAujourdhui,
    chantiersEnRetard,
    facturesImpayees,
    relancesAEnvoyer: relancesFactures + relancesPreparees,
  };
}

export function buildDashboardTodayItems(
  snapshot: DashboardTodaySnapshot,
): DashboardTodayItem[] {
  return [
    {
      id: "devis",
      label: "Devis en attente",
      value: snapshot.devisEnAttente,
      href: "/devis",
    },
    {
      id: "echeance",
      label: "Factures arrivant à échéance",
      value: snapshot.facturesEcheance,
      href: "/factures",
    },
    {
      id: "demarrage",
      label: "Chantiers qui commencent aujourd'hui",
      value: snapshot.chantiersDemarrentAujourdhui,
      href: "/chantiers",
    },
    {
      id: "retard",
      label: "Chantiers en retard",
      value: snapshot.chantiersEnRetard,
      href: "/chantiers",
    },
    {
      id: "impayees",
      label: "Factures impayées",
      value: snapshot.facturesImpayees,
      href: "/factures",
    },
    {
      id: "relances",
      label: "Relances à envoyer",
      value: snapshot.relancesAEnvoyer,
      href: "/factures",
    },
  ];
}

export function buildDashboardCompactAlerts(
  snapshot: DashboardTodaySnapshot,
  data: AppData,
  referenceDate = new Date(),
): DashboardTodayItem[] {
  const today = todayISO(referenceDate);
  const facturesEnRetard = data.factures.filter(
    (facture) => getFactureDisplayStatut(facture) === "en_retard",
  ).length;
  const rendezVousAujourdhui = data.planning.filter(
    (event) => event.date === today,
  ).length;

  return [
    {
      id: "chantiers-retard",
      label: "chantier en retard",
      labelPlural: "chantiers en retard",
      value: snapshot.chantiersEnRetard,
      href: "/chantiers",
    },
    {
      id: "factures-impayees",
      label: "facture impayée",
      labelPlural: "factures impayées",
      value: snapshot.facturesImpayees,
      href: "/factures",
    },
    {
      id: "factures-retard",
      label: "facture en retard",
      labelPlural: "factures en retard",
      value: facturesEnRetard,
      href: "/factures",
    },
    {
      id: "factures-echeance",
      label: "facture arrive à échéance",
      labelPlural: "factures arrivent à échéance",
      value: snapshot.facturesEcheance,
      href: "/factures",
    },
    {
      id: "devis-relancer",
      label: "devis à relancer",
      labelPlural: "devis à relancer",
      value: snapshot.devisEnAttente,
      href: "/devis",
    },
    {
      id: "chantiers-demarrage",
      label: "chantier démarre aujourd'hui",
      labelPlural: "chantiers démarrent aujourd'hui",
      value: snapshot.chantiersDemarrentAujourdhui,
      href: "/chantiers",
    },
    {
      id: "rendez-vous",
      label: "rendez-vous aujourd'hui",
      labelPlural: "rendez-vous aujourd'hui",
      value: rendezVousAujourdhui,
      href: "/planning",
    },
    {
      id: "relances",
      label: "relance à envoyer",
      labelPlural: "relances à envoyer",
      value: snapshot.relancesAEnvoyer,
      href: "/factures",
    },
  ].filter((item) => item.value > 0);
}

function collectDashboardTodayDetailLines(
  data: AppData,
  snapshot: DashboardTodaySnapshot,
  referenceDate = new Date(),
): DashboardTodayDetailLine[] {
  const today = todayISO(referenceDate);
  const echeanceLimite = addDaysISO(today, 7);
  const lines: DashboardTodayDetailLine[] = [];

  data.chantiers
    .filter((chantier) =>
      ["en_retard", "retard_demarrage"].includes(chantier.statut),
    )
    .forEach((chantier) => {
      lines.push({
        id: `chantier-retard-${chantier.id}`,
        categoryId: "chantiers-retard",
        text: chantierRetardText(chantier, today),
        href: `/chantiers/${chantier.id}`,
        priority: 10,
      });
    });

  data.chantiers
    .filter((chantier) => chantier.dateDebut === today)
    .forEach((chantier) => {
      lines.push({
        id: `chantier-start-${chantier.id}`,
        categoryId: "chantiers-demarrage",
        text: `Chantier ${chantier.nom} - démarrage aujourd'hui`,
        href: `/chantiers/${chantier.id}`,
        priority: 20,
      });
    });

  data.factures.forEach((facture) => {
    const client = data.clients.find((item) => item.id === facture.clientId);
    const clientName = getClientDisplayName(client);
    const label = facture.numero || "Facture";

    if (getFactureDisplayStatut(facture) === "en_retard") {
      const days = facture.dateEcheance
        ? daysBetween(facture.dateEcheance, today)
        : 0;
      lines.push({
        id: `facture-retard-${facture.id}`,
        categoryId: "factures-retard",
        text:
          days > 0
            ? `Facture ${label} (${clientName}) - en retard de ${formatRetardJours(days)}`
            : `Facture ${label} (${clientName}) - en retard`,
        href: "/factures",
        priority: 15,
      });
      return;
    }

    if (
      !isFacturePayee(facture) &&
      facture.dateEcheance &&
      facture.dateEcheance >= today &&
      facture.dateEcheance <= echeanceLimite
    ) {
      const days = daysBetween(today, facture.dateEcheance);
      lines.push({
        id: `facture-echeance-${facture.id}`,
        categoryId: "factures-echeance",
        text:
          days === 0
            ? `Facture ${label} (${clientName}) - échéance aujourd'hui`
            : `Facture ${label} (${clientName}) - échéance dans ${formatRetardJours(days)}`,
        href: "/factures",
        priority: 25,
      });
      return;
    }

    if (!isFacturePayee(facture)) {
      lines.push({
        id: `facture-impayee-${facture.id}`,
        categoryId: "factures-impayees",
        text: `Facture ${label} (${clientName}) - impayée`,
        href: "/factures",
        priority: 30,
      });
    }
  });

  data.devis
    .filter((devis) => {
      const statut = getDevisDisplayStatut(devis);
      return ["envoye", "en_attente", "en_retard", "accepte"].includes(statut);
    })
    .forEach((devis) => {
      const client = data.clients.find((item) => item.id === devis.clientId);
      const clientName = getClientDisplayName(client);
      const titre = devis.titre?.trim() || devis.numero;
      lines.push({
        id: `devis-attente-${devis.id}`,
        categoryId: "devis-relancer",
        text: `Devis ${titre} (${clientName}) - en attente de réponse`,
        href: `/devis/${devis.id}`,
        priority: 35,
      });
    });

  data.planning
    .filter((event) => event.date === today)
    .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
    .forEach((event) => {
      const chantier = event.chantierId
        ? data.chantiers.find((item) => item.id === event.chantierId)
        : undefined;
      const label = event.tache?.trim() || event.titre || "Rendez-vous";
      const suffix = chantier ? ` — ${chantier.nom}` : "";
      lines.push({
        id: `planning-${event.id}`,
        categoryId: "rendez-vous",
        text: `${label}${suffix} - ${formatTime24h(event.heureDebut)}`,
        href: "/planning",
        priority: 40,
      });
    });

  if (snapshot.relancesAEnvoyer > 0) {
    lines.push({
      id: "relances-resume",
      categoryId: "relances",
      text: `${snapshot.relancesAEnvoyer} relance${snapshot.relancesAEnvoyer > 1 ? "s" : ""} à envoyer`,
      href: "/factures",
      priority: 45,
    });
  }

  const sorted = lines.sort((a, b) => a.priority - b.priority || a.text.localeCompare(b.text, "fr"));
  return sorted;
}

export function buildDashboardTodayDetailLines(
  data: AppData,
  snapshot: DashboardTodaySnapshot,
  referenceDate = new Date(),
): DashboardTodayDetailLine[] {
  return collectDashboardTodayDetailLines(data, snapshot, referenceDate).slice(
    0,
    DETAIL_LINE_LIMIT,
  );
}

export function countDashboardTodayDetailOverflow(
  data: AppData,
  snapshot: DashboardTodaySnapshot,
  referenceDate = new Date(),
): number {
  const total = collectDashboardTodayDetailLines(data, snapshot, referenceDate).length;
  return Math.max(0, total - DETAIL_LINE_LIMIT);
}

export function formatDashboardAlertLabel(item: DashboardTodayItem) {
  const pluralLabel =
    "labelPlural" in item && item.labelPlural ? item.labelPlural : item.label;
  return item.value > 1 ? pluralLabel : item.label;
}

export function countDashboardUrgentCategories(
  snapshot: DashboardTodaySnapshot,
  data: AppData,
) {
  return buildDashboardCompactAlerts(snapshot, data).length;
}

export function getDashboardGreetingName(utilisateur: string) {
  const trimmed = utilisateur.trim();
  if (!trimmed) return "vous";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function getDashboardGreetingHour(referenceDate = new Date()) {
  const hour = referenceDate.getHours();
  if (hour < 18) return "Bonjour";
  return "Bonsoir";
}

export function getDashboardDynamicSubtitle(
  urgentCategories: number,
  referenceDate = new Date(),
) {
  if (urgentCategories > 0) {
    return `Vous avez ${urgentCategories} action${
      urgentCategories > 1 ? "s" : ""
    } importante${urgentCategories > 1 ? "s" : ""} aujourd'hui.`;
  }

  const dayPhrases = [
    "Voici votre activité du jour.",
    "Tout est sous contrôle aujourd'hui.",
    "Belle journée pour faire avancer vos chantiers.",
    "Votre activité est bien organisée.",
    "Pilotez votre entreprise en toute sérénité.",
    "Un regard rapide sur l'essentiel.",
    "Votre tableau de bord est à jour.",
  ];

  return dayPhrases[referenceDate.getDay() % dayPhrases.length];
}

export function countClientsCreatedThisMonth(
  data: AppData,
  referenceDate = new Date(),
) {
  const monthKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
  return data.clients.filter((client) => client.createdAt.startsWith(monthKey)).length;
}

export function countChantiersByStatut(data: AppData) {
  return {
    enRetard: data.chantiers.filter((chantier) =>
      ["en_retard", "retard_demarrage"].includes(chantier.statut),
    ).length,
    enCours: data.chantiers.filter((chantier) => chantier.statut === "en_cours").length,
    total: data.chantiers.length,
  };
}
