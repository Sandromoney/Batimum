import type { Devis, DevisHistoriqueEntry, DevisHistoriqueType, StatutDevis } from "./types";
import { generateId } from "./utils";

/** Statuts finaux avant archivage — jamais de retour automatique en brouillon. */
const LOCKED_CONTENT_STATUTS: StatutDevis[] = [
  "signe",
  "refuse",
  "expire",
  "archive",
];

const ALLOWED_TRANSITIONS: Record<StatutDevis, StatutDevis[]> = {
  brouillon: ["envoye"],
  envoye: ["signe", "refuse", "expire", "en_attente", "accepte"],
  en_attente: ["signe", "refuse", "expire", "accepte"],
  en_retard: ["signe", "refuse", "expire"],
  accepte: ["signe", "archive"],
  signe: ["archive"],
  refuse: ["archive"],
  expire: ["archive"],
  archive: [],
};

export const MANUAL_DEVIS_STATUT_OPTIONS: StatutDevis[] = [
  "brouillon",
  "envoye",
  "accepte",
  "signe",
  "refuse",
  "expire",
  "archive",
];

export function getDevisActorName(utilisateur?: string): string {
  return utilisateur?.trim() || "Utilisateur";
}

export function isDevisContentLocked(devis: Pick<Devis, "statut">): boolean {
  return LOCKED_CONTENT_STATUTS.includes(devis.statut);
}

export function canTransitionDevisStatut(
  current: StatutDevis,
  next: StatutDevis,
): boolean {
  if (current === next) return true;
  if (current === "signe" && next === "brouillon") return false;
  if (current === "archive") return false;
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}

export function getAllowedManualStatuts(current: StatutDevis): StatutDevis[] {
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  const options = MANUAL_DEVIS_STATUT_OPTIONS.filter(
    (statut) => statut === current || allowed.includes(statut),
  );
  if (!options.includes(current)) {
    return [current, ...options];
  }
  return options;
}

function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getDevisValiditeFin(devis: Devis): string {
  const dateDevis = devis.dateDevis ?? devis.date;
  return addDaysIso(dateDevis, devis.validiteJours ?? 30);
}

export function isDevisExpired(devis: Devis, today = new Date().toISOString().slice(0, 10)): boolean {
  if (
    devis.statut === "signe" ||
    devis.statut === "refuse" ||
    devis.statut === "archive" ||
    devis.statut === "brouillon"
  ) {
    return false;
  }
  return today > getDevisValiditeFin(devis);
}

export function getDevisDisplayStatut(devis: Devis): StatutDevis {
  if (devis.statut === "archive") return "archive";
  if (devis.statut === "expire") return "expire";
  if (isDevisExpired(devis)) return "expire";
  return devis.statut;
}

export function createDevisHistoriqueEntry(
  type: DevisHistoriqueType,
  label: string,
  meta?: Record<string, string>,
): DevisHistoriqueEntry {
  return {
    id: generateId(),
    type,
    label,
    date: new Date().toISOString(),
    meta,
  };
}

export function appendDevisHistorique(
  devis: Devis,
  entry: Omit<DevisHistoriqueEntry, "id" | "date"> & { date?: string },
  actor?: string,
): Devis {
  const utilisateur = actor?.trim() || entry.meta?.utilisateur;
  const historique = [
    ...(devis.historique ?? []),
    {
      id: generateId(),
      type: entry.type,
      label: entry.label,
      date: entry.date ?? new Date().toISOString(),
      meta: {
        ...entry.meta,
        ...(utilisateur ? { utilisateur } : {}),
      },
    },
  ];
  return { ...devis, historique };
}

function appendStatutHistorique(
  devis: Devis,
  nextStatut: StatutDevis,
  label: string,
  actor?: string,
  extraMeta?: Record<string, string>,
): Devis {
  return appendDevisHistorique(
    devis,
    {
      type: nextStatut === "archive" ? "archive" : "modifie",
      label,
      meta: {
        ancienStatut: devis.statut,
        nouveauStatut: nextStatut,
        ...extraMeta,
      },
    },
    actor,
  );
}

