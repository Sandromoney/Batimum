/**
 * Schéma de réponse structurée Assistant Batimum V1.
 */

export type AssistantReplyType =
  | "answer"
  | "analysis"
  | "action_proposal"
  | "clarification";

export type AssistantDataReliability =
  | "reliable"
  | "estimated"
  | "incomplete";

export type AssistantStructuredAction = {
  name: string;
  payload: Record<string, unknown>;
  requiresConfirmation: boolean;
  label?: string;
};

export type AssistantStructuredReply = {
  type: AssistantReplyType;
  message: string;
  summary?: string;
  dataReliability?: AssistantDataReliability;
  sourcesUsed?: string[];
  suggestedActions?: string[];
  action?: AssistantStructuredAction | null;
};

export const ASSISTANT_REPLY_JSON_INSTRUCTION = `Réponds UNIQUEMENT avec un JSON valide de la forme :
{
  "type": "answer" | "analysis" | "action_proposal" | "clarification",
  "message": "texte clair pour le dirigeant",
  "summary": "résumé court optionnel",
  "dataReliability": "reliable" | "estimated" | "incomplete",
  "sourcesUsed": ["devis","factures"],
  "suggestedActions": ["suggestion 1"],
  "action": null
}

Pour proposer une action (sans l'exécuter) :
"action": {
  "name": "prepare_quote_reminder" | "prepare_invoice_reminder" | "open_devis" | "open_facture" | "open_chantier" | "open_client" | "open_employe" | "propose_create_client" | "propose_create_devis" | "propose_assign_employe" | "prepare_supplier_compare" | "prepare_pilotage_summary",
  "payload": { ...ids et dates nécessaires },
  "requiresConfirmation": true,
  "label": "libellé court du bouton"
}

Actions autorisées V1 uniquement (liste ci-dessus).
Ne jamais inventer d'identifiants absents du contexte.`;

export function parseAssistantStructuredReply(
  raw: string,
): AssistantStructuredReply | null {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");
    const parsed = JSON.parse(cleaned) as AssistantStructuredReply;
    if (!parsed || typeof parsed.message !== "string" || !parsed.message.trim()) {
      return null;
    }
    const type = parsed.type;
    if (
      type !== "answer" &&
      type !== "analysis" &&
      type !== "action_proposal" &&
      type !== "clarification"
    ) {
      parsed.type = "answer";
    }
    return parsed;
  } catch {
    return null;
  }
}

export const ASSISTANT_V1_ACTIONS = new Set([
  "prepare_quote_reminder",
  "prepare_invoice_reminder",
  "open_devis",
  "open_facture",
  "open_chantier",
  "open_client",
  "open_employe",
  "propose_create_client",
  "propose_create_devis",
  "propose_assign_employe",
  "prepare_supplier_compare",
  "prepare_pilotage_summary",
]);
