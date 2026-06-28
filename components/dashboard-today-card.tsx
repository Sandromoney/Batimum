"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  buildDashboardCompactAlerts,
  buildDashboardTodayDetailLines,
  countDashboardTodayDetailOverflow,
  formatDashboardAlertLabel,
  type DashboardTodaySnapshot,
} from "@/lib/dashboard-today";
import { useHoverDropdown } from "@/lib/use-hover-dropdown";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";

const TICKER_INTERVAL_MS = 5000;

function DashboardAlertLine({
  value,
  label,
  href,
  interactive,
}: {
  value: number;
  label: string;
  href?: string;
  interactive?: boolean;
}) {
  const content = (
    <>
      <span className="font-semibold tabular-nums text-primary">{value}</span>{" "}
      {label}
    </>
  );

  if (href && interactive) {
    return (
      <Link
        href={href}
        className="block truncate text-sm text-foreground transition-colors duration-300 hover:text-primary"
        onClick={(event) => event.stopPropagation()}
      >
        {content}
      </Link>
    );
  }

  return (
    <p className="truncate text-sm text-foreground">{content}</p>
  );
}

export function DashboardTodayCard({
  snapshot,
  data,
}: {
  snapshot: DashboardTodaySnapshot;
  data: AppData;
}) {
  const alerts = buildDashboardCompactAlerts(snapshot, data);
  const detailLines = useMemo(
    () => buildDashboardTodayDetailLines(data, snapshot),
    [data, snapshot],
  );
  const overflowCount = useMemo(
    () => countDashboardTodayDetailOverflow(data, snapshot),
    [data, snapshot],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const {
    open,
    panelMounted,
    panelVisible,
    hoverOpenEnabled,
    toggleMenu,
    closeMenu,
    containerProps,
  } = useHoverDropdown();

  const alertKey = useMemo(
    () => alerts.map((alert) => `${alert.id}:${alert.value}`).join("|"),
    [alerts],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [alertKey]);

  useEffect(() => {
    if (alerts.length <= 1 || open) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % alerts.length);
    }, TICKER_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [alertKey, alerts.length, open]);

  useEffect(() => {
    if (hoverOpenEnabled || !open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [closeMenu, hoverOpenEnabled, open]);

  if (alerts.length === 0 && detailLines.length === 0) {
    return null;
  }

  const slideHeight = "1.375rem";
  const expanded = open && detailLines.length > 0;

  return (
    <div
      ref={rootRef}
      {...containerProps}
      className="mb-4"
      onClick={!hoverOpenEnabled ? toggleMenu : undefined}
      role={!hoverOpenEnabled ? "button" : undefined}
      aria-expanded={detailLines.length > 0 ? open : undefined}
    >
      <Card
        className={cn(
          "btp-dashboard-today-ticker btp-card-interactive overflow-hidden px-4 py-2.5 transition-[box-shadow,border-color] duration-[250ms] sm:py-3",
          expanded && "btp-dashboard-today-expanded",
          !hoverOpenEnabled && "cursor-pointer",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Aujourd&apos;hui
          </span>
          <span
            className="h-4 w-px shrink-0 bg-border/80"
            aria-hidden
          />
          <div
            className="relative min-w-0 flex-1 overflow-hidden"
            style={{ height: slideHeight }}
            aria-live="polite"
            aria-atomic="true"
          >
            {alerts.length > 0 ? (
              <div
                className="btp-dashboard-today-track"
                style={{
                  transform: `translateY(calc(-${activeIndex} * ${slideHeight}))`,
                }}
              >
                {alerts.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center"
                    style={{ height: slideHeight }}
                    aria-hidden={expanded ? index !== activeIndex : undefined}
                  >
                    <DashboardAlertLine
                      value={item.value}
                      label={formatDashboardAlertLabel(item)}
                      href={item.href}
                      interactive={expanded}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="truncate text-sm text-muted-foreground">
                Aucune alerte prioritaire
              </p>
            )}
          </div>
        </div>

        {panelMounted && detailLines.length > 0 ? (
          <div
            className="grid transition-[grid-template-rows] duration-[250ms] ease-out"
            style={{
              gridTemplateRows: panelVisible ? "1fr" : "0fr",
            }}
          >
            <div className="overflow-hidden">
              <div
                className={cn(
                  "btp-dashboard-today-details border-t border-border/50 pt-2.5 transition-opacity duration-[250ms] ease-out",
                  panelVisible ? "opacity-100" : "opacity-0",
                )}
              >
                <ul className="max-h-52 space-y-0.5 overflow-y-auto pr-1">
                  {detailLines.map((line, index) => (
                    <li
                      key={line.id}
                      className={cn(
                        "btp-dashboard-today-detail-item",
                        panelVisible && "btp-dashboard-today-detail-item-visible",
                      )}
                      style={{
                        transitionDelay: panelVisible
                          ? `${Math.min(index * 18, 120)}ms`
                          : "0ms",
                      }}
                    >
                      <Link
                        href={line.href}
                        className="group flex items-start gap-2 rounded-md px-1 py-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted/40 hover:text-foreground"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span
                          className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/70 transition-colors duration-200 group-hover:bg-primary"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 leading-snug">{line.text}</span>
                      </Link>
                    </li>
                  ))}
                  {overflowCount > 0 ? (
                    <li className="px-1 py-1.5 text-xs text-muted-foreground/80">
                      … et {overflowCount} autre{overflowCount > 1 ? "s" : ""}
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
