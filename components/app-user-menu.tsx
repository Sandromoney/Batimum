"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { DEFAULT_PARAMETRES } from "@/lib/parametres";
import { clearAccount, getAccount, getAppRole } from "@/lib/account";
import { clearEmployeeSessionForDirectorLogin } from "@/lib/employee-access";
import { signOutSupabase } from "@/lib/supabase-auth";
import { APP_ROLE_LABELS } from "@/lib/auth-types";
import { UserAvatar } from "@/components/user-avatar";
import { useHoverDropdown } from "@/lib/use-hover-dropdown";

export function AppUserMenu() {
  const router = useRouter();
  const { data, hydrated } = useStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    open,
    panelMounted,
    panelVisible,
    hoverOpenEnabled,
    closeMenu,
    toggleMenu,
    containerProps,
    animationMs,
  } = useHoverDropdown();

  const user = hydrated
    ? data.parametres.utilisateur
    : DEFAULT_PARAMETRES.utilisateur;
  const account = hydrated ? getAccount() : null;
  const userRole = APP_ROLE_LABELS[getAppRole(account)];
  const companyLogo = hydrated
    ? data.parametres.logoApplication?.trim() ||
      data.parametres.logoEntreprise?.trim() ||
      undefined
    : undefined;

  useEffect(() => {
    if (!open || hoverOpenEnabled) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      closeMenu();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [closeMenu, hoverOpenEnabled, open]);

  async function handleLogout() {
    closeMenu();
    await clearEmployeeSessionForDirectorLogin();
    await signOutSupabase();
    clearAccount();
    router.replace("/login");
  }

  return (
    <div className="relative" ref={menuRef} {...containerProps}>
      <button
        type="button"
        onClick={() => {
          if (!hoverOpenEnabled) toggleMenu();
        }}
        className={cn(
          "btp-shadow-sm inline-flex h-12 max-w-[min(16rem,calc(100vw-9rem))] cursor-pointer items-center gap-2.5 rounded-xl border border-border/80 bg-card/70 px-2.5 pl-2 text-left transition-all duration-200 hover:border-border hover:bg-card-hover md:gap-3 md:px-3",
          open && "border-border bg-card-hover",
        )}
        aria-label="Menu utilisateur"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar name={user} logo={companyLogo} size="lg" />
        <span className="hidden min-w-0 flex-1 md:block">
          <span className="block truncate text-sm font-semibold leading-tight text-foreground">
            {user}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-normal leading-tight text-muted-foreground/65">
            {userRole}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "hidden h-4 w-4 shrink-0 text-muted-foreground/80 transition-transform duration-200 md:block",
            open && "rotate-180",
          )}
          strokeWidth={1.75}
        />
      </button>

      {panelMounted && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 origin-top rounded-2xl border border-border bg-card p-1.5 shadow-card transition-all ease-out",
            panelVisible
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0",
          )}
          style={{ transitionDuration: `${animationMs}ms` }}
        >
          <div className="border-b border-border/80 px-3 py-2.5 md:hidden">
            <p className="truncate text-sm font-semibold text-foreground">{user}</p>
            <p className="truncate text-[10px] text-muted-foreground/65">{userRole}</p>
          </div>
          <Link
            href="/parametres"
            role="menuitem"
            onClick={closeMenu}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-card-hover hover:text-primary"
          >
            <Settings className="h-4 w-4 text-primary" strokeWidth={1.75} />
            Paramètres
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-card-hover hover:text-primary"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
