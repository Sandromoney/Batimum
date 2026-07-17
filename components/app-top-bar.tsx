"use client";

import { AppGlobalSearch } from "@/components/app-global-search";
import { AppNotifications } from "@/components/app-notifications";
import { AppUserMenu } from "@/components/app-user-menu";
import { AiUsageIndicator } from "@/components/ai-usage-indicator";
import { MobileNavMenu } from "@/components/mobile-nav-menu";

export function AppTopBar() {
  return (
    <header className="btp-app-topbar btp-shadow-sm relative z-30 flex h-16 shrink-0 items-center border-b border-border/80 bg-sidebar">
      {/* Alignement horizontal avec la sidebar */}
      <div aria-hidden="true" className="hidden shrink-0 md:block md:w-[260px]" />

      {/* Menu mobile */}
      <div className="absolute left-4 top-1/2 z-40 -translate-y-1/2 md:hidden">
        <MobileNavMenu />
      </div>

      {/* Zone contenu : même axe que .btp-page-container */}
      <div className="flex min-w-0 flex-1 items-center pl-[clamp(1.75rem,3.5vw,3rem)] pr-[calc(clamp(1.75rem,3.5vw,3rem)+7.5rem)] md:pr-[calc(clamp(1.75rem,3.5vw,3rem)+17.5rem)]" />

      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-center px-[4.75rem] sm:px-20 md:px-24">
        <div className="pointer-events-auto w-full min-w-0 max-w-[min(100%,21.875rem)] sm:max-w-[22rem] md:max-w-[24rem] lg:max-w-[26rem] xl:max-w-[28rem]">
          <AppGlobalSearch />
        </div>
      </div>

      {/* Quota IA + cloche + profil */}
      <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-3 md:right-6 md:gap-4">
        <AiUsageIndicator />
        <AppNotifications />
        <AppUserMenu />
      </div>
    </header>
  );
}
