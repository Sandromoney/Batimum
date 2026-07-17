import { getClientDisplayName } from "@/lib/clients";
import { markClientCreated } from "@/lib/client-historique";
import { splitClientName } from "@/lib/batimum-nlu";
import {
  applyAffectationCreate,
  DEFAULT_JOURS_SEMAINE_AFFECTATION,
  expandAffectationDates,
  type ConflictResolution,
} from "@/lib/planning-affectations";
import type { AssistantAiData } from "@/lib/batimum-assistant-types";
import type { AppData, ChantierAffectation, Employe } from "@/lib/types";
import { generateId } from "@/lib/utils";

export type BatimumToolExecutionResult = {
  success: boolean;
  message: string;
  verified: boolean;
  clientId?: string;
  clientName?: string;
  chantierId?: string;
  employeId?: string;
  affectationId?: string;
  planningEventCount?: number;
  navigateTo?: string;
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const MOIS_FR: Record<string, string> = {
  janvier: "01",
  fevrier: "02",
  mars: "03",
  avril: "04",
  mai: "05",
  juin: "06",
  juillet: "07",
  aout: "08",
  août: "08",
  septembre: "09",
  octobre: "10",
  novembre: "11",
  decembre: "12",
  décembre: "12",
};

function parseFlexibleDate(
  raw: string | undefined,
  reference = new Date(),
  hints?: { month?: string; year?: string },
): string | undefined {
  if (!raw?.trim()) return undefined;
  const value = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const fr = normalize(value).match(/^(\d{1,2})(?:er)?\s+([a-z]+)(?:\s+(\d{4}))?$/);
  if (fr) {
    const month = MOIS_FR[fr[2]];
    if (month) {
      const year = fr[3] ?? hints?.year ?? String(reference.getFullYear());
      return `${year}-${month}-${fr[1].padStart(2, "0")}`;
    }
  }

  if (/^\d{1,2}$/.test(value) && hints?.month && hints.year) {
    return `${hints.year}-${hints.month}-${value.padStart(2, "0")}`;
  }

  const slash = value.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (slash) {
    const day = slash[1].padStart(2, "0");
    const month = slash[2].padStart(2, "0");
    const year = slash[3]
      ? slash[3].length === 2
        ? `20${slash[3]}`
        : slash[3]
      : String(reference.getFullYear());
    return `${year}-${month}-${day}`;
  }

  const n = normalize(value);
  if (n === "demain") {
    const d = new Date(reference);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (n.includes("aujourd")) {
    return reference.toISOString().slice(0, 10);
  }

  return undefined;
}

export function resolveAssistantDateRange(
  debutRaw?: string,
  finRaw?: string,
  reference = new Date(),
): { dateDebut: string; dateFin: string } | null {
  const finParsed = parseFlexibleDate(finRaw, reference);
  const finHints = finParsed
    ? { month: finParsed.slice(5, 7), year: finParsed.slice(0, 4) }
    : undefined;
  const debutParsed = parseFlexibleDate(debutRaw, reference, finHints);
  const dateDebut = debutParsed ?? finParsed;
  const dateFin = finParsed ?? debutParsed;

  if (!dateDebut || !dateFin) return null;
  if (dateFin < dateDebut) return null;
  return { dateDebut, dateFin };
}

function findEmployeByName(appData: AppData, name: string): Employe | undefined {
  const q = normalize(name);
  return appData.employes.find((employe) => {
    const full = normalize(`${employe.prenom} ${employe.nom}`);
    return full === q || full.includes(q) || q.includes(full);
  });
}

function findChantierByName(appData: AppData, name: string) {
  const q = normalize(name);
  const matches = appData.chantiers.filter((chantier) => {
    const nom = normalize(chantier.nom);
    const client = appData.clients.find((c) => c.id === chantier.clientId);
    const clientName = client ? normalize(getClientDisplayName(client)) : "";
    return (
      nom === q ||
      nom.includes(q) ||
      q.includes(nom) ||
      clientName.includes(q)
    );
  });
  if (matches.length === 0) return undefined;
  const exact = matches.find((c) => normalize(c.nom) === q);
  return exact ?? matches[0];
}

function formatFrenchDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = [
    "",
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  const monthLabel = months[Number(m)] ?? m;
  return `${Number(d)} ${monthLabel} ${y}`;
}

/** Affecte un employé à un chantier sur une période — écrit planning + affectations. */
export function assignEmployeeToSite(
  appData: AppData,
  data: AssistantAiData,
  options?: { conflictResolution?: ConflictResolution },
): { nextData: AppData; result: BatimumToolExecutionResult } {
  const employeName = data.employe?.trim();
  const chantierName = data.chantier?.trim();

  if (!employeName) {
    return {
      nextData: appData,
      result: {
        success: false,
        verified: false,
        message: "Employé manquant pour l'affectation.",
      },
    };
  }
  if (!chantierName) {
    return {
      nextData: appData,
      result: {
        success: false,
        verified: false,
        message: "Chantier manquant pour l'affectation.",
      },
    };
  }

  const employe = findEmployeByName(appData, employeName);
  if (!employe) {
    return {
      nextData: appData,
      result: {
        success: false,
        verified: false,
        message: `Je n'ai pas trouvé l'employé ${employeName}.`,
      },
    };
  }

  const chantier = findChantierByName(appData, chantierName);
  if (!chantier) {
    return {
      nextData: appData,
      result: {
        success: false,
        verified: false,
        message: `Je n'ai pas trouvé le chantier « ${chantierName} ».`,
      },
    };
  }

  const range =
    resolveAssistantDateRange(data.date_debut, data.date_fin) ??
    (() => {
      const today = new Date().toISOString().slice(0, 10);
      return { dateDebut: today, dateFin: today };
    })();

  const affectation: ChantierAffectation = {
    id: generateId(),
    chantierId: chantier.id,
    employeIds: [employe.id],
    dateDebut: range.dateDebut,
    dateFin: range.dateFin,
    joursSemaine: [...DEFAULT_JOURS_SEMAINE_AFFECTATION],
    heureDebut: "08:00",
    heureFin: "17:00",
    note: `Affectation Assistant — ${employe.prenom} ${employe.nom}`,
  };

  const resolution = options?.conflictResolution ?? "replace";
  const applied = applyAffectationCreate(appData, affectation, resolution);

  if (!applied.ok) {
    if ("conflicts" in applied) {
      return {
        nextData: appData,
        result: {
          success: false,
          verified: false,
          message: `${employe.prenom} ${employe.nom} est déjà planifié sur une partie de cette période. Ouvrez le Planning pour ajuster les conflits.`,
          employeId: employe.id,
          chantierId: chantier.id,
          navigateTo: "/planning",
        },
      };
    }
    return {
      nextData: appData,
      result: {
        success: false,
        verified: false,
        message: "Impossible de créer l'affectation planning.",
      },
    };
  }

  const savedAffectation = applied.data.affectations.find((a) => a.id === affectation.id);
  const events = applied.data.planning.filter((e) => e.affectationId === affectation.id);
  const expectedDates = expandAffectationDates(
    range.dateDebut,
    range.dateFin,
    affectation.joursSemaine,
  );
  const verified = Boolean(savedAffectation) && events.length > 0;

  const displayEmploye = `${employe.prenom} ${employe.nom}`.trim();
  const periodLabel =
    range.dateDebut === range.dateFin
      ? `le ${formatFrenchDate(range.dateDebut)}`
      : `du ${formatFrenchDate(range.dateDebut)} au ${formatFrenchDate(range.dateFin)}`;

  return {
    nextData: applied.data,
    result: {
      success: verified,
      verified,
      message: verified
        ? `${displayEmploye} a bien été affecté au chantier ${chantier.nom} ${periodLabel} (${events.length} jour${events.length > 1 ? "s" : ""} planifié${events.length > 1 ? "s" : ""}).`
        : `L'affectation n'a pas pu être vérifiée dans le planning (${events.length}/${expectedDates.length} jours).`,
      employeId: employe.id,
      chantierId: chantier.id,
      affectationId: affectation.id,
      planningEventCount: events.length,
      navigateTo: "/planning",
    },
  };
}

/** Crée un client dans le store Batimum. */
export function createClient(
  appData: AppData,
  data: AssistantAiData,
): { nextData: AppData; result: BatimumToolExecutionResult } {
  const fullName = data.nom?.trim();
  if (!fullName) {
    return {
      nextData: appData,
      result: {
        success: false,
        verified: false,
        message: "Nom du client manquant.",
      },
    };
  }

  const q = normalize(fullName);
  const duplicate = appData.clients.find(
    (client) => normalize(getClientDisplayName(client)) === q,
  );
  if (duplicate) {
    const display = getClientDisplayName(duplicate);
    return {
      nextData: appData,
      result: {
        success: false,
        verified: true,
        message: `Le client ${display} existe déjà dans Batimum.`,
        clientId: duplicate.id,
        clientName: display,
        navigateTo: "/clients",
      },
    };
  }

  const { prenom, nom } = splitClientName(fullName);
  const client = markClientCreated({
    id: generateId(),
    nom,
    prenom,
    telephone: data.telephone?.trim() ?? "",
    adresse: data.adresse?.trim() ?? "",
    codePostal: "",
    ville: data.ville?.trim() ?? "",
    createdAt: new Date().toISOString().slice(0, 10),
  });

  const nextData = { ...appData, clients: [...appData.clients, client] };
  const verified = nextData.clients.some((c) => c.id === client.id);
  const displayName = getClientDisplayName(client);

  return {
    nextData,
    result: {
      success: verified,
      verified,
      message: verified
        ? `Client ${displayName} créé avec succès.`
        : `La création du client ${displayName} n'a pas pu être vérifiée.`,
      clientId: client.id,
      clientName: displayName,
      navigateTo: "/clients",
    },
  };
}
