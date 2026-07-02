"use client";

import {
  buildMumIaQuotaExceededMessage,
  formatMumIaQuotaUsageLabel,
  getMumIaQuotaTone,
} from "@/lib/mum-ia-quota";
import { cn } from "@/lib/utils";

type MumIaQuotaBadgeProps = {
  used?: number;
  monthlyIncluded?: number;
  remaining?: number;
  renewalDate?: string;
  loading?: boolean;
  className?: string;
  showWarning?: boolean;
};

export function MumIaQuotaBadge({
  used,
  monthlyIncluded = 100,
  remaining,
  renewalDate,
  loading = false,
  className,
  showWarning = true,
}: MumIaQuotaBadgeProps) {
  if (loading) {
    return (
      <div className={cn("text-right", className)}>
        <span className="inline-flex shrink-0 whitespace-nowrap rounded-md border border-border/60 bg-card/50 px-2.5 py-1 text-[11px] text-muted-foreground">
          Quota en cours de chargement…
        </span>
      </div>
    );
  }

  if (used == null) {
    return null;
  }

  const isExhausted =
    remaining != null ? remaining <= 0 : used >= monthlyIncluded;
  const tone = getMumIaQuotaTone(used, monthlyIncluded);

  return (
    <div className={cn("space-y-1", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] tabular-nums",
          tone === "exhausted"
            ? "border-red-500/40 bg-red-500/10 text-red-300"
            : tone === "warning"
              ? "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300"
              : "border-border/60 bg-card/50 text-muted-foreground",
        )}
        title="Comptabilisé uniquement après génération réussie d'un devis MUM IA"
      >
        {formatMumIaQuotaUsageLabel(used, monthlyIncluded)}
      </span>
      {showWarning && isExhausted && renewalDate ? (
        <p className="text-[11px] leading-relaxed text-red-300">
          {buildMumIaQuotaExceededMessage(renewalDate)}
        </p>
      ) : null}
    </div>
  );
}
