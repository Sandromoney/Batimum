"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getAccount, isEmployeAccount } from "@/lib/account";
import { emptyAppData } from "@/lib/app-data-empty";
import { syncAppData } from "./app-sync";
import {
  markLocalImportDone,
  readScopedCache,
  tryBuildLocalImport,
  writeScopedCache,
  workspaceOrEmpty,
} from "@/lib/local-data-import";
import { syncAppDataPriceLibrary } from "./price-library-sync";
import { applyTheme, normalizeThemePreference } from "./theme";
import { fetchUserSettings, saveUserSettings } from "./user-settings-client";
import type { AppData } from "./types";
import { appDataToWorkspace } from "@/lib/user-settings-types";
import { createClient } from "@/utils/supabase/client";

const SIGNED_PDF_PREFIX = "btp-gestion-signed-pdf:";

export function saveSignedDevisPdf(devisId: string, base64: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${SIGNED_PDF_PREFIX}${devisId}`, base64);
  } catch {
    /* quota */
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

type StoreContextValue = {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  update: (patch: Partial<AppData>) => void;
  reset: () => void;
  hydrated: boolean;
  cloudReady: boolean;
  syncError: string | null;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function prepareData(data: AppData, companyId: string): AppData {
  return syncAppData(
    syncAppDataPriceLibrary(
      {
        ...data,
        parametres: {
          ...data.parametres,
          theme: normalizeThemePreference(data.parametres.theme),
        },
      },
      companyId,
    ),
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => emptyAppData());
  const [hydrated, setHydrated] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const ownerIdRef = useRef<string | null>(null);
  const skipNextPersist = useRef(false);
  const importCompletedAtRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    let cancelled = false;

    async function hydrateFromCloud() {
      const account = getAccount();
      const supabase = createClient();
      let ownerId = account?.supabaseUserId ?? null;

      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        ownerId = sessionData.session?.user.id ?? ownerId;
      }

      // Employé : bootstrap déjà écrit dans un cache scoped company — ne pas écraser.
      if (account && isEmployeAccount(account)) {
        const companyId = account.companyId ?? "employee-local";
        ownerIdRef.current = companyId;
        const cached = readScopedCache(companyId);
        const loaded = prepareData(cached ?? emptyAppData(), companyId);
        if (!cancelled) {
          applyTheme(loaded.parametres.theme);
          setData(loaded);
          setHydrated(true);
          setCloudReady(true);
        }
        return;
      }

      if (!ownerId) {
        // Pas de session : workspace vide (jamais les données démo legacy).
        ownerIdRef.current = null;
        if (!cancelled) {
          setData(emptyAppData());
          setHydrated(true);
          setCloudReady(false);
        }
        return;
      }

      ownerIdRef.current = ownerId;

      // Ne pas afficher un cache d'un autre compte : attendre le cloud.
      const remote = await fetchUserSettings();
      if (cancelled) return;

      if (remote.unauthorized) {
        setData(emptyAppData());
        setHydrated(true);
        setCloudReady(false);
        setSyncError("Session expirée. Reconnectez-vous.");
        return;
      }

      if (remote.error && !remote.workspace && !remote.parametres) {
        // Cache scoped uniquement pour ce ownerId (jamais le blob global).
        const cached = readScopedCache(ownerId);
        const fallback = prepareData(
          cached ??
            emptyAppData({
              email: account?.email,
              utilisateur: account?.utilisateur,
            }),
          ownerId,
        );
        skipNextPersist.current = true;
        applyTheme(fallback.parametres.theme);
        setData(fallback);
        setHydrated(true);
        setCloudReady(false);
        setSyncError(remote.error);
        return;
      }

      const workspace = remote.workspace ?? null;
      importCompletedAtRef.current = workspace?.localImportCompletedAt ?? null;

      const importPlan = tryBuildLocalImport(ownerId, workspace);
      let next = workspaceOrEmpty(
        workspace,
        account?.email,
        account?.utilisateur,
      );

      if (importPlan.data && importPlan.shouldUpload) {
        next = importPlan.data;
        importCompletedAtRef.current = new Date().toISOString();
        const upload = await saveUserSettings({
          parametres: next.parametres,
          employes: next.employes,
          appData: next,
          localImportCompletedAt: importCompletedAtRef.current,
        });
        if (upload.ok) {
          markLocalImportDone(ownerId);
        } else {
          setSyncError(upload.error ?? "Import local vers Supabase échoué.");
        }
      } else if (importPlan.markImportDone) {
        markLocalImportDone(ownerId);
        if (workspace && !workspace.localImportCompletedAt) {
          importCompletedAtRef.current = new Date().toISOString();
          void saveUserSettings({
            parametres: next.parametres,
            employes: next.employes,
            appData: next,
            localImportCompletedAt: importCompletedAtRef.current,
          });
        }
      }

      const loaded = prepareData(next, ownerId);
      skipNextPersist.current = true;
      applyTheme(loaded.parametres.theme);
      writeScopedCache(ownerId, loaded);
      setData(loaded);
      setHydrated(true);
      setCloudReady(true);
      setSyncError(null);
    }

    void hydrateFromCloud();
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (!hydrated) return;
    applyTheme(data.parametres.theme);
  }, [hydrated, data.parametres.theme]);

  // Cache local scoped (pas source de vérité).
  useEffect(() => {
    if (!hydrated || !cloudReady) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    const ownerId = ownerIdRef.current;
    if (!ownerId) return;
    writeScopedCache(ownerId, data);
  }, [data, hydrated, cloudReady]);

  // Sync cloud complète (debounce).
  useEffect(() => {
    if (!hydrated || !cloudReady) return;
    const account = getAccount();
    if (!account?.supabaseUserId || isEmployeAccount(account)) return;
    if (ownerIdRef.current !== account.supabaseUserId) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await saveUserSettings({
          parametres: data.parametres,
          employes: data.employes,
          appData: data,
          localImportCompletedAt: importCompletedAtRef.current,
          operational: {
            planning: data.planning,
            chantiers: data.chantiers,
            affectations: data.affectations,
            clients: data.clients,
          },
          workspace: appDataToWorkspace(
            data,
            importCompletedAtRef.current,
          ),
        });
        if (!result.ok) {
          setSyncError(result.error ?? "Échec synchronisation Supabase.");
        } else if (result.missingColumns) {
          setSyncError(
            "Schéma Supabase incomplet. Exécutez scripts/APPLY_COMPANY_WORKSPACE.sql",
          );
        } else {
          setSyncError(null);
        }
      })();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [data, hydrated, cloudReady]);

  const update = useCallback((patch: Partial<AppData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    const empty = emptyAppData();
    applyTheme(empty.parametres.theme);
    setData(empty);
    const ownerId = ownerIdRef.current;
    if (ownerId) writeScopedCache(ownerId, empty);
  }, []);

  const value = useMemo(
    () => ({
      data,
      setData,
      update,
      reset,
      hydrated,
      cloudReady,
      syncError,
    }),
    [data, update, reset, hydrated, cloudReady, syncError],
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
