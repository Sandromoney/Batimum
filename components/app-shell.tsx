"use client";

import { usePathname } from "next/navigation";
import { AppTopBar } from "@/components/app-top-bar";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

/** Shell SaaS interne (top bar + sidebar + zone contenu). Réservé au groupe de routes (app). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDevisWorkshop = /^\/devis\/[^/]+$/.test(pathname ?? "");

  return (
    <div
      className="btp-app-shell flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground antialiased"
      data-app-shell="true"
    >
      <AppTopBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="btp-app-main relative min-w-0 flex-1 overflow-y-auto bg-background">
          <div
            className={cn(
              "btp-page-container mx-auto box-border w-full max-w-content",
              isDevisWorkshop && "btp-page-container--workshop max-w-none",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
