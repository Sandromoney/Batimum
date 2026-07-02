"use client";

import Link from "next/link";
import { MumIaQuotaBadge } from "@/components/mum-ia-quota-badge";
import { Card } from "@/components/ui/card";
import { useMumIaQuota } from "@/lib/use-mum-ia-quota";
import { Sparkles } from "lucide-react";

export function DashboardMumIaQuotaCard() {
  const { quota, loading } = useMumIaQuota();

  if (loading && !quota) {
    return (
      <Card className="border-border/80 bg-card/60 p-4">
        <p className="text-xs text-muted-foreground">Chargement du quota MUM IA…</p>
      </Card>
    );
  }

  if (!quota) return null;

  return (
    <Card className="border-border/80 bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">MUM IA</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Quota mensuel de votre entreprise
            </p>
          </div>
        </div>
        <Link
          href="/ia"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Ouvrir →
        </Link>
      </div>
      <div className="mt-3">
        <MumIaQuotaBadge
          used={quota.used}
          monthlyIncluded={quota.monthlyIncluded}
          remaining={quota.remaining}
          renewalDate={quota.renewalDate}
          showWarning={quota.remaining <= 0}
        />
      </div>
    </Card>
  );
}
