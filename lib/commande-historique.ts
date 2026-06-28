import type {
  Commande,
  CommandeHistoriqueEntry,
  CommandeHistoriqueType,
  StatutCommande,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

export const COMMANDE_STATUT_HISTORY_LABELS: Record<StatutCommande, string> = {
  en_cours: "Commande en cours.",
  terminee: "Commande terminée.",
  annulee: "Commande annulée.",
};

export function appendCommandeHistorique(
  commande: Commande,
  entry: Omit<CommandeHistoriqueEntry, "id" | "date"> & { date?: string },
): Commande {
  const historique = [
    ...(commande.historique ?? []),
    {
      id: generateId(),
      type: entry.type,
      label: entry.label,
      date: entry.date ?? new Date().toISOString(),
      meta: entry.meta,
    },
  ];
  return { ...commande, historique };
}

export function markCommandeCreated(commande: Commande): Commande {
  if (commande.historique?.some((item) => item.type === "cree")) return commande;
  return appendCommandeHistorique(commande, {
    type: "cree",
    label: "Commande créée.",
    meta: {
      devisId: commande.devisId,
      devisNumero: commande.devisNumero ?? "",
    },
  });
}

export function logCommandeFactureCreated(
  commande: Commande,
  label: string,
  meta?: Record<string, string>,
): Commande {
  return appendCommandeHistorique(commande, {
    type: "facture_creee",
    label,
    meta,
  });
}

export function applyCommandeStatutChange(
  commande: Commande,
  nextStatut: StatutCommande,
): Commande {
  if (commande.statut === nextStatut) return commande;

  let next: Commande = { ...commande, statut: nextStatut };

  if (nextStatut === "terminee" && !commande.historique?.some((item) => item.type === "terminee")) {
    next = appendCommandeHistorique(next, {
      type: "terminee",
      label: COMMANDE_STATUT_HISTORY_LABELS.terminee,
    });
  }

  if (nextStatut === "annulee" && !commande.historique?.some((item) => item.type === "annulee")) {
    next = appendCommandeHistorique(next, {
      type: "annulee",
      label: COMMANDE_STATUT_HISTORY_LABELS.annulee,
    });
  }

  if (nextStatut === "en_cours" && commande.statut !== "en_cours") {
    next = appendCommandeHistorique(next, {
      type: "modifie",
      label: COMMANDE_STATUT_HISTORY_LABELS.en_cours,
    });
  }

  return next;
}

export type { CommandeHistoriqueType };
