import { getClientDisplayName } from "@/lib/clients";
import { v1QuestionForField } from "@/lib/assistant-batimum/v1-charter";
import { sanitizeClientName } from "@/lib/batimum-nlu";
import type {
  AssistantAiData,
  AssistantAiUnderstanding,
  AssistantSessionContext,
  BatimumAssistantIntent,
} from "@/lib/batimum-assistant-types";
import type { AppData, Client } from "@/lib/types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Supprime les mots identiques consécutifs : "Sandro Sandro" → "Sandro". */
export function deduplicateConsecutiveTokens(text: string): string {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const result: string[] = [];
  for (const token of tokens) {
    const prev = result[result.length - 1];
    if (prev && normalize(prev) === normalize(token)) continue;
    result.push(token);
  }
  return result.join(" ");
}

export function cleanAssistantText(text: string): string {
  return deduplicateConsecutiveTokens(text.trim());
}

export function cleanAssistantData(data: AssistantAiData): AssistantAiData {
  const clean = (value?: string, asName = false) => {
    if (!value?.trim()) return undefined;
    const base = asName ? sanitizeClientName(value) : cleanAssistantText(value);
    return base || undefined;
  };

  return {
    nom: clean(data.nom, true),
    client: clean(data.client, true),
    date: clean(data.date),
    heure: clean(data.heure),
    type_chantier: clean(data.type_chantier),
    chantier: clean(data.chantier, true),
    description: clean(data.description),
    devis: clean(data.devis),
    adresse: clean(data.adresse),
    ville: clean(data.ville),
    telephone: clean(data.telephone),
  };
}

const COMPANY_MARKERS =
  /\b(sci|sarl|sas|eurl|sa|sasu|rénovation|renovation|habitat|construction|bâtiment|batiment|menuiserie|plomberie|électricité|electricite|terrasse|toiture)\b/i;

export function isCompanyLikeName(name: string): boolean {
  return COMPANY_MARKERS.test(name);
}

/** Un seul mot sans marqueur entreprise → probablement un prénom seul. */
export function isLikelyFirstNameOnly(name: string): boolean {
  const cleaned = name.trim();
  if (!cleaned || cleaned.length < 2) return false;
  if (isCompanyLikeName(cleaned)) return false;
  return cleaned.split(/\s+/).filter(Boolean).length === 1;
}

export function mergeClientNamePart(
  existing: string | undefined,
  answer: string,
): string {
  const part = sanitizeClientName(answer);
  if (!existing?.trim()) return part;
  const merged = deduplicateConsecutiveTokens(
    `${sanitizeClientName(existing)} ${part}`,
  );
  return sanitizeClientName(merged);
}

const FIELD_ORDER: Partial<Record<BatimumAssistantIntent, string[]>> = {
  create_client: ["nom", "nom_complet", "telephone", "email", "ville", "adresse"],
  create_quote: ["client"],
  create_chantier: ["client"],
  create_appointment: ["date", "heure", "client"],
  search_client: ["client"],
};

export function detectOrderedMissingFields(
  intent: BatimumAssistantIntent,
  data: AssistantAiData,
): string[] {
  const order = FIELD_ORDER[intent];
  if (!order) return [];

  const missing: string[] = [];

  if (order.includes("nom")) {
    if (!data.nom?.trim()) {
      missing.push("nom");
      return missing;
    }
    if (isLikelyFirstNameOnly(data.nom)) {
      missing.push("nom_complet");
      return missing;
    }
  }

  for (const field of order) {
    if (field === "nom" || field === "nom_complet") continue;
    const value = data[field as keyof AssistantAiData];
    if (!value?.trim()) {
      missing.push(field);
      return missing;
    }
  }

  return missing;
}

export function findClientCandidates(
  appData: AppData,
  query?: string,
): Client[] {
  if (!query?.trim()) return [];
  const q = normalize(query);
  if (q.length < 2) return [];

  return appData.clients.filter((client) => {
    const display = normalize(getClientDisplayName(client));
    const nom = normalize(client.nom ?? "");
    const prenom = normalize(client.prenom ?? "");
    const societe = normalize(client.societe ?? "");
    return (
      display === q ||
      display.includes(q) ||
      nom.includes(q) ||
      prenom.includes(q) ||
      societe.includes(q)
    );
  });
}

export function needsClientDisambiguation(
  appData: AppData,
  query?: string,
): { needed: boolean; candidates: Client[] } {
  if (!query?.trim()) return { needed: false, candidates: [] };
  const candidates = findClientCandidates(appData, query);
  if (candidates.length <= 1) return { needed: false, candidates };
  const q = normalize(query);
  const exact = candidates.filter(
    (c) => normalize(getClientDisplayName(c)) === q,
  );
  if (exact.length === 1) return { needed: false, candidates: exact };
  return { needed: true, candidates: candidates.slice(0, 6) };
}

export function buildClarificationQuestion(
  intent: BatimumAssistantIntent,
  field: string,
  _data: AssistantAiData,
): string {
  return v1QuestionForField(field);
}

export function buildDisambiguationMessage(candidates: Client[]): string {
  const lines = candidates.map(
    (client, index) => `${index + 1}. ${getClientDisplayName(client)}`,
  );
  return `J'ai trouvé plusieurs clients.\n\n${lines.join("\n")}\n\nLequel souhaitez-vous utiliser ?`;
}

