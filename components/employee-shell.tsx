"use client";



import Link from "next/link";

import { useRouter } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";

import { EmployeAvatar } from "@/components/employe-avatar";

import { EmployeeDesktopNav } from "@/components/employee-desktop-nav";

import { EmployeeMobileNav } from "@/components/employee-mobile-nav";

import { Button } from "@/components/ui/button";

import { clearAccount, getAccount } from "@/lib/account";

import { employeDisplayLabel } from "@/lib/employee-access";

import { useStore } from "@/lib/store";

import { formatDateFR } from "@/lib/utils";



export function EmployeeShell({ children }: { children: React.ReactNode }) {

  const router = useRouter();

  const { data } = useStore();

  const account = getAccount();

  const employe = data.employes.find((item) => item.id === account?.employeId);

  const displayName =

    employe ? employeDisplayLabel(employe) : account?.utilisateur ?? "Employé";

  const today = formatDateFR(new Date().toISOString().slice(0, 10));



  function logout() {

    clearAccount();

    router.replace("/login-employe");

  }



  return (

    <div

      className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground antialiased"

      data-employee-shell="true"

    >

      <header className="btp-shadow-sm flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-sidebar px-4 md:px-6">

        <div className="flex min-w-0 items-center gap-2">

          <EmployeeMobileNav

            employe={employe}

            displayName={displayName}

            onLogout={logout}

          />

          <Link

            href="/planning-employe"

            className="inline-flex items-center rounded-lg transition-opacity hover:opacity-90"

            aria-label="Batimum — Espace employé"

          >

            <BrandLogo variant="sidebarFooter" showSubtitle={false} />

          </Link>

        </div>



        <div className="flex items-center gap-2 sm:gap-3">

          <span className="hidden text-xs text-muted-foreground sm:block">

            {today}

          </span>

          <div className="hidden text-right sm:block">

            <p className="text-sm font-medium text-foreground">{displayName}</p>

            {employe?.poste && (

              <p className="text-xs text-muted-foreground">{employe.poste}</p>

            )}

          </div>

          <Link

            href="/planning-employe/profil"

            className="rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"

            aria-label="Mon profil"

          >

            {employe ? (

              <EmployeAvatar employe={employe} size="lg" />

            ) : (

              <span className="btp-avatar flex h-11 w-11 items-center justify-center rounded-full bg-card-hover text-sm font-bold text-primary ring-1 ring-border">

                ?

              </span>

            )}

          </Link>

          <Button

            type="button"

            variant="secondary"

            className="hidden md:inline-flex"

            onClick={logout}

          >

            Déconnexion

          </Button>

        </div>

      </header>



      <EmployeeDesktopNav />



      <main className="min-h-0 flex-1 overflow-y-auto bg-background">

        <div className="btp-page-container mx-auto box-border w-full max-w-3xl animate-[fadeIn_0.35s_ease-out]">

          {children}

        </div>

      </main>

    </div>

  );

}


