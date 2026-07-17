"use client";

import type { ReactNode } from "react";
import { StoreProvider } from "@/lib/store";
import { SupabaseProvider } from "@/components/supabase-provider";
import { ThemeSync } from "@/components/theme-sync";

/**
 * Providers pour le parcours marketing / inscription.
 * StoreProvider est obligatoire : configurer-entreprise, documents, bancaire
 * et les pages Google-complete utilisent useStore().
 */
export function MarketingProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <SupabaseProvider>
        <ThemeSync />
        {children}
      </SupabaseProvider>
    </StoreProvider>
  );
}