export function buildConfirmationSummary(
  intent: BatimumAssistantIntent,
  data: AssistantAiData,
): string {
  switch (intent) {
    case "create_client": {
      const lines = [`Je vais créer le client suivant :`, ``, `Nom : ${data.nom}`];
      if (data.adresse || data.ville) {
        lines.push(`Adresse : ${[data.adresse, data.ville].filter(Boolean).join(", ")}`);
      }
      if (data.telephone) lines.push(`Téléphone : ${data.telephone}`);
      lines.push(``, `Confirmez-vous la création ?`);
      return lines.join("\n");
    }
    case "create_quote":
      return [
        `Je prépare un devis brouillon.`,
        data.client ? `Client : ${data.client}` : null,
        data.type_chantier ? `Travaux : ${data.type_chantier}` : null,
        ``,
        `Confirmez-vous ?`,
      ]
        .filter(Boolean)
        .join("\n");
    case "create_chantier":
      return [
        `Je vais créer un chantier.`,
        data.client ? `Client : ${data.client}` : null,
        data.chantier ? `Nom : ${data.chantier}` : null,
        data.type_chantier ? `Type : ${data.type_chantier}` : null,
        ``,
        `Confirmez-vous ?`,
      ]
        .filter(Boolean)
        .join("\n");
    case "create_appointment":
      return [
        `Je planifie un rendez-vous.`,
        data.date ? `Date : ${data.date}` : null,
        data.heure ? `Heure : ${data.heure}` : null,
        data.client ? `Client : ${data.client}` : null,
        ``,
        `Confirmez-vous ?`,
      ]
        .filter(Boolean)
        .join("\n");
    case "assign_employee":
      return [
        `Je vais affecter ${data.employe ?? "l'employé"} au chantier ${data.chantier ?? "chantier"}.`,
        data.date_debut && data.date_fin
          ? `Période : du ${data.date_debut} au ${data.date_fin}`
          : data.date_debut
            ? `Date : ${data.date_debut}`
            : null,
        ``,
        `Confirmez-vous ?`,
      ]
        .filter(Boolean)
        .join("\n");
    default:
      return `Je vais traiter votre demande. Confirmez-vous ?`;
  }
}

export function applyPendingSlotAnswer(
  field: string,
  answer: string,
  pendingData: AssistantAiData,
): AssistantAiData {
  const value = answer.trim();
  const data: AssistantAiData = { ...pendingData };

  switch (field) {
    case "nom":
      data.nom = sanitizeClientName(value);
      break;
    case "nom_complet":
      data.nom = mergeClientNamePart(pendingData.nom, value);
      break;
    case "client":
      data.client = sanitizeClientName(value);
      break;
    case "date":
      data.date = cleanAssistantText(value);
      break;
    case "heure":
      data.heure = cleanAssistantText(value);
      break;
    case "adresse":
      data.adresse = cleanAssistantText(value);
      if (!data.ville && value.length < 40 && !/\d/.test(value)) {
        data.ville = cleanAssistantText(value);
      }
      break;
    case "telephone":
      data.telephone = cleanAssistantText(value);
      break;
    case "type_chantier":
      data.type_chantier = cleanAssistantText(value);
      break;
    case "chantier":
      data.chantier = sanitizeClientName(value);
      break;
    default:
      break;
  }

  return cleanAssistantData(data);
}

export type RefineResult = {
  understanding: AssistantAiUnderstanding;
  disambiguation?: {
    candidates: Array<{ id: string; name: string }>;
  };
};

export function refineAssistantUnderstanding(
  raw: AssistantAiUnderstanding,
  appData: AppData,
): RefineResult {
  const data = cleanAssistantData(raw.data);
  const missing_fields = detectOrderedMissingFields(raw.intent, data);

  const firstMissing = missing_fields[0];
  const clarification_question = firstMissing
    ? buildClarificationQuestion(raw.intent, firstMissing, data)
    : null;

  let confidence = raw.confidence;
  if (raw.intent === "create_client" && data.nom && isLikelyFirstNameOnly(data.nom)) {
    confidence = Math.min(confidence, 0.65);
  }

  const clientIntents = new Set<BatimumAssistantIntent>([
    "create_quote",
    "create_chantier",
    "create_appointment",
    "search_client",
  ]);

  if (clientIntents.has(raw.intent) && data.client && missing_fields.length === 0) {
    const { needed, candidates } = needsClientDisambiguation(appData, data.client);
    if (needed) {
      return {
        understanding: {
          ...raw,
          data,
          confidence,
          missing_fields: ["client_pick"],
          clarification_question: buildDisambiguationMessage(candidates),
        },
        disambiguation: {
          candidates: candidates.map((c) => ({
            id: c.id,
            name: getClientDisplayName(c),
          })),
        },
      };
    }
    if (candidates.length === 1) {
      data.client = getClientDisplayName(candidates[0]);
    }
  }

  return {
    understanding: {
      intent: raw.intent,
      confidence,
      data,
      missing_fields,
      clarification_question,
    },
  };
}

export function resolveDisambiguationChoice(
  message: string,
  candidates: Array<{ id: string; name: string }>,
): { id: string; name: string } | null {
  const trimmed = message.trim();
  const index = Number(trimmed);
  if (Number.isInteger(index) && index >= 1 && index <= candidates.length) {
    return candidates[index - 1];
  }
  const n = normalize(trimmed);
  return (
    candidates.find((c) => normalize(c.name) === n) ??
    candidates.find((c) => normalize(c.name).includes(n)) ??
    null
  );
}

export function isDisambiguationPending(session: AssistantSessionContext): boolean {
  return (
    session.missing_fields?.includes("client_pick") === true &&
    (session.disambiguation_candidates?.length ?? 0) > 0
  );
}
