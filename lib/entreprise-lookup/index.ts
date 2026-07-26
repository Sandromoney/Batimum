import type {
  EntrepriseLookupProvider,
  EntrepriseLookupResult,
} from "@/lib/entreprise-lookup/types";
import {
  isValidSiretFormat,
  normalizeSiretDigits,
} from "@/lib/entreprise-lookup/types";

/**
 * Provider stub — aucune API externe appelée.
 * Remplacer / activer un provider réel (recherche-entreprises) via getEntrepriseLookupProvider().
 */
export const stubEntrepriseLookupProvider: EntrepriseLookupProvider = {
  id: "stub-not-connected",
  connected: false,

  async lookupBySiret(siret: string): Promise<EntrepriseLookupResult> {
    const digits = normalizeSiretDigits(siret);
    if (!isValidSiretFormat(digits)) {
      return {
        status: "invalid_query",
        message: "Le SIRET doit contenir exactement 14 chiffres.",
      };
    }

    return {
      status: "not_connected",
      message:
        "La recherche automatique par SIRET n’est pas encore connectée. Saisissez les informations manuellement, ou continuez si votre entreprise est en cours de création.",
    };
  },
};

/**
 * Point d’entrée unique. Aujourd’hui : stub uniquement.
 * Plus tard : basculer selon ENTREPRISE_LOOKUP_PROVIDER / feature flag.
 */
export function getEntrepriseLookupProvider(): EntrepriseLookupProvider {
  return stubEntrepriseLookupProvider;
}

export async function lookupEntrepriseBySiret(
  siret: string,
): Promise<EntrepriseLookupResult> {
  return getEntrepriseLookupProvider().lookupBySiret(siret);
}
