"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  filterRevenueEntriesByYear,
  getRevenueYearRange,
  groupRevenueEntriesByMonth,
  type MonthlyRevenuePoint,
  type RevenueEntry,
} from "@/lib/saas-calculations";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_FULL_LABELS = [
  "JANVIER",
  "FÉVRIER",
  "MARS",
  "AVRIL",
  "MAI",
  "JUIN",
  "JUILLET",
  "AOÛT",
  "SEPTEMBRE",
  "OCTOBRE",
  "NOVEMBRE",
  "DÉCEMBRE",
] as const;

function formatTooltipMonthTitle(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11 || !year) return monthKey;
  return `${MONTH_FULL_LABELS[monthIndex]} ${year}`;
}

type DashboardRevenueChartProps = {
  revenueEntries: RevenueEntry[];
  objectifCaMensuel: number;
  objectifDraft: string;
  onObjectifDraftChange: (value: string) => void;
  onObjectifBlur: () => void;
};

function getCurrentMonthKey(referenceDate: Date) {
  return `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
}

export function DashboardRevenueChart({
  revenueEntries,
  objectifCaMensuel,
  objectifDraft,
  onObjectifDraftChange,
  onObjectifBlur,
}: DashboardRevenueChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [manualYear, setManualYear] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const referenceDate = mounted ? new Date() : new Date(0);
  const currentYear = referenceDate.getFullYear();
  const selectedYear = manualYear ?? currentYear;
  const isCurrentYear = selectedYear === currentYear;

  const { minYear, maxYear } = useMemo(
    () => getRevenueYearRange(revenueEntries, referenceDate),
    [revenueEntries, referenceDate],
  );

  const yearEntries = useMemo(
    () => filterRevenueEntriesByYear(revenueEntries, selectedYear),
    [revenueEntries, selectedYear],
  );

  const monthlyData = useMemo(
    () => groupRevenueEntriesByMonth(yearEntries, selectedYear),
    [yearEntries, selectedYear],
  );

  const currentMonthKey = mounted ? getCurrentMonthKey(referenceDate) : "";

  const caMoisAffiche = useMemo(() => {
    if (!isCurrentYear) return 0;
    return yearEntries
      .filter((entry) => {
        const date = new Date(entry.date);
        return !Number.isNaN(date.getTime()) && getCurrentMonthKey(date) === currentMonthKey;
      })
      .reduce((total, entry) => total + entry.montant, 0);
  }, [yearEntries, isCurrentYear, currentMonthKey]);

  const chartMax = useMemo(
    () =>
      Math.max(
        ...monthlyData.map((item) => item.chiffreAffaires),
        isCurrentYear ? objectifCaMensuel : 0,
        1,
      ),
    [monthlyData, objectifCaMensuel, isCurrentYear],
  );

  const progressionObjectif =
    isCurrentYear && objectifCaMensuel > 0
      ? Math.min(100, Math.round((caMoisAffiche / objectifCaMensuel) * 100))
      : 0;

  const goalLinePercent =
    isCurrentYear && objectifCaMensuel > 0
      ? Math.min(100, (objectifCaMensuel / chartMax) * 100)
      : 0;

  const insights = useMemo(() => {
    const totalAnnuel = monthlyData.reduce(
      (total, item) => total + item.chiffreAffaires,
      0,
    );

    const bestMonth = monthlyData.reduce<MonthlyRevenuePoint | null>(
      (best, item) => {
        if (!best || item.chiffreAffaires > best.chiffreAffaires) return item;
        return best;
      },
      null,
    );

    let variationPercent: number | null = null;
    if (isCurrentYear) {
      const currentIndex = monthlyData.findIndex(
        (item) => item.month === currentMonthKey,
      );
      const previousMonth =
        currentIndex > 0 ? monthlyData[currentIndex - 1] : null;
      variationPercent =
        previousMonth && previousMonth.chiffreAffaires > 0
          ? Math.round(
              ((caMoisAffiche - previousMonth.chiffreAffaires) /
                previousMonth.chiffreAffaires) *
                100,
            )
          : null;
    }

    return { variationPercent, bestMonth, totalAnnuel };
  }, [monthlyData, currentMonthKey, caMoisAffiche, isCurrentYear]);

  const prevYear = selectedYear > minYear ? selectedYear - 1 : null;
  const nextYear = selectedYear < maxYear ? selectedYear + 1 : null;

  function goToYear(year: number) {
    if (year === currentYear) setManualYear(null);
    else setManualYear(year);
  }

  return (
    <Card className="btp-card-interactive">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-5 w-5 text-primary" strokeWidth={2} />
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                CA mensuel — {selectedYear}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isCurrentYear ? (
                  <>
                    {formatCurrency(caMoisAffiche)} ce mois · {progressionObjectif}
                    % de l&apos;objectif
                  </>
                ) : (
                  <>Total {selectedYear} : {formatCurrency(insights.totalAnnuel)}</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 w-7 shrink-0 p-0"
              onClick={() => prevYear !== null && goToYear(prevYear)}
              disabled={prevYear === null}
              aria-label="Année précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1 text-xs font-medium">
              {prevYear !== null ? (
                <button
                  type="button"
                  onClick={() => goToYear(prevYear)}
                  className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-card-elevated/80 hover:text-foreground"
                >
                  {prevYear}
                </button>
              ) : (
                <span className="px-2 py-1 text-muted-foreground/40">—</span>
              )}
              <span className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                {selectedYear}
              </span>
              {nextYear !== null ? (
                <button
                  type="button"
                  onClick={() => goToYear(nextYear)}
                  className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-card-elevated/80 hover:text-foreground"
                >
                  {nextYear}
                </button>
              ) : (
                <span className="px-2 py-1 text-muted-foreground/40">—</span>
              )}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 w-7 shrink-0 p-0"
              onClick={() => nextYear !== null && goToYear(nextYear)}
              disabled={nextYear === null}
              aria-label="Année suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {isCurrentYear && (
          <label className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card-elevated/50 px-3 py-1.5 text-xs text-muted-foreground">
            Objectif
            <Input
              type="number"
              min={0}
              value={objectifDraft}
              onChange={(event) => onObjectifDraftChange(event.target.value)}
              onBlur={onObjectifBlur}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="h-7 w-24 border-border/70 bg-card/80 px-2 py-0 text-xs"
              placeholder="15000"
            />
            €
          </label>
        )}
      </header>

      <ul className="mb-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        {isCurrentYear && (
          <li className="rounded-full border border-border/60 bg-card-elevated/40 px-2.5 py-1">
            {insights.variationPercent === null
              ? "vs mois préc. : —"
              : `vs mois préc. : ${
                  insights.variationPercent >= 0 ? "+" : ""
                }${insights.variationPercent}%`}
          </li>
        )}
        <li className="rounded-full border border-border/60 bg-card-elevated/40 px-2.5 py-1">
          Meilleur mois :{" "}
          {insights.bestMonth && insights.bestMonth.chiffreAffaires > 0
            ? `${insights.bestMonth.label} · ${formatCurrency(insights.bestMonth.chiffreAffaires)}`
            : "—"}
        </li>
        <li className="rounded-full border border-border/60 bg-card-elevated/40 px-2.5 py-1">
          Total annuel : {formatCurrency(insights.totalAnnuel)}
        </li>
      </ul>

      <section className="relative">
        <div className="relative h-48">
          {isCurrentYear && objectifCaMensuel > 0 && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10"
              style={{ bottom: `${goalLinePercent}%` }}
            >
              <span
                className="block border-t border-dashed border-primary/35"
                aria-hidden
              />
              <span className="absolute right-0 -top-2.5 rounded-full border border-primary/20 bg-card/90 px-2 py-0.5 text-[10px] font-medium text-primary">
                Objectif {formatCurrency(objectifCaMensuel)}
              </span>
            </div>
          )}

          <section className="flex h-full items-end gap-1 sm:gap-1.5">
            {monthlyData.map((item) => {
              const isCurrentMonth =
                isCurrentYear && item.month === currentMonthKey;
              const isHovered = hoveredMonth === item.month;
              const isChartHovered = hoveredMonth !== null;
              const isDimmed = isChartHovered && !isHovered;
              const height =
                item.chiffreAffaires > 0
                  ? Math.max((item.chiffreAffaires / chartMax) * 100, 6)
                  : 2;
              const realisationPercent =
                isCurrentYear && objectifCaMensuel > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (item.chiffreAffaires / objectifCaMensuel) * 100,
                      ),
                    )
                  : null;

              return (
                <section
                  key={item.month}
                  className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                  onMouseEnter={() => setHoveredMonth(item.month)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  {isHovered && (
                    <div
                      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 w-max max-w-[14rem] -translate-x-1/2 rounded-2xl border border-primary/20 bg-card/98 px-3.5 py-3 text-left shadow-card shadow-primary/10 backdrop-blur-md transition-all duration-200 ease-out"
                      role="tooltip"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                        {formatTooltipMonthTitle(item.month)}
                      </p>
                      <div className="mt-2.5 space-y-1.5 text-[11px] leading-snug">
                        <p>
                          <span className="text-muted-foreground">CA : </span>
                          <span className="text-sm font-semibold tabular-nums text-primary">
                            {formatCurrency(item.chiffreAffaires)}
                          </span>
                        </p>
                        {isCurrentYear && objectifCaMensuel > 0 && (
                          <>
                            <p className="text-muted-foreground">
                              Objectif :{" "}
                              <span className="font-medium text-foreground/90">
                                {formatCurrency(objectifCaMensuel)}
                              </span>
                            </p>
                            <p className="text-muted-foreground">
                              Réalisation :{" "}
                              <span className="font-semibold text-foreground">
                                {realisationPercent}%
                              </span>
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex h-full w-full items-end rounded-xl px-0.5 py-1 transition-all duration-200 ease-out",
                      isHovered
                        ? "bg-card-elevated/80"
                        : isDimmed
                          ? "bg-card-elevated/35"
                          : "bg-card-elevated/50",
                    )}
                  >
                    <div
                      className={cn(
                        "w-full origin-bottom rounded-lg transition-all duration-200 ease-out",
                        isCurrentMonth ? "bg-primary" : "bg-primary/65",
                        isCurrentMonth && !isDimmed && "shadow-glow",
                        isHovered &&
                          "scale-y-[1.12] bg-primary brightness-110 shadow-glow",
                        isDimmed && "opacity-40",
                        !isHovered && !isDimmed && "group-hover:bg-primary/80",
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                </section>
              );
            })}
          </section>
        </div>

        <section className="mt-2 flex gap-1 sm:gap-1.5">
          {monthlyData.map((item) => {
            const isCurrentMonth =
              isCurrentYear && item.month === currentMonthKey;
            const isLabelDimmed =
              hoveredMonth !== null && hoveredMonth !== item.month;
            return (
              <span
                key={`${item.month}-label`}
                className={cn(
                  "min-w-0 flex-1 text-center text-[9px] font-medium uppercase tracking-wide transition-opacity duration-200",
                  isCurrentMonth ? "text-primary" : "text-muted-foreground",
                  isLabelDimmed && "opacity-40",
                )}
              >
                {item.label}
              </span>
            );
          })}
        </section>
      </section>

      {isCurrentYear && (
        <ProgressBar value={progressionObjectif} size="sm" className="mt-4" />
      )}
    </Card>
  );
}
