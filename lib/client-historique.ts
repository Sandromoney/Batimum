import type {
  Client,
  ClientHistoriqueEntry,
  ClientHistoriqueType,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

export function appendClientHistorique(
  client: Client,
  entry: Omit<ClientHistoriqueEntry, "id" | "date"> & { date?: string },
): Client {
  const historique = [
    ...(client.historique ?? []),
    {
      id: generateId(),
      type: entry.type,
      label: entry.label,
      date: entry.date ?? new Date().toISOString(),
      meta: entry.meta,
    },
  ];
  return { ...client, historique };
}

export function markClientCreated(client: Client): Client {
  if (client.historique?.some((item) => item.type === "cree")) return client;
  return appendClientHistorique(client, {
    type: "cree",
    label: "Client créé.",
  });
}

export function markClientModified(client: Client): Client {
  return appendClientHistorique(client, {
    type: "modifie",
    label: "Fiche client modifiée.",
  });
}

export function logClientLinkedEvent(
  client: Client,
  type: Exclude<ClientHistoriqueType, "cree" | "modifie">,
  label: string,
  meta?: Record<string, string>,
): Client {
  return appendClientHistorique(client, { type, label, meta });
}

export type { ClientHistoriqueType };
