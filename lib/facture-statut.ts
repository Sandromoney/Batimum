import type {
  Facture,
  FactureHistoriqueEntry,
  FactureHistoriqueType,
  StatutFacture,
  TypeFacture,
} from "./types";
import { generateId } from "./utils";

export function getFactureCreatedLabel(type?: TypeFacture): string {
  switch (type) {
    case "acompte":
      return "Facture d'acompte créée.";
    case "situation":
      return "Facture de situation créée.";
    case "solde":
      return "Facture de solde créée.";
    default:
      return "Facture créée.";
  }
}
const PAID_STATUTS: StatutFacture[] = ["payee", "avoir_total"];
const OVERDUE_ELIGIBLE: StatutFacture[] = [
  "envoyee",
  "en_attente",
  "en_retard",
  "brouillon",
];

export function isFacturePayee(facture: Facture): boolean {
  return PAID_STATUTS.includes(facture.statut);
}

export function isFactureOverdue(
  facture: Facture,
  today = new Date().toISOString().slice(0, 10),
): boolean {
  if (isFacturePayee(facture) || facture.statut === "avoir_partiel") return false;
  if (!facture.dateEcheance) return false;
  return today > facture.dateEcheance;
}

export function getFactureDisplayStatut(facture: Facture): StatutFacture {
  if (facture.statut === "en_retard") return "en_retard";
  if (isFactureOverdue(facture)) return "en_retard";
  return facture.statut;
}

function appendFactureHistorique(
  facture: Facture,
  entry: Omit<FactureHistoriqueEntry, "id" | "date"> & { date?: string },
): Facture {
  const historique = [
    ...(facture.historique ?? []),
    {
      id: generateId(),
      type: entry.type,
      label: entry.label,
      date: entry.date ?? new Date().toISOString(),
      meta: entry.meta,
    },
  ];
  return { ...facture, historique };
}

export function syncFactureEnRetardStatut(facture: Facture): Facture {
  if (!isFactureOverdue(facture) || facture.statut === "en_retard") return facture;
  if (!OVERDUE_ELIGIBLE.includes(facture.statut)) return facture;

  const alreadyLogged = facture.historique?.some((item) => item.type === "en_retard");
  let next: Facture = { ...facture, statut: "en_retard" };
  if (!alreadyLogged) {
    next = appendFactureHistorique(next, {
      type: "en_retard",
      label: "Facture en retard de paiement",
    });
  }
  return next;
}

export function markFactureCreated(facture: Facture): Facture {
  if (facture.historique?.some((item) => item.type === "cree")) return facture;
  return appendFactureHistorique(facture, {
    type: "cree",
    label: getFactureCreatedLabel(facture.typeFacture),
    meta: {
      typeFacture: facture.typeFacture ?? "classique",
      factureNumero: facture.numero,
    },
  });
}
export function markFactureEnvoyee(facture: Facture): Facture {
  if (isFacturePayee(facture)) return facture;

  const now = new Date().toISOString();
  let next: Facture = {
    ...facture,
    statut:
      facture.statut === "brouillon" || facture.statut === "envoyee"
        ? "envoyee"
        : facture.statut,
  };

  if (!facture.historique?.some((item) => item.type === "envoyee")) {
    next = appendFactureHistorique(next, {
      type: "envoyee",
      label: "Envoyée au client.",
      date: now,
    });
  }

  return next;
}

export function markFacturePayee(facture: Facture): Facture {
  if (facture.statut === "payee") return facture;

  const now = new Date().toISOString().slice(0, 10);
  let next: Facture = {
    ...facture,
    statut: "payee",
    datePaiement: facture.datePaiement ?? now,
  };

  if (!facture.historique?.some((item) => item.type === "payee")) {
    next = appendFactureHistorique(next, {
      type: "payee",
      label: "Facture payée.",
      date: new Date().toISOString(),
      meta: { datePaiement: next.datePaiement ?? now },
    });
  }

  return next;
}

export function markFactureRelancee(
  facture: Facture,
  options?: { label?: string; meta?: Record<string, string> },
): Facture {
  return appendFactureHistorique(facture, {
    type: "relance",
    label: options?.label ?? "Relance envoyée au client",
    meta: options?.meta,
  });
}

export function applyFactureStatutChange(
  facture: Facture,
  nextStatut: StatutFacture,
): Facture {
  if (facture.statut === nextStatut) return facture;

  let next: Facture = { ...facture, statut: nextStatut };

  if (nextStatut === "payee") {
    next = markFacturePayee(next);
  } else if (nextStatut === "envoyee") {
    next = markFactureEnvoyee(next);
  } else if (facture.statut === "payee") {
    next = { ...next, datePaiement: undefined };
  }

  return next;
}

export type { FactureHistoriqueType };
