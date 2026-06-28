"use client";

import { useMemo, useState } from "react";
import { EmployeeReportModal } from "@/components/employee-report-modal";
import { EmployeeTaskCard } from "@/components/employee-task-card";
import { getEmployeeUpcomingDays } from "@/lib/employee-planning";
import { useEmployeeTasks } from "@/lib/hooks/use-employee-tasks";
import { formatDateFR } from "@/lib/utils";

export default function EmployeePlanningPage() {
  const { contexts, reportProblem } = useEmployeeTasks();
  const today = new Date().toISOString().slice(0, 10);
  const [reportEventId, setReportEventId] = useState<string | null>(null);

  const todayContexts = useMemo(
    () => contexts.filter((item) => item.event.date === today),
    [contexts, today],
  );

  const upcomingDays = useMemo(
    () =>
      getEmployeeUpcomingDays(
        contexts.map((item) => item.event),
        today,
        30,
      ).filter((date) => date !== today),
    [contexts, today],
  );

  const contextsByDate = useMemo(() => {
    const map = new Map<string, typeof contexts>();
    for (const context of contexts) {
      if (context.event.date < today) continue;
      const list = map.get(context.event.date) ?? [];
      list.push(context);
      map.set(context.event.date, list);
    }
    return map;
  }, [contexts, today]);

  return (
    <div className="btp-app-page space-y-8 py-4 sm:py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
          Mon planning
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vos interventions assignées — synchronisé avec le planning principal
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Aujourd&apos;hui</h2>
        {todayContexts.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card-elevated px-4 py-5 text-sm text-muted-foreground">
            Aucune intervention prévue aujourd&apos;hui.
          </p>
        ) : (
          <div className="space-y-3">
            {todayContexts.map((context) => (
              <EmployeeTaskCard
                key={context.event.id}
                context={context}
                onReport={() => setReportEventId(context.event.id)}
              />
            ))}
          </div>
        )}
      </section>

      {upcomingDays.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">
            Prochains jours planifiés
          </h2>
          {upcomingDays.map((date) => {
            const dayContexts = contextsByDate.get(date) ?? [];
            if (dayContexts.length === 0) return null;

            return (
              <div key={date} className="space-y-3">
                <h3 className="text-sm font-medium text-primary">
                  {formatDateFR(date)}
                </h3>
                <div className="space-y-3">
                  {dayContexts.map((context) => (
                    <EmployeeTaskCard
                      key={context.event.id}
                      context={context}
                      onReport={() => setReportEventId(context.event.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <EmployeeReportModal
        open={Boolean(reportEventId)}
        onClose={() => setReportEventId(null)}
        onSubmit={(message) => {
          if (reportEventId) reportProblem(reportEventId, message);
        }}
      />
    </div>
  );
}
