import { syncBibliothequeFromDevisList } from "@/lib/bibliotheque-entreprise";
import type { AppData, Devis } from "@/lib/types";

/** Met à jour la bibliothèque discrètement après modification des devis. */
export function applyBibliothequeOnDevisUpdate(
  previous: AppData,
  nextDevis: Devis[],
): Pick<AppData, "bibliothequeEntreprise"> {
  return {
    bibliothequeEntreprise: syncBibliothequeFromDevisList(
      previous.bibliothequeEntreprise,
      previous.devis,
      nextDevis,
    ),
  };
}

export function patchAppDataDevis(
  previous: AppData,
  nextDevis: Devis[],
): AppData {
  return {
    ...previous,
    devis: nextDevis,
    ...applyBibliothequeOnDevisUpdate(previous, nextDevis),
  };
}
