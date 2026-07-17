import { getClientDisplayName } from "@/lib/clients";
import { TYPE_CHANTIER_LABELS } from "@/lib/chantiers";
import { hasExplicitActionIntent } from "@/lib/batimum-message-classifier";
import type { AppData, TypeChantier } from "@/lib/types";
import { generateId } from "@/lib/utils";

export type AssistantActionType =
  | "client"
  | "chantier"
  | "planning"
  | "devis"
  | "materiel"
  | "facture"
  | "employe"
  | "relance";

export type AssistantProposedAction = {
  id: string;
  type: AssistantActionType;
  label: string;
  enabled: boolean;
  payload: Record<string, unknown>;
};

export type AssistantParseResult = {
  rawText: string;
  clientNom?: string;
  clientExistantId?: string;
  chantierNom?: string;
  typeChantier?: TypeChantier;
  dateRdv?: string;
  descriptionTravaux?: string;
  materielEstime?: string[];
  dureeEstimeeJours?: number;
  actions: AssistantProposedAction[];
};

const TYPE_KEYWORDS: { pattern: RegExp; type: TypeChantier }[] = [
  { pattern: /salle de bain|sdb|douche italienne/i, type: "salle_de_bain" },
  { pattern: /cuisine/i, type: "cuisine" },
  { pattern: /extension|agrandissement/i, type: "extension" },
  { pattern: /maison neuve|construction neuve/i, type: "maison_neuve" },
  {
    pattern:
      /plomberie|placo|carrelage|peinture|isolation|rénovation|renovation|refaire|réfection|refection/i,
    type: "renovation",
  },
];

const MATERIEL_BY_TYPE: Partial<Record<TypeChantier, string[]>> = {
  salle_de_bain: ["WC suspendu", "Receveur douche", "Robinetterie", "Carrelage mural"],
  renovation: ["BA13", "Rail M48", "Colle carrelage", "Peinture acrylique"],
  cuisine: ["Meuble bas", "Plan de travail", "Évier", "Crédence"],
  extension: ["Béton", "Isolant", "Menuiseries"],
  maison_neuve: ["Fondations", "Charpente", "Isolation"],
};

function addDaysISO(days: number, reference = new Date()) {
  const date = new Date(reference);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function extractClientName(text: string): string | undefined {
  const patterns = [
    /chez\s+(?:monsieur|madame|m\.|mme\.?|mr\.?)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]*(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ'-]*)?)/i,
    /(?:monsieur|madame|m\.|mme\.?|mr\.?)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]+)/i,
    /client\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]+)/i,
    /pour\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ'-]*)?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function extractTypeChantier(text: string): TypeChantier | undefined {
  for (const { pattern, type } of TYPE_KEYWORDS) {
    if (pattern.test(text)) return type;
  }
  return undefined;
}

function extractDate(text: string, reference = new Date()): string | undefined {
  if (/\bdemain\b/i.test(text)) return addDaysISO(1, reference);
  if (/\baujourd'hui\b|\baujourdhui\b/i.test(text)) return addDaysISO(0, reference);
  if (/\baprès-demain\b|\bapres-demain\b/i.test(text)) return addDaysISO(2, reference);
  const dateMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, "0");
    const month = dateMatch[2].padStart(2, "0");
    const year = dateMatch[3]
      ? dateMatch[3].length === 2
        ? `20${dateMatch[3]}`
        : dateMatch[3]
      : String(reference.getFullYear());
    return `${year}-${month}-${day}`;
  }
  return undefined;
}

function findExistingClient(data: AppData, nom?: string) {
  if (!nom) return undefined;
  const normalized = nom.toLowerCase();
  return data.clients.find((client) => {
    const display = getClientDisplayName(client).toLowerCase();
    return (
      display.includes(normalized) ||
      client.nom?.toLowerCase().includes(normalized) ||
      client.prenom?.toLowerCase().includes(normalized)
    );
  });
}

