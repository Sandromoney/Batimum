"use client";

import { useMemo, useState } from "react";
import { addDaysIso } from "@/lib/planning-utils";
import { cn, formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toIso(new Date(year, month, day)));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function isInRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}

export function PlanningRangeCalendar({
  dateDebut,
  dateFin,
  onChange,
}: {
  dateDebut: string;
  dateFin: string;
  onChange: (next: { dateDebut: string; dateFin: string }) => void;
}) {
  const anchor = dateDebut || new Date().toISOString().slice(0, 10);
  const anchorDate = parseIso(anchor);
  const [viewYear, setViewYear] = useState(anchorDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchorDate.getMonth());
  const [pickStart, setPickStart] = useState<string | null>(null);

  const grid = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    const date = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  }

  function handleDayClick(iso: string) {
    if (!pickStart) {
      setPickStart(iso);
      onChange({ dateDebut: iso, dateFin: iso });
      return;
    }

    const start = pickStart <= iso ? pickStart : iso;
    const end = pickStart <= iso ? iso : pickStart;
    setPickStart(null);
    onChange({ dateDebut: start, dateFin: end });
  }

  const hasRange = Boolean(dateDebut && dateFin && dateFin >= dateDebut);

  return (
    <section className="rounded-xl border border-border/60 bg-card-elevated/30 p-3">
      <header className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-lg border border-border/60 p-1.5 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold capitalize text-foreground">{monthLabel}</p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-lg border border-border/60 p-1.5 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </header>

      <p className="mb-3 text-xs text-muted-foreground">
        {hasRange ? (
          <>
            Période :{" "}
            <span className="font-medium text-foreground">
              {formatDate(dateDebut)} → {formatDate(dateFin)}
            </span>
          </>
        ) : (
          "Cliquez sur la date de début, puis sur la date de fin."
        )}
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {WEEKDAY_HEADERS.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((iso, index) => {
          if (!iso) {
            return <span key={`empty-${index}`} className="h-9" />;
          }

          const day = parseIso(iso).getDate();
          const inRange =
            hasRange && isInRange(iso, dateDebut, dateFin);
          const isStart = iso === dateDebut;
          const isEnd = iso === dateFin;
          const isSunday = parseIso(iso).getDay() === 0;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => handleDayClick(iso)}
              className={cn(
                "h-9 rounded-lg text-xs font-medium transition-colors",
                inRange && "bg-primary/20 text-foreground",
                (isStart || isEnd) && "bg-primary text-primary-foreground shadow-sm",
                !inRange && !isStart && !isEnd && "hover:bg-card-hover/60 text-foreground",
                isSunday && !inRange && !isStart && !isEnd && "text-muted-foreground/70",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => {
            const today = new Date().toISOString().slice(0, 10);
            const end = addDaysIso(today, 6);
            setPickStart(null);
            onChange({ dateDebut: today, dateFin: end });
            const d = parseIso(today);
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
          }}
        >
          Cette semaine
        </button>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => {
            setPickStart(null);
            onChange({ dateDebut: "", dateFin: "" });
          }}
        >
          Effacer
        </button>
      </div>
    </section>
  );
}
