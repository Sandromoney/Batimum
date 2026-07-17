import { computeDevisCoutMateriauxPrevu } from "@/lib/pilotage/calculations";
import {
  inferCategoriePilotageFromTypeChantier,
} from "@/lib/pilotage/categories";
import type { CategoriePilotageChantier, Devis } from "@/lib/types";

/** Préparation MUM IA — infère les champs pilotage depuis un devis existant. */
export type PilotageDevisInference = {
  categoriePilotage?: CategoriePilotageChantier;
  heuresPrevues?: number;
  tauxHoraireInterne?: number;
  coutMateriauxEstimeHT: number;
  typeChantier?: Devis["typeChantier"];
};

export function inferPilotageFromDevis(
  devis: Devis,
  entrepriseTauxDefaut?: number,
): PilotageDevisInference {
  const mo = devis.pilotageMainOeuvre;
  const categoriePilotage =
    devis.categoriePilotage ??
    inferCategoriePilotageFromTypeChantier(devis.typeChantier);

  return {
    categoriePilotage,
    heuresPrevues: mo?.heuresPrevues,
    tauxHoraireInterne: mo?.tauxHoraireInterne ?? entrepriseTauxDefaut,
    coutMateriauxEstimeHT: computeDevisCoutMateriauxPrevu(devis),
    typeChantier: devis.typeChantier,
  };
}

export function applyInferredPilotageToDevis(
  devis: Devis,
  entrepriseTauxDefaut?: number,
): Devis {
  const inferred = inferPilotageFromDevis(devis, entrepriseTauxDefaut);
  const patch: Partial<Devis> = {};

  if (!devis.categoriePilotage && inferred.categoriePilotage) {
    patch.categoriePilotage = inferred.categoriePilotage;
  }

  const mo = devis.pilotageMainOeuvre ?? {};
  const nextMo = { ...mo };
  let moChanged = false;

  if (!mo.heuresPrevues && inferred.heuresPrevues) {
    nextMo.heuresPrevues = inferred.heuresPrevues;
    moChanged = true;
  }
  if (!mo.tauxHoraireInterne && inferred.tauxHoraireInterne) {
    nextMo.tauxHoraireInterne = inferred.tauxHoraireInterne;
    moChanged = true;
  }

  if (moChanged) {
    patch.pilotageMainOeuvre = nextMo;
  }

  if (Object.keys(patch).length === 0) return devis;
  return { ...devis, ...patch };
}
