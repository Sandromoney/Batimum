"use client";

import { useEffect, useRef, useState } from "react";
import { useMumIaQuota } from "@/lib/use-mum-ia-quota";
import { getAiUsagePercentage } from "@/lib/ai/ai-credits-client";
import { formatParisDateLongLabel } from "@/lib/mum-ia-credit-period";
import { cn } from "@/lib/utils";

function ringColor(percent: number): string {
  if (percent >= 100) return "#dc2626";
  if (percent >= 85) return "#ef4444";
  if (percent >= 60) return "#f59e0b";
  return "#059669";
}

export function AiUsageIndicator() {
  const { quota, loading, refresh } = useMumIaQuota();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const used = quota?.used ?? 0;
  const total = quota?.limit ?? 100;
  const remaining = Math.max(0, total - used);
  const percent =
    typeof quota?.percentageUsed === "number"
      ? Math.min(100, Math.round(quota.percentageUsed))
      : getAiUsagePercentage(used, total);
  const color = ringColor(percent);
  const lowQuota = percent >= 85;
  const renewal =
    quota?.renewalDate || quota?.periodEnd
      ? formatParisDateLongLabel(quota.renewalDate || quota.periodEnd)
      : "—";

  useEffect(() => {
    if (!open) return;
    void refresh();
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, refresh]);

  const size = 34;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (1 - Math.min(100, percent) / 100);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border bg-white px-1.5 py-1 shadow-sm transition-colors",
          lowQuota
            ? "border-red-200 hover:border-red-300"
            : "border-border/70 hover:border-emerald-200",
          percent >= 100 && "ring-2 ring-red-200/80",
        )}
        aria-label={`MUM IA : ${used} / ${total}`}
        title={`MUM IA : ${used} / ${total}`}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dash}
            className="transition-all duration-500"
          />
        </svg>
        <span className="pr-1.5 text-left leading-tight">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            MUM IA
          </span>
          <span
            className="block text-xs font-semibold tabular-nums"
            style={{ color }}
          >
            {loading ? "…" : `${used} / ${total}`}
          </span>
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] w-[min(300px,calc(100vw-2rem))] rounded-2xl border border-border/70 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
          <p className="text-sm font-semibold text-foreground">Utilisation MUM IA</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color }}>
            {used} / {total}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {used} devis IA utilisé{used > 1 ? "s" : ""} sur {total}
          </p>
          <p className="text-sm text-muted-foreground">
            {remaining} devis IA restant{remaining > 1 ? "s" : ""}
          </p>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${percent}%`, backgroundColor: color }}
            />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Réinitialisation le {renewal || "—"}
          </p>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Une création de devis MUM IA réussie utilise 1 demande.
          </p>
        </div>
      ) : null}
    </div>
  );
}