export function syncDevisExpireStatut(devis: Devis, actor = "Système"): Devis {
  if (!isDevisExpired(devis) || devis.statut === "expire") return devis;
  if (!canTransitionDevisStatut(devis.statut, "expire")) return devis;

  const alreadyLogged = devis.historique?.some((item) => item.type === "expire");
  let next: Devis = { ...devis, statut: "expire" };
  if (!alreadyLogged) {
    next = appendDevisHistorique(
      next,
      {
        type: "expire",
        label: "Devis expiré",
      },
      actor,
    );
  }
  return next;
}

export function markDevisCreated(devis: Devis, actor?: string): Devis {
  if (devis.historique?.some((item) => item.type === "cree")) return devis;
  return appendDevisHistorique(
    devis,
    {
      type: "cree",
      label: "Devis créé.",
    },
    actor,
  );
}

export function markDevisEnvoye(devis: Devis, actor = "Système"): Devis {
  if (devis.statut === "signe" || devis.statut === "refuse" || devis.statut === "archive") {
    return devis;
  }
  if (!canTransitionDevisStatut(devis.statut, "envoye") && devis.statut !== "envoye") {
    return devis;
  }

  const now = new Date().toISOString();
  const wasFirstSend = !devis.sentAt;

  let next: Devis = {
    ...devis,
    statut: "envoye",
    sentAt: devis.sentAt ?? now,
  };

  if (wasFirstSend) {
    next = appendDevisHistorique(
      next,
      {
        type: "envoye",
        label: "Envoyé au client.",
        date: now,
      },
      actor,
    );
  }

  return next;
}

export type MarkDevisSignedInput = {
  signature: string;
  signedBy: string;
  clientIp?: string;
  signatureId?: string;
  signedPdfBase64?: string;
};

export function markDevisSigned(
  devis: Devis,
  input: MarkDevisSignedInput,
  actor?: string,
): Devis {
  if (devis.statut === "refuse" || devis.statut === "signe" || devis.statut === "archive") {
    return devis;
  }
  if (!canTransitionDevisStatut(devis.statut, "signe")) return devis;

  const now = new Date().toISOString();
  const signatureId = input.signatureId ?? generateId();
  const historyActor = actor ?? input.signedBy ?? "Client";

  let next: Devis = {
    ...devis,
    statut: "signe",
    signature: input.signature,
    nomSignataire: input.signedBy,
    signedBy: input.signedBy,
    dateSignature: now,
    signedAt: now,
    clientIp: input.clientIp,
    signatureId,
    signedPdfBase64: input.signedPdfBase64 ?? devis.signedPdfBase64,
    signedPdfGeneratedAt: input.signedPdfBase64 ? now : devis.signedPdfGeneratedAt,
  };

  if (!devis.signedAt) {
    next = appendDevisHistorique(
      next,
      {
        type: "signe",
        label: "Signé.",
        date: now,
        meta: {
          signataire: input.signedBy,
          utilisateur: input.signedBy,
          ancienStatut: devis.statut,
          nouveauStatut: "signe",
          verrouille: "true",
          ...(input.clientIp ? { clientIp: input.clientIp } : {}),
          signatureId,
        },
      },
      historyActor,
    );
  }

  return next;
}

export function markDevisModifie(devis: Devis, actor?: string): Devis {
  return appendDevisHistorique(
    devis,
    {
      type: "modifie",
      label: "Devis modifié",
    },
    actor,
  );
}

export const DEVIS_REFUSAL_REASONS = [
  "Prix trop élevé",
  "Projet reporté",
  "Projet annulé",
  "Autre entreprise choisie",
  "Autre",
] as const;

export type DevisRefusalReason = (typeof DEVIS_REFUSAL_REASONS)[number];

export type MarkDevisRefusedInput = {
  refusedBy?: string;
  refusalReason?: string;
  clientIp?: string;
};

