import {
  calculateChantierAvancement,
  getChantierEtapes,
} from "@/lib/chantiers";
import type {
  Chantier,
  ChantierHistoriqueEntry,
  ChantierHistoriqueType,
  StatutChantier,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

const AUTO_SKIP_STATUTS: StatutChantier[] = ["suspendu"];

export function isChantierComplete(chantier: Chantier): boolean {
  const etapes = getChantierEtapes(chantier);
  const avancement = calculateChantierAvancement(etapes);
  if (avancement >= 100) return true;
  return etapes.length > 0 && etapes.every((etape) => etape.fait);
}

export function resolveAutoChantierStatut(
  chantier: Chantier,
  today = new Date().toISOString().slice(0, 10),
): StatutChantier {
  if (isChantierComplete(chantier)) return "termine";

  const etapes = getChantierEtapes(chantier);
  const avancement = calculateChantierAvancement(etapes);
  const dateDebut = chantier.dateDebut;
  const dateFin = chantier.dateFin?.trim();

  if (dateFin && today > dateFin) return "en_retard";
  if (dateDebut && today > dateDebut && avancement === 0) return "retard_demarrage";
  if (dateDebut && today >= dateDebut) return "en_cours";

  return "planifie";
}

export function appendChantierHistorique(
  chantier: Chantier,
  entry: Omit<ChantierHistoriqueEntry, "id" | "date"> & { date?: string },
): Chantier {
  const historique = [
    ...(chantier.historique ?? []),
    {
      id: generateId(),
      type: entry.type,
      label: entry.label,
      date: entry.date ?? new Date().toISOString(),
      meta: entry.meta,
    },
  ];
  return { ...chantier, historique };
}

function hadRetardInHistory(chantier: Chantier): boolean {
  return (
    chantier.historique?.some(
      (item) => item.type === "en_retard" || item.type === "retard_demarrage",
    ) ?? false
  );
}

function logChantierStatutTransition(
  chantier: Chantier,
  previous: StatutChantier,
  next: StatutChantier,
): Chantier {
  if (previous === next) return chantier;

  let updated = chantier;

  if (next === "en_cours" && !chantier.historique?.some((item) => item.type === "demarre")) {
    updated = appendChantierHistorique(updated, {
      type: "demarre",
      label: "Chantier démarré",
    });
  }

  if (next === "en_retard" && !chantier.historique?.some((item) => item.type === "en_retard")) {
    updated = appendChantierHistorique(updated, {
      type: "en_retard",
      label: "Chantier passé en retard",
    });
  }

  if (next === "retard_demarrage") {
    const alreadyLogged = chantier.historique?.some(
      (item) => item.type === "retard_demarrage",
    );
    if (!alreadyLogged) {
      updated = appendChantierHistorique(updated, {
        type: "retard_demarrage",
        label: "Retard de démarrage",
      });
    }
  }

  if (next === "termine") {
    const finishedAfterDelay =
      previous === "en_retard" ||
      previous === "retard_demarrage" ||
      hadRetardInHistory(chantier);

    if (finishedAfterDelay) {
      if (!chantier.historique?.some((item) => item.type === "termine_apres_retard")) {
        updated = appendChantierHistorique(updated, {
          type: "termine_apres_retard",
          label: "Chantier terminé après retard",
        });
      }
    } else if (!chantier.historique?.some((item) => item.type === "termine")) {
      updated = appendChantierHistorique(updated, {
        type: "termine",
        label: "Chantier terminé",
      });
    }
  }

  return updated;
}

export function syncChantierStatut(
  chantier: Chantier,
  today = new Date().toISOString().slice(0, 10),
): Chantier {
  if (AUTO_SKIP_STATUTS.includes(chantier.statut) && !isChantierComplete(chantier)) {
    return chantier;
  }

  const nextStatut = resolveAutoChantierStatut(chantier, today);
  if (nextStatut === chantier.statut) return chantier;

  let next = logChantierStatutTransition(
    { ...chantier, statut: nextStatut },
    chantier.statut,
    nextStatut,
  );

  return { ...next, statut: nextStatut };
}

export function markChantierCreated(chantier: Chantier): Chantier {
  let next: Chantier = {
    ...chantier,
    statut: "planifie",
  };

  if (!chantier.historique?.some((item) => item.type === "cree")) {
    next = appendChantierHistorique(next, {
      type: "cree",
      label: "Chantier créé.",
    });
  }

  return syncChantierStatut(next);
}

export type { ChantierHistoriqueType };
