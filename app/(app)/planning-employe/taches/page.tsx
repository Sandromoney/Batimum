"use client";

import { useMemo, useState } from "react";
import { EmployeeReportModal } from "@/components/employee-report-modal";
import { EmployeeTaskCard } from "@/components/employee-task-card";
import { useEmployeeTasks } from "@/lib/hooks/use-employee-tasks";
import { formatDateFR } from "@/lib/utils";

export default function EmployeeTasksPage() {
  const { contexts, reportProblem } = useEmployeeTasks();
  const today = new Date().toISOString().slice(0, 10);
  const [reportEventId, setReportEventId] = useState<string | null>(null);

  const upcomingContexts = useMemo(
    () => contexts.filter((item) => item.event.date >= today),
    [contexts, today],
  );

  const groupedByDate = useMemo(() => {
    const map = new Map<string, typeof upcomingContexts>();
    for (const context of upcomingContexts) {
      const list = map.get(context.event.date) ?? [];
      list.push(context);
      map.set(context.event.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [upcomingContexts]);

  return (
    <div className="btp-app-page space-y-6 py-4 sm:py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
          Mes tâches
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vos interventions à venir — appelez, signalez ou lancez l&apos;itinéraire
        </p>
      </header>

      {groupedByDate.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card-elevated px-4 py-5 text-sm text-muted-foreground">
          Aucune tâche à venir.
        </p>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([date, dayContexts]) => (
            <section key={date} className="space-y-3">
              <h2 className="text-sm font-medium text-primary">
                {formatDateFR(date)}
              </h2>
              <div className="space-y-3">
                {dayContexts.map((context) => (
                  <EmployeeTaskCard
                    key={context.event.id}
                    context={context}
                    onReport={() => setReportEventId(context.event.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
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
