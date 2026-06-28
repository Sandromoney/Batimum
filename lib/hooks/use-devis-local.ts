"use client";

import { useCallback, useMemo } from "react";
import { useStore } from "@/lib/store";
import { patchAppDataDevis } from "@/lib/app-devis-bibliotheque";
import { isClientAddressComplete } from "@/lib/clients";
import { recordDevisCreatedForClient } from "@/lib/historique-events";
import {
  countDevisByDisplayStatut,
  createDevisBrouillon,
  type CreateDevisBrouillonInput,
} from "@/lib/devis";
import type { Devis } from "@/lib/types";

export type DevisCounters = {
  total: number;
  brouillon: number;
  envoye: number;
  signe: number;
  accepte: number;
  refuse: number;
  expire: number;
};

/** État local des devis (persisté via localStorage du store). */
export function useDevisLocal() {
  const { data, setData, hydrated } = useStore();

  const devis = data.devis;
  const clients = data.clients;

  const counters = useMemo<DevisCounters>(() => {
    const byStatut = countDevisByDisplayStatut(devis);
    return {
      total: devis.length,
      brouillon: byStatut.brouillon,
      envoye: byStatut.envoye,
      signe: byStatut.signe,
      accepte: byStatut.accepte,
      refuse: byStatut.refuse,
      expire: byStatut.expire,
    };
  }, [devis]);

  const setDevis = useCallback(
    (updater: Devis[] | ((prev: Devis[]) => Devis[])) => {
      setData((prev) => {
        const nextDevis =
          typeof updater === "function" ? updater(prev.devis) : updater;
        return patchAppDataDevis(prev, nextDevis);
      });
    },
    [setData],
  );

  const addDevisBrouillon = useCallback(
    (input?: CreateDevisBrouillonInput) => {
      const resolvedClientId = input?.clientId ?? clients[0]?.id ?? "";
      const client = clients.find((item) => item.id === resolvedClientId);
      if (!isClientAddressComplete(client)) return null;

      const draft = createDevisBrouillon(clients, devis, input, data.parametres);
      if (!draft) return null;
      const recorded = recordDevisCreatedForClient({ devis: draft, client });

      setData((prev) => ({
        ...prev,
        devis: [recorded.devis, ...prev.devis],
        clients: recorded.client
          ? prev.clients.map((item) =>
              item.id === recorded.client!.id ? recorded.client! : item,
            )
          : prev.clients,
      }));
      return recorded.devis;
    },
    [clients, data.parametres, devis, setData],
  );

  const removeDevis = useCallback(
    (id: string) => {
      setDevis((prev) => prev.filter((devis) => devis.id !== id));
    },
    [setDevis],
  );

  const getDevisById = useCallback(
    (id: string) => devis.find((d) => d.id === id),
    [devis],
  );

  return {
    devis,
    clients,
    counters,
    setDevis,
    addDevisBrouillon,
    removeDevis,
    getDevisById,
    hydrated,
  };
}
