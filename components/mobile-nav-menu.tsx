"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  isAppNavItemActive,
  MOBILE_NAV_ITEMS,
} from "@/lib/app-nav";
import { cn } from "@/lib/utils";

export function MobileNavMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    setNavReady(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        aria-controls="mobile-app-nav"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </Button>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />

          <aside
            id="mobile-app-nav"
            className="btp-sidebar relative z-10 flex h-full w-[min(85vw,280px)] max-w-[280px] flex-col border-r border-border/80 bg-sidebar shadow-card"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-4">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Menu
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active =
                  navReady && isAppNavItemActive(pathname ?? "", href);

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "text-muted hover:bg-card-hover/80 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                        active
                          ? "bg-primary-foreground/10"
                          : "bg-transparent group-hover:bg-primary/10",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[1.05rem] w-[1.05rem] transition-colors duration-200",
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

            <footer className="shrink-0 border-t border-border/60 px-4 pb-6 pt-5">
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
        </div>
      )}
    </>
  );
}