export function markDevisRefusedByClient(
  devis: Devis,
  input: MarkDevisRefusedInput = {},
  actor?: string,
): Devis {
  if (devis.statut === "signe" || devis.statut === "archive") return devis;
  if (devis.statut === "refuse" && devis.refusedAt) return devis;
  if (!canTransitionDevisStatut(devis.statut, "refuse")) return devis;

  const now = new Date().toISOString();
  const refusedBy = input.refusedBy?.trim() || "client";
  const historyActor = actor ?? refusedBy;

  let next: Devis = {
    ...devis,
    statut: "refuse",
    refusedAt: now,
    refusedBy,
    refusalReason: input.refusalReason?.trim() || undefined,
    clientIp: input.clientIp ?? devis.clientIp,
  };

  if (!devis.historique?.some((item) => item.type === "refuse")) {
    next = appendDevisHistorique(
      next,
      {
        type: "refuse",
        label: "Devis refusé par le client",
        date: now,
        meta: {
          refusedBy,
          ...(input.refusalReason?.trim()
            ? { motif: input.refusalReason.trim() }
            : {}),
          ...(input.clientIp ? { clientIp: input.clientIp } : {}),
        },
      },
      historyActor,
    );
  }

  return next;
}

export function markDevisRefuse(devis: Devis, actor?: string): Devis {
  return markDevisRefusedByClient(devis, { refusedBy: "entreprise" }, actor);
}

/** Déverrouillage exceptionnel — jamais automatique. */
export function unlockSignedDevisExceptionally(
  devis: Devis,
  actor?: string,
): Devis {
  if (devis.statut !== "signe") return devis;

  let next: Devis = {
    ...devis,
    statut: "brouillon",
    signature: undefined,
    nomSignataire: undefined,
    signedBy: undefined,
    dateSignature: undefined,
    signedAt: undefined,
    clientIp: undefined,
    signatureId: undefined,
    signedPdfBase64: undefined,
    signedPdfGeneratedAt: undefined,
  };

  next = appendDevisHistorique(
    next,
    {
      type: "modifie",
      label: "Devis déverrouillé exceptionnellement (signature annulée)",
      meta: {
        ancienStatut: "signe",
        nouveauStatut: "brouillon",
        deverrouillageExceptionnel: "true",
      },
    },
    actor,
  );

  return next;
}

/** @deprecated Utiliser unlockSignedDevisExceptionally — jamais en automatique. */
export function reopenSignedDevisForEdit(devis: Devis, actor?: string): Devis {
  return unlockSignedDevisExceptionally(devis, actor);
}

export function applyManualDevisStatut(
  devis: Devis,
  nextStatut: StatutDevis,
  actor?: string,
): Devis {
  if (devis.statut === nextStatut) return devis;
  if (!canTransitionDevisStatut(devis.statut, nextStatut)) return devis;
  if (nextStatut === "signe" && !devis.signature && !devis.signedAt) return devis;

  const label = `Statut modifié : ${getDevisStatutLabel(devis.statut)} → ${getDevisStatutLabel(nextStatut)}`;

  let next: Devis = { ...devis, statut: nextStatut };

  if (nextStatut === "signe" && !devis.signedAt) {
    const now = new Date().toISOString();
    next = {
      ...next,
      signedAt: now,
      dateSignature: now,
      nomSignataire: devis.nomSignataire ?? actor ?? "Entreprise",
      signedBy: devis.signedBy ?? actor ?? "Entreprise",
    };
  }

  if (nextStatut === "envoye" && !devis.sentAt) {
    next = { ...next, sentAt: new Date().toISOString() };
  }

  if (nextStatut === "refuse" && !devis.refusedAt) {
    next = {
      ...next,
      refusedAt: new Date().toISOString(),
      refusedBy: actor ?? "entreprise",
    };
  }

  return appendStatutHistorique(next, nextStatut, label, actor, {
    statutManuel: "true",
  });
}

export function getDevisStatutLabel(statut: StatutDevis): string {
  const labels: Record<StatutDevis, string> = {
    brouillon: "Brouillon",
    envoye: "Envoyé",
    signe: "Signé",
    refuse: "Refusé",
    expire: "Expiré",
    archive: "Archivé",
    en_attente: "En attente",
    en_retard: "En retard",
    accepte: "Accepté",
  };
  return labels[statut];
}

export async function resolveClientIpForSignature(): Promise<string | undefined> {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return undefined;
    const data = (await response.json()) as { ip?: string };
    return data.ip?.trim() || undefined;
  } catch {
    return undefined;
  }
}
