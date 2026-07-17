import {
  migrateToEntreprisePriceLibrary,
  syncBibliothequeFromPriceLibrary,
} from "@/lib/entreprise-price-library/normalize";
import { normalizeParametres } from "@/lib/parametres";
import type { AppData } from "@/lib/types";

/** Migre et synchronise la bibliothèque prix unifiée sans ré-apprendre à chaque chargement. */
export function syncAppDataPriceLibrary(
  data: AppData,
  companyId = "",
): AppData {
  const parametres = normalizeParametres(data.parametres);
  const library = migrateToEntreprisePriceLibrary({
    library: parametres.entreprisePriceLibrary,
    bibliotheque: data.bibliothequeEntreprise,
    parametres,
    companyId,
  });

  const bibliothequeEntreprise = syncBibliothequeFromPriceLibrary(
    data.bibliothequeEntreprise,
    library,
  );

  return {
    ...data,
    parametres: {
      ...parametres,
      entreprisePriceLibrary: library,
    },
    bibliothequeEntreprise,
  };
}
