import { markClientCreated } from "@/lib/client-historique";
import { createEtapesForType } from "@/lib/chantiers";
import { markChantierCreated } from "@/lib/chantier-statut";
import { createDevisBrouillon } from "@/lib/devis";
import type {
  AssistantParseResult,
  AssistantProposedAction,
} from "@/lib/batimum-assistant-parser";
import type { AppData, Chantier, TypeChantier } from "@/lib/types";
import { generateId } from "@/lib/utils";

export type AssistantExecutionResult = {
  clientId?: string;
  chantierId?: string;
  devisId?: string;
  planningId?: string;
  navigateTo?: string;
};

function createAssistantChantier(input: {
  nom: string;
  clientId: string;
  type: TypeChantier;
}): Chantier {
  const today = new Date().toISOString().slice(0, 10);
  return markChantierCreated({
    id: generateId(),
    nom: input.nom,
    clientId: input.clientId,
    adresse: "",
    statut: "planifie",
    type: input.type,
    etapes: createEtapesForType(input.type),
    dateDebut: today,
    dateFin: "",
    budget: 0,
  });
}

export function applyAssistantActions(
  data: AppData,
  parseResult: AssistantParseResult,
  selectedActionIds: string[],
): { nextData: AppData; result: AssistantExecutionResult } {
  let nextData = { ...data };
  const result: AssistantExecutionResult = {};
  let clientId = parseResult.clientExistantId;

  const selected = parseResult.actions.filter(
    (action) => selectedActionIds.includes(action.id) && action.enabled,
  );

  for (const action of selected) {
    if (action.type === "client" && !clientId) {
      const payload = action.payload as { nom?: string; prenom?: string };
      const client = markClientCreated({
        id: generateId(),
        nom: payload.nom ?? "Client",
        prenom: payload.prenom,
        telephone: "",
        adresse: "",
        codePostal: "",
        ville: "",
        createdAt: new Date().toISOString().slice(0, 10),
      });
      nextData = {
        ...nextData,
        clients: [...nextData.clients, client],
      };
      clientId = client.id;
      result.clientId = client.id;
      continue;
    }

    if (action.type === "chantier") {
      const payload = action.payload as {
        nom: string;
        typeChantier?: TypeChantier;
        clientId?: string;
      };
      const resolvedClientId =
        clientId ?? payload.clientId ?? nextData.clients[0]?.id ?? "";
      if (!resolvedClientId) continue;
      const chantier = createAssistantChantier({
        nom: payload.nom,
        clientId: resolvedClientId,
        type: payload.typeChantier ?? "renovation",
      });
      nextData = {
        ...nextData,
        chantiers: [...nextData.chantiers, chantier],
      };
      result.chantierId = chantier.id;
      continue;
    }

    if (action.type === "planning") {
      const payload = action.payload as {
        date: string;
        titre: string;
        heureDebut: string;
        heureFin: string;
        type: string;
      };
      const event = {
        id: generateId(),
        titre: payload.titre,
        date: payload.date,
        heureDebut: payload.heureDebut,
        heureFin: payload.heureFin,
        type: payload.type as AppData["planning"][number]["type"],
        chantierId: result.chantierId,
        employeIds: [] as string[],
      };
      nextData = {
        ...nextData,
        planning: [...nextData.planning, event],
      };
      result.planningId = event.id;
      continue;
    }

    if (action.type === "devis") {
      const payload = action.payload as {
        titre: string;
        descriptionChantier?: string;
        typeChantier?: TypeChantier;
        clientId?: string;
      };
      const resolvedClientId =
        clientId ?? payload.clientId ?? nextData.clients[0]?.id;
      const devis = createDevisBrouillon(
        nextData.clients,
        nextData.devis,
        { clientId: resolvedClientId },
        nextData.parametres,
      );
      const enriched = {
        ...devis,
        titre: payload.titre || devis.titre,
        descriptionChantier: payload.descriptionChantier ?? parseResult.rawText,
        typeChantier: payload.typeChantier ?? parseResult.typeChantier,
        chantierLieId: result.chantierId,
      };
      nextData = {
        ...nextData,
        devis: [...nextData.devis, enriched],
      };
      result.devisId = enriched.id;
      continue;
    }

    if (action.type === "facture") {
      const payload = action.payload as { navigateOnly?: boolean; clientId?: string };
      result.navigateTo = "/factures";
      if (payload.clientId) {
        result.clientId = payload.clientId;
      }
      continue;
    }

    if (action.type === "employe") {
      const payload = action.payload as { prenom?: string; nom?: string };
      const employe = {
        id: generateId(),
        prenom: payload.prenom ?? "Nouveau",
        nom: payload.nom ?? "Employé",
        poste: "Ouvrier",
        statut: "actif" as const,
      };
      nextData = {
        ...nextData,
        employes: [...nextData.employes, employe],
      };
      result.navigateTo = "/planning";
      continue;
    }

    if (action.type === "relance") {
      result.navigateTo = "/factures";
    }
  }

  return { nextData, result };
}

export function toggleAssistantAction(
  actions: AssistantProposedAction[],
  actionId: string,
  enabled: boolean,
): AssistantProposedAction[] {
  return actions.map((action) =>
    action.id === actionId ? { ...action, enabled } : action,
  );
}
