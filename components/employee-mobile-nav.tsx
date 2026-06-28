"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { EmployeAvatar } from "@/components/employe-avatar";
import { Button } from "@/components/ui/button";
import {
  EMPLOYEE_NAV_ITEMS,
  isEmployeeNavItemActive,
} from "@/lib/employee-nav";
import type { Employe } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EmployeeMobileNav({
  employe,
  displayName,
  onLogout,
}: {
  employe?: Employe;
  displayName: string;
  onLogout: () => void;
}) {
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
        aria-controls="mobile-employee-nav"
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
            id="mobile-employee-nav"
            className="btp-sidebar relative z-10 flex h-full w-[min(85vw,280px)] max-w-[280px] flex-col border-r border-border/80 bg-sidebar shadow-card"
            role="dialog"
            aria-modal="true"
            aria-label="Menu employé"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-4">
              <div className="flex items-center gap-3 min-w-0">
                {employe && <EmployeAvatar employe={employe} size="md" />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {displayName}
                  </p>
                  {employe?.poste && (
                    <p className="truncate text-xs text-muted-foreground">
                      {employe.poste}
                    </p>
                  )}
                </div>
              </div>
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
              {EMPLOYEE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active =
                  navReady && isEmployeeNavItemActive(pathname ?? "", href);

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "text-muted hover:bg-card-hover/80 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                        active
                          ? "bg-primary-foreground/10"
                          : "bg-transparent group-hover:bg-primary/10",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[1.1rem] w-[1.1rem] transition-colors duration-200",
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

            <footer className="shrink-0 space-y-3 border-t border-border/60 px-4 py-5">
              <Button
                type="button"
                variant="secondary"
                className="w-full min-h-11"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
              >
                Déconnexion
              </Button>
              <div className="flex flex-col items-center text-center">
                <BrandLogo
                  variant="sidebarFooter"
                  showSubtitle={false}
                  imageClassName="!w-[80px] !max-w-[80px]"
                />
                <p className="mt-2 text-[10px] text-muted-foreground/70">
                  Espace employé
                </p>
              </div>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
