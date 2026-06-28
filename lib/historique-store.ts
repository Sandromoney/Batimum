import { applyCommandeStatutChange } from "@/lib/commande-historique";
import type {
  Chantier,
  Client,
  Commande,
  Devis,
  Facture,
} from "@/lib/types";
import {
  recordChantierCreation,
  recordCommandeCreation,
  recordFactureCreation,
  recordFacturePaid,
} from "@/lib/historique-events";

export type AppHistoriqueSlice = {
  devis: Devis[];
  commandes: Commande[];
  clients: Client[];
  chantiers: Chantier[];
  factures: Facture[];
};

function replaceById<T extends { id: string }>(items: T[], next?: T): T[] {
  if (!next) return items;
  const index = items.findIndex((item) => item.id === next.id);
  if (index === -1) return items;
  const copy = [...items];
  copy[index] = next;
  return copy;
}

export function mergeHistoriqueUpdates(
  data: AppHistoriqueSlice,
  updates: {
    devis?: Devis;
    commande?: Commande;
    client?: Client;
    chantier?: Chantier;
    facture?: Facture;
  },
): AppHistoriqueSlice {
  return {
    devis: replaceById(data.devis, updates.devis),
    commandes: replaceById(data.commandes, updates.commande),
    clients: replaceById(data.clients, updates.client),
    chantiers: replaceById(data.chantiers, updates.chantier),
    factures: replaceById(data.factures, updates.facture),
  };
}

export function resolveFactureLinks(
  data: AppHistoriqueSlice,
  facture: Facture,
): {
  devis?: Devis;
  commande?: Commande;
  client?: Client;
  chantier?: Chantier;
} {
  const devisId = facture.devisLieId ?? facture.devisSourceId;
  const devis = devisId ? data.devis.find((item) => item.id === devisId) : undefined;
  const commande = facture.commandeLieId
    ? data.commandes.find((item) => item.id === facture.commandeLieId)
    : devis
      ? data.commandes.find((item) => item.devisId === devis.id)
      : undefined;
  const client = data.clients.find((item) => item.id === facture.clientId);
  const chantierId = facture.chantierLieId ?? facture.chantierId;
  const chantier = chantierId
    ? data.chantiers.find((item) => item.id === chantierId)
    : devis
      ? data.chantiers.find((item) => item.devisId === devis.id)
      : undefined;

  return { devis, commande, client, chantier };
}

export function appendCommandeWithHistorique(
  data: AppHistoriqueSlice,
  input: { devis: Devis; commande: Commande },
): AppHistoriqueSlice {
  const client = data.clients.find((item) => item.id === input.commande.clientId);
  const chantier = input.commande.chantierId
    ? data.chantiers.find((item) => item.id === input.commande.chantierId)
    : data.chantiers.find((item) => item.devisId === input.devis.id);

  const recorded = recordCommandeCreation({
    devis: input.devis,
    commande: input.commande,
    client,
    chantier,
  });

  return {
    ...mergeHistoriqueUpdates(data, recorded),
    commandes: [...data.commandes, recorded.commande],
  };
}

export function appendChantierWithHistorique(
  data: AppHistoriqueSlice,
  input: { chantier: Chantier; devis?: Devis },
): AppHistoriqueSlice {
  const recorded = recordChantierCreation({
    devis: input.devis,
    chantier: input.chantier,
    client: data.clients.find((item) => item.id === input.chantier.clientId),
  });

  return {
    ...mergeHistoriqueUpdates(data, recorded),
    chantiers: [...data.chantiers, recorded.chantier],
  };
}

export function appendFactureWithHistorique(
  data: AppHistoriqueSlice,
  facture: Facture,
): AppHistoriqueSlice {
  const exists = data.factures.some((item) => item.id === facture.id);
  const base = exists
    ? data
    : { ...data, factures: [...data.factures, facture] };
  return withFactureCreationHistorique(base, facture);
}

export function withCommandeCreationHistorique(
  data: AppHistoriqueSlice,
  input: {
    devis: Devis;
    commande: Commande;
  },
): AppHistoriqueSlice {
  const client = data.clients.find((item) => item.id === input.commande.clientId);
  const chantier = input.commande.chantierId
    ? data.chantiers.find((item) => item.id === input.commande.chantierId)
    : data.chantiers.find((item) => item.devisId === input.devis.id);

  const recorded = recordCommandeCreation({
    devis: input.devis,
    commande: input.commande,
    client,
    chantier,
  });

  return mergeHistoriqueUpdates(data, recorded);
}

export function withChantierCreationHistorique(
  data: AppHistoriqueSlice,
  input: { chantier: Chantier; devis?: Devis },
): AppHistoriqueSlice {
  const client = data.clients.find((item) => item.id === input.chantier.clientId);
  const recorded = recordChantierCreation({
    devis: input.devis,
    chantier: input.chantier,
    client,
  });
  return mergeHistoriqueUpdates(data, recorded);
}

export function withFactureCreationHistorique(
  data: AppHistoriqueSlice,
  facture: Facture,
): AppHistoriqueSlice {
  const links = resolveFactureLinks(data, facture);
  const recorded = recordFactureCreation({
    facture,
    ...links,
  });
  return mergeHistoriqueUpdates(data, recorded);
}

export function withFacturePaidHistorique(
  data: AppHistoriqueSlice,
  facture: Facture,
): AppHistoriqueSlice {
  const links = resolveFactureLinks(data, facture);
  const recorded = recordFacturePaid({
    facture,
    ...links,
  });
  return mergeHistoriqueUpdates(data, recorded);
}

export function withCommandeStatutHistorique(
  data: AppHistoriqueSlice,
  commandeId: string,
  statut: Commande["statut"],
): AppHistoriqueSlice {
  const commande = data.commandes.find((item) => item.id === commandeId);
  if (!commande) return data;
  return mergeHistoriqueUpdates(data, {
    commande: applyCommandeStatutChange(commande, statut),
  });
}
