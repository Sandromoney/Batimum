"use client";

import { Card } from "@/components/ui/card";
import { EmployeeChantierActions } from "@/components/employee-chantier-actions";
import type { EmployeeTaskContext } from "@/lib/employee-planning";
import { getPlanningTypeLabel } from "@/lib/planning-types";
import { formatDateFR, formatTime24h } from "@/lib/utils";
import { CalendarRange, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmployeeTaskCard({
  context,
  compact = false,
  onReport,
}: {
  context: EmployeeTaskContext;
  compact?: boolean;
  onReport?: () => void;
}) {
  const { event } = context;
  const typeLabel = getPlanningTypeLabel(event);

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/80 bg-card-elevated/60 transition-all duration-300 hover:border-primary/20 hover:shadow-glow/20",
        compact ? "p-4" : "p-5",
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {typeLabel}
        </p>
        <h3 className="mt-1 text-base font-semibold leading-snug text-foreground sm:text-lg">
          {context.displayTitle}
        </h3>
      </div>

      <dl className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-primary/80" />
          <dd>
            {formatDateFR(event.date)} · {formatTime24h(event.heureDebut)} –{" "}
            {formatTime24h(event.heureFin)}
          </dd>
        </div>

        {context.chantierNom && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">
              Chantier
            </dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {context.chantierNom}
            </dd>
          </div>
        )}

        {context.clientNom && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">
              Client
            </dt>
            <dd className="mt-0.5 text-foreground">{context.clientNom}</dd>
          </div>
        )}

        {context.adresseComplete && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <dd>{context.adresseComplete}</dd>
          </div>
        )}

        {event.tache?.trim() && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">
              Tâche
            </dt>
            <dd className="mt-0.5 text-foreground">{event.tache.trim()}</dd>
          </div>
        )}

        {context.affectation && (
          <div className="flex items-start gap-2 rounded-xl border border-border/50 bg-card/40 px-3 py-2">
            <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
            <div>
              <dt className="text-xs font-medium text-foreground">
                Période d&apos;affectation
              </dt>
              <dd className="mt-0.5 text-xs">
                {formatDateFR(context.affectation.dateDebut)} →{" "}
                {formatDateFR(context.affectation.dateFin)}
                {context.affectationLabel && (
                  <span className="mt-0.5 block text-muted-foreground">
                    {context.affectationLabel}
                  </span>
                )}
              </dd>
            </div>
          </div>
        )}

        {context.note?.trim() && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">
              Note
            </dt>
            <dd className="mt-0.5 text-foreground">{context.note.trim()}</dd>
          </div>
        )}
      </dl>

      <EmployeeChantierActions
        responsableNom={context.responsableNom}
        responsableTelephone={context.responsableTelephone}
        adresseComplete={context.adresseComplete}
        adresseCompleteValide={context.adresseCompleteValide}
        onReport={onReport}
        compact={compact}
      />
    </Card>
  );
}
