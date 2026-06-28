"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmployeAvatar } from "@/components/employe-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clearAccount } from "@/lib/account";
import { useEmployeeSession } from "@/lib/hooks/use-employee-session";
import { normalizePhoneForTel } from "@/lib/employee-chantier-actions";
import { EMPLOYEE_PLANNING_COLORS } from "@/lib/planning-colors";
import { Mail, Phone, Briefcase, Palette } from "lucide-react";

export default function EmployeeProfilPage() {
  const router = useRouter();
  const { employe, displayName } = useEmployeeSession();

  function logout() {
    clearAccount();
    router.replace("/login-employe");
  }

  if (!employe) {
    return (
      <div className="btp-app-page py-6">
        <p className="text-sm text-muted-foreground">Profil introuvable.</p>
      </div>
    );
  }

  const colorLabel = EMPLOYEE_PLANNING_COLORS.find(
    (item) => item.value === employe.couleurPlanning,
  )?.label;

  return (
    <div className="btp-app-page space-y-6 py-4 sm:py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
          Mon profil
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vos informations personnelles
        </p>
      </header>

      <Card className="overflow-hidden p-6">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-6">
          <EmployeAvatar employe={employe} size="lg" className="!h-20 !w-20 text-lg" />
          <div className="mt-4 min-w-0 sm:mt-0">
            <h2 className="text-xl font-semibold text-foreground">{displayName}</h2>
            {employe.poste && (
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
                <Briefcase className="h-4 w-4" />
                {employe.poste}
              </p>
            )}
          </div>
        </div>

        <dl className="mt-6 space-y-4 border-t border-border/60 pt-6">
          {employe.email && (
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">{employe.email}</dd>
              </div>
            </div>
          )}

          {employe.telephone && (
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Téléphone
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  <a
                    href={`tel:${normalizePhoneForTel(employe.telephone)}`}
                    className="hover:text-primary"
                  >
                    {employe.telephone}
                  </a>
                </dd>
              </div>
            </div>
          )}

          {employe.couleurPlanning && (
            <div className="flex items-start gap-3">
              <Palette className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Couleur planning
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
                  <span
                    className="h-4 w-4 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: employe.couleurPlanning }}
                  />
                  {colorLabel ?? employe.couleurPlanning}
                </dd>
              </div>
            </div>
          )}
        </dl>

        <p className="mt-6 rounded-xl border border-border/50 bg-card-elevated/40 px-4 py-3 text-xs text-muted-foreground">
          Pour modifier vos informations, contactez votre responsable. Les
          changements sont gérés dans les paramètres entreprise.
        </p>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/planning-employe"
          className="btp-btn inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-border/80 bg-card/90 px-5 py-3 text-sm font-medium text-foreground shadow-card transition-all hover:border-primary/25 hover:bg-card-hover"
        >
          Retour à l&apos;accueil
        </Link>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 flex-1 md:hidden"
          onClick={logout}
        >
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
