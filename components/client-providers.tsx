"use client";

import type { ReactNode } from "react";
import { ThemeSync } from "@/components/theme-sync";
import { SupabaseProvider } from "@/components/supabase-provider";
import { StoreProvider } from "@/lib/store";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <SupabaseProvider>
        <ThemeSync />
        {children}
      </SupabaseProvider>
    </StoreProvider>
  );
}
