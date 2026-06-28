"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DashboardWelcome } from "@/components/dashboard-welcome";
import { EmployeeTaskCard } from "@/components/employee-task-card";
import { Card } from "@/components/ui/card";
import { countUniqueChantiersToday } from "@/lib/employee-planning";
import { useEmployeeSession } from "@/lib/hooks/use-employee-session";
import { useEmployeeTasks } from "@/lib/hooks/use-employee-tasks";
import { formatDateFR } from "@/lib/utils";
import { CalendarDays, ChevronRight, ClipboardList } from "lucide-react";

export default function EmployeeHomePage() {
  const { displayName } = useEmployeeSession();
  const { contexts } = useEmployeeTasks();
  const today = new Date().toISOString().slice(0, 10);

  const todayContexts = useMemo(
    () => contexts.filter((item) => item.event.date === today),
    [contexts, today],
  );

  const chantierCount = countUniqueChantiersToday(
    contexts.map((item) => item.event),
    today,
  );

  const daySummary =
    chantierCount > 0
      ? `Aujourd'hui, vous êtes prévu sur ${chantierCount} chantier${chantierCount > 1 ? "s" : ""}.`
      : "Aucune intervention prévue aujourd'hui.";

  const upcomingCount = contexts.filter((item) => item.event.date > today).length;

  return (
    <div className="btp-app-page space-y-6 py-4 sm:space-y-8 sm:py-6">
      <DashboardWelcome
        greeting="Bonjour"
        name={displayName}
        subtitle={`${formatDateFR(today)} — ${daySummary}`}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/planning-employe/planning" className="group">
          <Card className="flex items-center justify-between p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-glow/20 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Mon planning</p>
                <p className="text-sm text-muted-foreground">
                  {todayContexts.length > 0
                    ? `${todayContexts.length} intervention${todayContexts.length > 1 ? "s" : ""} aujourd'hui`
                    : "Voir les prochains jours"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Card>
        </Link>

        <Link href="/planning-employe/taches" className="group">
          <Card className="flex items-center justify-between p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-glow/20 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Mes tâches</p>
                <p className="text-sm text-muted-foreground">
                  {upcomingCount > 0
                    ? `${upcomingCount} tâche${upcomingCount > 1 ? "s" : ""} à venir`
                    : "Tout est à jour"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Card>
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Aujourd&apos;hui
          </h2>
          {todayContexts.length > 0 && (
            <Link
              href="/planning-employe/planning"
              className="text-sm font-medium text-primary hover:underline"
            >
              Tout voir
            </Link>
          )}
        </div>

        {todayContexts.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card-elevated px-4 py-5 text-sm text-muted-foreground">
            Aucune intervention prévue aujourd&apos;hui.
          </p>
        ) : (
          <div className="space-y-3">
            {todayContexts.slice(0, 2).map((context) => (
              <EmployeeTaskCard key={context.event.id} context={context} compact />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
