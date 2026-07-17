import { getClientDisplayName } from "@/lib/clients";
import {
  findClientCandidates,
  isLikelyFirstNameOnly,
} from "@/lib/batimum-assistant-brain";
import type { AssistantIntent } from "@/lib/assistant-batimum/assistant-types";
import type { AppData } from "@/lib/types";

export function isWeakClientName(name?: string): boolean {
  if (!name?.trim()) return true;
  if (name.trim().length < 2) return true;
  return isLikelyFirstNameOnly(name);
}

export function findDuplicateClient(
  data: AppData,
  name?: string,
): { found: boolean; clientName?: string } {
  if (!name?.trim()) return { found: false };
  const matches = findClientCandidates(data, name);
  if (matches.length === 0) return { found: false };
  const exact = matches.find(
    (c) =>
      getClientDisplayName(c).toLowerCase() === name.trim().toLowerCase(),
  );
  if (exact) {
    return { found: true, clientName: getClientDisplayName(exact) };
  }
  if (matches.length === 1) {
    return { found: true, clientName: getClientDisplayName(matches[0]) };
  }
  return { found: false };
}

export function validateActionData(
  intent: AssistantIntent,
  data: Record<string, unknown>,
  appData?: AppData,
): { valid: boolean; missingFields: string[]; warnings: string[] } {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  switch (intent) {
    case "create_client": {
      const nom = String(data.nom ?? "");
      if (!nom.trim()) missingFields.push("nom");
      else if (isWeakClientName(nom)) missingFields.push("nom_complet");
      if (appData) {
        const dup = findDuplicateClient(appData, nom);
        if (dup.found && dup.clientName) {
          warnings.push(
            `Client existant trouvé : ${dup.clientName}. Utiliser ce client plutôt que créer un doublon ?`,
          );
        }
      }
      break;
    }
    case "create_employe":
      if (!data.nom) missingFields.push("nom");
      break;
    case "create_fourniture":
      if (!data.nom) missingFields.push("nom");
      break;
    case "create_devis": {
      if (!data.type_chantier && !data.description) {
        missingFields.push("type_chantier");
      }
      if (!data.client) missingFields.push("client");
      break;
    }
    case "create_chantier":
      if (!data.client) missingFields.push("client");
      break;
    case "create_rendez_vous":
      if (!data.date) missingFields.push("date");
      if (!data.heure) missingFields.push("heure");
      break;
    default:
      break;
  }

  return { valid: missingFields.length === 0, missingFields, warnings };
}
