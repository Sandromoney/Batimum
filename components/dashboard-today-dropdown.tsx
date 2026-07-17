"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  buildTodayMenuItems,
  type TodayMenuItem,
  type TodayMenuPriority,
} from "@/lib/batimum-today-menu";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  type LucideIcon,
} from "lucide-react";

const TICKER_MS = 4000;

const PRIORITY_ICON: Record<
  TodayMenuPriority,
  { Icon: LucideIcon; className: string }
> = {
  critical: { Icon: AlertCircle, className: "text-red-500" },
  warning: { Icon: AlertTriangle, className: "text-orange-500" },
  info: { Icon: Info, className: "text-slate-400" },
  success: { Icon: CheckCircle2, className: "text-emerald-500" },
};

function worstPriority(items: TodayMenuItem[]): TodayMenuPriority {
  if (items.some((i) => i.priority === "critical")) return "critical";
  if (items.some((i) => i.priority === "warning")) return "warning";
  if (items.some((i) => i.priority === "success" && items.length === 1)) {
    return "success";
  }
  return "info";
}

function TodayMenuRow({ item }: { item: TodayMenuItem }) {
  const { Icon, className } = PRIORITY_ICON[item.priority];
  const content = (
    <>
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", className)} strokeWidth={1.75} />
      <span className="min-w-0 flex-1 text-sm leading-snug text-foreground/90">
        {item.label}
      </span>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-50"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-start gap-2.5 rounded-xl px-2.5 py-2">
      {content}
    </div>
  );
}

export function DashboardTodayDropdown({ data }: { data: AppData }) {
  const items = useMemo(() => buildTodayMenuItems(data), [data]);
  const tickerItems = useMemo(
    () => items.filter((item) => item.id !== "all-clear"),
    [items],
  );
  const displayItems = tickerItems.length > 0 ? tickerItems : items;

  const [open, setOpen] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerVisible, setTickerVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentTickerItem =
    displayItems.length > 0
      ? displayItems[tickerIndex % displayItems.length]
      : undefined;

  const headerPriority = currentTickerItem?.priority ?? worstPriority(displayItems);
  const { Icon: HeaderIcon, className: headerIconClass } =
    PRIORITY_ICON[headerPriority];

  const closedLabel = useMemo(() => {
    if (!currentTickerItem) return "Aujourd'hui";
    const label = currentTickerItem.label;
    const normalized =
      label.charAt(0).toLowerCase() + label.slice(1);
    return `Aujourd'hui · ${normalized}`;
  }, [currentTickerItem]);

  useEffect(() => {
    if (open || displayItems.length <= 1) return;

    const interval = window.setInterval(() => {
      setTickerVisible(false);
      window.setTimeout(() => {
        setTickerIndex((index) => (index + 1) % displayItems.length);
        setTickerVisible(true);
      }, 180);
    }, TICKER_MS);

    return () => window.clearInterval(interval);
  }, [open, displayItems.length]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} className="relative mb-4">
      <div
        className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
        style={{ borderRadius: 16 }}
      >
        <button
          type="button"
          className="flex h-11 w-full items-center gap-2.5 px-3.5 text-left sm:px-4"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <HeaderIcon
            className={cn("h-4 w-4 shrink-0", headerIconClass)}
            strokeWidth={1.75}
            aria-hidden
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] font-medium text-foreground/90 transition-all duration-200 ease-out",
              tickerVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
            )}
            aria-live="polite"
          >
            {closedLabel}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-250 ease-out",
              open && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        </button>

        <div
          className="grid transition-[grid-template-rows,opacity] duration-250 ease-out"
          style={{
            gridTemplateRows: open ? "1fr" : "0fr",
            opacity: open ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "border-t border-[#E5E7EB] px-1.5 py-1.5 transition-all duration-250 ease-out",
                open ? "translate-y-0" : "-translate-y-1",
              )}
            >
              <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id}>
                    <TodayMenuRow item={item} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
