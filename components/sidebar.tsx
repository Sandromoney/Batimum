"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { DESKTOP_NAV_ITEMS, isAppNavItemActive } from "@/lib/app-nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    setNavReady(true);
  }, []);

  return (
    <aside className="btp-sidebar relative z-20 hidden h-full w-[260px] min-w-[260px] max-w-[260px] shrink-0 flex-col border-r border-border/80 bg-sidebar md:flex">
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-5 pb-8">
        {DESKTOP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            navReady && isAppNavItemActive(pathname ?? "", href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-300 ease-out",
                active
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted hover:translate-x-0.5 hover:bg-card-hover/80 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ease-out",
                  active
                    ? "bg-primary-foreground/10"
                    : "bg-transparent group-hover:scale-105 group-hover:bg-primary/10",
                )}
              >
                <Icon
                  className={cn(
                    "h-[1.15rem] w-[1.15rem] transition-all duration-300 ease-out",
                    active
                      ? "text-primary-foreground"
                      : "text-muted group-hover:text-primary",
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <footer className="shrink-0 border-t border-border/60 px-4 pb-8 pt-6">
        <div className="btp-sidebar-brand-block flex flex-col items-center text-center">
          <div className="btp-sidebar-brand-image" aria-hidden="true">
            <BrandLogo
              variant="sidebarFooter"
              showSubtitle={false}
              imageClassName="!w-[96px] !max-w-[96px]"
            />
          </div>
          <p className="btp-sidebar-brand-title mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-foreground/90">
            BATIMUM
          </p>
          <p className="btp-sidebar-brand-subtitle mt-1.5 text-[10px] leading-snug text-muted-foreground/80">
            Logiciel de gestion BTP
          </p>
          <p className="btp-sidebar-brand-version mt-1 text-[9px] tracking-wide text-muted-foreground/45">
            Version 1.0
          </p>
        </div>
      </footer>
    </aside>
  );
}
