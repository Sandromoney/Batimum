"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { ensureAppAccountFromSupabaseUser } from "@/lib/supabase-auth";
import {
  bindSupabaseBrowserState,
  getSupabaseBrowserClient,
} from "@/lib/supabase-browser";
import { createClient } from "@/utils/supabase/client";

type SupabaseContextValue = {
  supabase: SupabaseClient | null;
  session: Session | null;
  ready: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue>({
  supabase: null,
  session: null,
  ready: false,
});

export function useSupabase() {
  return useContext(SupabaseContext);
}

export function useSupabaseSession() {
  return useContext(SupabaseContext).session;
}

/** @deprecated Utiliser SupabaseProvider */
export const SupabaseSessionProvider = SupabaseProvider;

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const activeClient = supabase ?? getSupabaseBrowserClient();
    if (!activeClient) {
      bindSupabaseBrowserState(null, null);
      setReady(true);
      return;
    }

    const client: SupabaseClient = activeClient;
    let cancelled = false;

    async function bootstrap() {
      const { data, error } = await client.auth.getSession();
      if (error) {
        console.warn("[supabase-provider] getSession error:", error.message);
      }

      let nextSession = data.session;

      if (!nextSession?.access_token) {
        const refreshed = await client.auth.refreshSession();
        nextSession = refreshed.data.session ?? null;
      }

      if (!cancelled) {
        setSession(nextSession);
        bindSupabaseBrowserState(client, nextSession);
        if (nextSession?.user) {
          ensureAppAccountFromSupabaseUser(nextSession.user);
        }
        setReady(true);
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      bindSupabaseBrowserState(client, nextSession);
      if (nextSession?.user) {
        ensureAppAccountFromSupabaseUser(nextSession.user);
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo(
    () => ({
      supabase,
      session,
      ready,
    }),
    [supabase, session, ready],
  );

  return (
    <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
  );
}
