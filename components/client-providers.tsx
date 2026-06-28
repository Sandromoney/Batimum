"use client";

import type { ReactNode } from "react";
import { ThemeSync } from "@/components/theme-sync";
import { StoreProvider } from "@/lib/store";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ThemeSync />
      {children}
    </StoreProvider>
  );
}
