"use client";

import { EmployeAvatar, EmployeAvatarGroup } from "@/components/employe-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Chantier, Employe, EvenementPlanning } from "@/lib/types";
import {
  getPlanningEventDisplayTitle,
  getPlanningTypeLabel,
  normalizePlanningEventType,
} from "@/lib/planning-types";
import {
  buildChantierPresenceParJour,
  employeDisplayName,
  formatWeekRangeLabel,
  getWeekDayLabels,
  getWeekDays,
  isDateInWeek,
  resolveEmployes,
  sortPlanningEvents,
} from "@/lib/planning-utils";
import { cn, formatDateFR, formatTime24h } from "@/lib/utils";
import { ChevronLeft, ChevronRight, HardHat, Pencil, Trash2 } from "lucide-react";

export function PlanningWeekView({
  weekStart,
  onWeekChange,
  onToday,
  events,
  chantiers,
  employes,
  onEditEvent,
  onDeleteEvent,
  onCreateForDate,
}: {
  weekStart: string;
  onWeekChange: (deltaWeeks: number) => void;
  events: EvenementPlanning[];
  chantiers: Chantier[];
  employes: Employe[];
  onEditEvent: (event: EvenementPlanning) => void;
  onDeleteEvent: (id: string) => void;
  onCreateForDate: (date: string) => void;
  onToday: () => void;
}) {
  const weekDays = getWeekDays(weekStart);
  const dayLabels = getWeekDayLabels();
  const weekEvents = sortPlanningEvents(
    events.filter((e) => isDateInWeek(e.date, weekStart)),
  );
  const presence = buildChantierPresenceParJour(
    events,
    weekStart,
    chantiers,
    employes,
  );
  const hasWeekAssignment = weekEvents.some(
    (event) =>
      Boolean(event.chantierId) || (event.employeIds?.length ?? 0) > 0,
  );
  const chantierMap = new Map(chantiers.map((c) => [c.id, c]));
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onWeekChange(-1)}
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[12rem] text-center text-sm font-semibold text-foreground sm:text-base">
            Semaine du {formatWeekRangeLabel(weekStart)}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onWeekChange(1)}
            aria-label="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onToday}>
          Aujourd&apos;hui
        </Button>
      </header>

      <div className="btp-planning-week-grid grid gap-3 lg:grid-cols-7">
        {weekDays.map((date, index) => {
          const dayEvents = weekEvents.filter((e) => e.date === date);
          const isToday = date === todayIso;

          return (
            <section
              key={date}
              className={cn(
                "btp-planning-day flex min-h-[10rem] flex-col rounded-2xl border border-border/70 bg-card/80",
                isToday && "btp-planning-day-today ring-1 ring-primary/40",
              )}
            >
              <header
                className={cn(
                  "btp-planning-day-head flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5",
                  isToday && "bg-primary/10",
                )}
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {dayLabels[index]}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateFR(date)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onCreateForDate(date)}
                >
                  +
                </Button>
              </header>

              <ul className="btp-planning-day-events flex flex-1 flex-col gap-2 p-2">
                {dayEvents.length === 0 && (
                  <li className="flex flex-1 items-center justify-center px-2 py-6 text-center text-xs text-muted-foreground">
                    Aucun événement
                  </li>
                )}
                {dayEvents.map((event) => {
                  const chantier = event.chantierId
                    ? chantierMap.get(event.chantierId)
                    : null;
                  const assigned = resolveEmployes(event.employeIds, employes);
                  const displayTitle = getPlanningEventDisplayTitle(event, chantier);
                  const typeLabel = getPlanningTypeLabel(event);

                  return (
                    <li key={event.id}>
                      <article className="btp-planning-event rounded-xl border border-border/60 bg-card-elevated/60 p-2.5 transition-colors hover:bg-card-hover/80">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-semibold leading-snug text-foreground line-clamp-2">
                            {displayTitle}
                          </h4>
                          <Badge
                            label={typeLabel}
                            status={normalizePlanningEventType(event.type)}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatTime24h(event.heureDebut)} –{" "}
                          {formatTime24h(event.heureFin)}
                        </p>
                        {chantier && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-primary">
                            <HardHat className="h-3 w-3 shrink-0" />
                            <span className="truncate">{chantier.nom}</span>
                          </p>
                        )}
                        {assigned.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <EmployeAvatarGroup employes={assigned} max={3} size="sm" />
                            <span className="min-w-0 truncate text-[10px] text-muted-foreground">
                              {assigned.map(employeDisplayName).join(", ")}
                            </span>
                          </div>
                        )}
                        <footer className="mt-2 flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 flex-1 px-2 text-[11px]"
                            onClick={() => onEditEvent(event)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => onDeleteEvent(event.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </footer>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <Card className="btp-card">
        <header className="mb-4 flex items-center gap-2">
          <HardHat className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            Qui est sur quel chantier ?
          </h2>
        </header>
        {presence.length === 0 ? (
          !hasWeekAssignment ? (
            <p className="text-sm text-muted-foreground">
              Aucune assignation chantier cette semaine. Liez un chantier et des
              employés à vos événements.
            </p>
          ) : null
        ) : (
          <ul className="space-y-3">
            {presence.map((row) => (
              <li
                key={`${row.date}-${row.chantierId}`}
                className="btp-planning-presence-row flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card-elevated/40 px-4 py-3"
              >
                <section className="min-w-[7rem]">
                  <p className="text-xs text-muted-foreground">
                    {formatDateFR(row.date)}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {row.chantierNom}
                  </p>
                </section>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {row.employes.map((employe) => (
                    <span
                      key={employe.id}
                      className="btp-employe-chip inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2 py-1 text-xs text-foreground"
                    >
                      <EmployeAvatar employe={employe} size="sm" />
                      {employeDisplayName(employe)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
