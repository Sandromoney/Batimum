"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultData } from "./data";
import { syncAppData } from "./app-sync";
import { normalizeBibliothequeEntreprise } from "@/lib/bibliotheque-entreprise";
import { normalizeClient } from "@/lib/clients";
import { normalizeMumIaHistorique } from "@/lib/mum-ia-historique";
import { normalizeParametres } from "./parametres";
import { applyTheme, normalizeThemePreference } from "./theme";
import { fetchUserSettings } from "./user-settings-client";
import type { AppData } from "./types";

const STORAGE_KEY = "btp-gestion-data";
const SIGNED_PDF_PREFIX = "btp-gestion-signed-pdf:";

export function saveSignedDevisPdf(devisId: string, base64: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${SIGNED_PDF_PREFIX}${devisId}`, base64);
  } catch {
    /* quota dépassé — le PDF reste téléchargeable à la signature */
  }
}

export function loadSignedDevisPdf(devisId: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return localStorage.getItem(`${SIGNED_PDF_PREFIX}${devisId}`) ?? undefined;
  } catch {
    return undefined;
  }
}

function stripHeavyDevisFields(data: AppData): AppData {
  return {
    ...data,
    devis: data.devis.map((devis) => ({
      ...devis,
      signedPdfBase64: undefined,
    })),
  };
}

function persistData(data: AppData): void {
  const payload: AppData = {
    ...data,
    avoirs: Array.isArray(data.avoirs) ? data.avoirs : [],
    parametres: {
      ...data.parametres,
      theme: normalizeThemePreference(data.parametres.theme),
    },
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return;
  } catch {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripHeavyDevisFields(payload)));
    } catch {
      /* dernier recours : ne pas bloquer l'app */
    }
  }
}

type StoreContextValue = {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  update: (patch: Partial<AppData>) => void;
  reset: () => void;
  hydrated: boolean;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function loadData(): AppData {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      parametres: normalizeParametres({
        ...defaultData.parametres,
        ...parsed.parametres,
        theme: normalizeThemePreference(parsed.parametres?.theme),
      }),
      clients: Array.isArray(parsed.clients)
        ? parsed.clients.map((client) =>
            normalizeClient({
              ...client,
              typeClient:
                client.typeClient === "professionnel"
                  ? "professionnel"
                  : "particulier",
              email: client.email ?? "",
              adresse: client.adresse ?? "",
              codePostal: client.codePostal ?? "",
              ville: client.ville ?? "",
            }),
          )
        : defaultData.clients,
      devis: Array.isArray(parsed.devis) ? parsed.devis : defaultData.devis,
      chantiers: Array.isArray(parsed.chantiers)
        ? parsed.chantiers.map((chantier) => ({
            ...chantier,
            achats: Array.isArray(chantier.achats) ? chantier.achats : [],
          }))
        : defaultData.chantiers,
      commandes: Array.isArray(parsed.commandes)
        ? parsed.commandes
        : defaultData.commandes,
      factures: Array.isArray(parsed.factures)
        ? parsed.factures.map((facture) => ({
            ...facture,
            typeFacture:
              facture.typeFacture === "acompte" ||
              facture.typeFacture === "situation" ||
              facture.typeFacture === "solde"
                ? facture.typeFacture
                : "classique",
            lignes: Array.isArray(facture.lignes) ? facture.lignes : undefined,
            devisSourceId: facture.devisSourceId || undefined,
            devisLieId: facture.devisLieId || facture.devisSourceId || undefined,
            chantierLieId: facture.chantierLieId || facture.chantierId || undefined,
          }))
        : defaultData.factures,
      avoirs: Array.isArray(parsed.avoirs) ? parsed.avoirs : defaultData.avoirs,
      employes: Array.isArray(parsed.employes)
        ? parsed.employes.map((employe) => ({
            ...employe,
            prenom: employe.prenom ?? "",
            nom: employe.nom ?? "",
            photo: employe.photo || undefined,
            poste: employe.poste || undefined,
            email: employe.email?.trim() || undefined,
            identifiant: employe.identifiant?.trim() || undefined,
            telephone: employe.telephone?.trim() || undefined,
            statut:
              employe.statut === "desactive" ? "desactive" : ("actif" as const),
          }))
        : defaultData.employes,
      planning: Array.isArray(parsed.planning)
        ? parsed.planning.map((event) => ({
            ...event,
            employeIds: Array.isArray(event.employeIds) ? event.employeIds : [],
            employeTermineIds: Array.isArray(event.employeTermineIds)
              ? event.employeTermineIds
              : [],
            employeProblemes: Array.isArray(event.employeProblemes)
              ? event.employeProblemes
              : [],
            affectationId: event.affectationId || undefined,
          }))
        : defaultData.planning,
      affectations: Array.isArray(parsed.affectations)
        ? parsed.affectations.map((item) => ({
            ...item,
            employeIds: Array.isArray(item.employeIds) ? item.employeIds : [],
            joursSemaine: Array.isArray(item.joursSemaine) ? item.joursSemaine : [1, 2, 3, 4, 5],
            note: item.note?.trim() || undefined,
          }))
        : defaultData.affectations,
      notifications: Array.isArray(parsed.notifications)
        ? parsed.notifications
        : defaultData.notifications,
      deletedNotificationKeys: Array.isArray(parsed.deletedNotificationKeys)
        ? parsed.deletedNotificationKeys
        : defaultData.deletedNotificationKeys,
      relances: Array.isArray(parsed.relances)
        ? parsed.relances
        : defaultData.relances,
      bibliothequeEntreprise: normalizeBibliothequeEntreprise(
        parsed.bibliothequeEntreprise ?? defaultData.bibliothequeEntreprise,
      ),
      mumIaHistorique: normalizeMumIaHistorique(
        parsed.mumIaHistorique ?? defaultData.mumIaHistorique,
      ),
    };
  } catch {
    return defaultData;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [hydrated, setHydrated] = useState(false);

  useLayoutEffect(() => {
    const loaded = syncAppData(loadData());
    applyTheme(loaded.parametres.theme);
    setData(loaded);
    setHydrated(true);

    void (async () => {
      const remote = await fetchUserSettings();
      if (remote.unauthorized || !remote.parametres) return;

      const parametres = normalizeParametres(remote.parametres);
      setData((prev) =>
        syncAppData({
          ...prev,
          parametres,
          employes:
            remote.employes && remote.employes.length > 0
              ? remote.employes
              : prev.employes,
        }),
      );
      applyTheme(parametres.theme);
    })();
  }, []);

  useLayoutEffect(() => {
    if (!hydrated) return;
    applyTheme(data.parametres.theme);
  }, [hydrated, data.parametres.theme]);

  useEffect(() => {
    if (!hydrated) return;
    persistData(data);
  }, [data, hydrated]);

  const update = useCallback((patch: Partial<AppData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    applyTheme(defaultData.parametres.theme);
    setData(defaultData);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ data, setData, update, reset, hydrated }),
    [data, update, reset, hydrated],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