function estimateDuree(type?: TypeChantier): number | undefined {
  const map: Partial<Record<TypeChantier, number>> = {
    salle_de_bain: 10,
    cuisine: 12,
    renovation: 8,
    extension: 20,
    maison_neuve: 60,
    autre: 5,
  };
  return type ? map[type] : undefined;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function wantsChantier(text: string): boolean {
  return /chantier/i.test(normalize(text));
}

function wantsDevis(text: string): boolean {
  return /devis/i.test(normalize(text));
}

function wantsRdv(text: string): boolean {
  const n = normalize(text);
  return /rdv|rendez[- ]vous|planning/i.test(n);
}

function wantsClient(text: string): boolean {
  const n = normalize(text);
  return /client/i.test(n) && /cr[eé]e|ajoute|nouveau/i.test(n);
}

export function parseAssistantMessage(
  text: string,
  data: AppData,
  referenceDate = new Date(),
): AssistantParseResult {
  const trimmed = text.trim();
  const clientNom = extractClientName(trimmed);
  const existing = findExistingClient(data, clientNom);
  const typeChantier = extractTypeChantier(trimmed);
  const dateRdv = extractDate(trimmed, referenceDate);
  const typeLabel = typeChantier ? TYPE_CHANTIER_LABELS[typeChantier] : "Travaux";
  const chantierNom = clientNom ? `${typeLabel} — ${clientNom}` : typeLabel;
  const materielEstime = typeChantier ? (MATERIEL_BY_TYPE[typeChantier] ?? []) : [];
  const dureeEstimeeJours = estimateDuree(typeChantier);

  const emptyResult: AssistantParseResult = {
    rawText: trimmed,
    clientNom,
    clientExistantId: existing?.id,
    chantierNom,
    typeChantier,
    dateRdv,
    descriptionTravaux: trimmed,
    materielEstime,
    dureeEstimeeJours,
    actions: [],
  };

  if (!hasExplicitActionIntent(trimmed)) {
    return emptyResult;
  }

  const actions: AssistantProposedAction[] = [];

  if (wantsClient(trimmed) && clientNom && !existing) {
    actions.push({
      id: generateId(),
      type: "client",
      label: `Créer le client ${clientNom}`,
      enabled: true,
      payload: {
        nom: clientNom.split(/\s+/).pop(),
        prenom: clientNom.split(/\s+/)[0],
      },
    });
  }

  if (wantsChantier(trimmed)) {
    actions.push({
      id: generateId(),
      type: "chantier",
      label: `Créer le chantier « ${chantierNom} »`,
      enabled: true,
      payload: {
        nom: chantierNom,
        typeChantier: typeChantier ?? "renovation",
        clientId: existing?.id,
        clientNom,
      },
    });
  }

  if (wantsRdv(trimmed) && dateRdv) {
    actions.push({
      id: generateId(),
      type: "planning",
      label: `Planifier le rendez-vous du ${dateRdv}`,
      enabled: true,
      payload: {
        date: dateRdv,
        titre: `RDV ${clientNom ?? "chantier"} — ${typeLabel}`,
        heureDebut: "08:00",
        heureFin: "12:00",
        type: "rendez_vous_client",
      },
    });
  }

  if (wantsDevis(trimmed)) {
    actions.push({
      id: generateId(),
      type: "devis",
      label: "Préparer un devis brouillon",
      enabled: true,
      payload: {
        titre: chantierNom,
        descriptionChantier: trimmed,
        typeChantier: typeChantier ?? "renovation",
        clientId: existing?.id,
      },
    });
  }

  if (materielEstime.length > 0 && (wantsDevis(trimmed) || wantsChantier(trimmed))) {
    actions.push({
      id: generateId(),
      type: "materiel",
      label: `Estimer le matériel (${materielEstime.length} postes)`,
      enabled: true,
      payload: { items: materielEstime },
    });
  }

  return { ...emptyResult, actions };
}
