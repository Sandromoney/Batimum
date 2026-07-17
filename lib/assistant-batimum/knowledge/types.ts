import type { AssistantActionType } from "@/lib/assistant-batimum/types";
import type { AppData } from "@/lib/types";
import type { AssistantBrainContext } from "@/lib/assistant-batimum/types";

export type KnowledgeDataRequirement =
  | "clients"
  | "devis"
  | "factures"
  | "chantiers"
  | "commandes"
  | "employes"
  | "planning"
  | "fournitures"
  | "pilotage"
  | "parametres";

export type KnowledgeContext = {
  message: string;
  normalized: string;
  data: AppData;
  referenceDate: Date;
  brainContext?: AssistantBrainContext;
};

export type KnowledgeAnswer = {
  text: string;
  /** Réponse estimative (données partielles). */
  partial?: boolean;
  navigateTo?: string;
  missingDataMessage?: string;
};

export type KnowledgeEntry = {
  /** Identifiant unique (= intent assistant). */
  id: string;
  domain: string;
  actionType: AssistantActionType;
  /** Formulations regex (prioritaires). */
  patterns: RegExp[];
  /** Mots-clés pour scoring souple (synonymes, variantes). */
  keywords: string[];
  /** Plus élevé = priorité de matching. */
  priority?: number;
  confidence?: number;
  requiredData?: KnowledgeDataRequirement[];
  missingDataQuestion?: string;
  unavailable?: boolean;
  unavailableReply?: string;
  needsAi?: boolean;
  answer?: (ctx: KnowledgeContext) => KnowledgeAnswer | null;
};

export type KnowledgeMatch = {
  entry: KnowledgeEntry;
  confidence: number;
  score: number;
};
