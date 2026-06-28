import { syncChantierStatut } from "@/lib/chantier-statut";
import { syncDevisExpireStatut } from "@/lib/devis-statut";
import { syncFactureRelancesAutomatiques } from "@/lib/facture-relances-auto";
import { syncFactureEnRetardStatut } from "@/lib/facture-statut";
import { normalizeFacture } from "@/lib/electronic-invoice";
import type { AppData } from "@/lib/types";

/** Synchronise les statuts dérivés sur l’ensemble des données. */
export function syncAppData(data: AppData): AppData {
  let changed = false;

  const devis = data.devis.map((item) => {
    const next = syncDevisExpireStatut(item);
    if (next !== item) changed = true;
    return next;
  });

  const factures = data.factures.map((item) => {
    const normalized = normalizeFacture(item);
    const next = syncFactureEnRetardStatut(normalized);
    if (next !== item) changed = true;
    return next;
  });

  let facturesWithRelances = factures;
  let relances = data.relances;
  const relanceSync = syncFactureRelancesAutomatiques({ ...data, devis, factures });
  if (
    relanceSync.factures !== factures ||
    relanceSync.relances !== data.relances
  ) {
    changed = true;
    facturesWithRelances = relanceSync.factures;
    relances = relanceSync.relances;
  }

  const chantiers = data.chantiers.map((item) => {
    const next = syncChantierStatut(item);
    if (next !== item) changed = true;
    return next;
  });

  if (!changed) return data;
  return { ...data, devis, factures: facturesWithRelances, relances, chantiers };
}
