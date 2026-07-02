"use client";

import { Button } from "@/components/ui/button";
import { AI_PACK_OPTIONS } from "@/lib/ai-packs";
import { AI_QUOTA_PRO_MONTHLY } from "@/lib/ai-quota";
import {
  buildMumIaQuotaExceededMessage,
  formatMumIaQuotaUsageLabel,
  formatMumIaRenewalLabel,
  getMumIaQuotaTone,
} from "@/lib/mum-ia-quota";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type ParametresAiQuotaSectionProps = {
  used: number;
  limit: number;
  remaining: number;
  monthlyIncluded?: number;
  packCredits?: number;
  renewalDate?: string;
};

export function ParametresAiQuotaSection({
  used,
  limit,
  remaining,
  monthlyIncluded = AI_QUOTA_PRO_MONTHLY,
  packCredits = 0,
  renewalDate,
}: ParametresAiQuotaSectionProps) {
  const included = monthlyIncluded;
  const tone = getMumIaQuotaTone(used, included);

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-card-elevated/50 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Quota MUM IA</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Seuls les devis réellement générés sont comptabilisés. L&apos;analyse
            seule ne consomme pas de crédit.
          </p>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border px-4 py-3",
          tone === "exhausted"
            ? "border-red-500/35 bg-red-500/10"
            : tone === "warning"
              ? "border-amber-400/35 bg-amber-400/10"
              : "border-border/70 bg-card/50",
        )}
      >
        <p
          className={cn(
            "text-sm font-medium",
            tone === "exhausted"
              ? "text-red-300"
              : tone === "warning"
                ? "text-amber-700 dark:text-amber-300"
                : "text-foreground",
          )}
        >
          {formatMumIaQuotaUsageLabel(used, included)}
        </p>
        {renewalDate ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatMumIaRenewalLabel(renewalDate)}
          </p>
        ) : null}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card/50 px-3 py-3">
          <dt className="text-muted-foreground">Inclus abonnement</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">{included}</dd>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/50 px-3 py-3">
          <dt className="text-muted-foreground">Utilisés</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">{used}</dd>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/50 px-3 py-3">
          <dt className="text-muted-foreground">Restants</dt>
          <dd className="mt-1 text-lg font-semibold text-primary">{remaining}</dd>
        </div>
      </dl>

      {packCredits > 0 ? (
        <p className="text-xs text-muted-foreground">
          Crédits pack supplémentaires actifs : {packCredits} (limite totale :{" "}
          {limit})
        </p>
      ) : null}

      {remaining <= 0 && renewalDate ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {buildMumIaQuotaExceededMessage(renewalDate)}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {AI_PACK_OPTIONS.map((pack) => (
          <article
            key={pack.id}
            className="rounded-xl border border-border/70 bg-card/40 p-4"
          >
            <p className="text-sm font-semibold text-foreground">{pack.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{pack.description}</p>
            <p className="mt-3 text-lg font-bold text-primary">{pack.priceEur} €</p>
            <Button type="button" variant="secondary" size="sm" className="mt-3 w-full" disabled>
              Bientôt disponible
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
