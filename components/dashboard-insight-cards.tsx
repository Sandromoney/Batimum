"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  buildTodayInsightCards,
  type BatimumInsightCard,
  type BatimumInsightTone,
} from "@/lib/batimum-insights";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const TONE_STYLES: Record<
  BatimumInsightTone,
  { icon: typeof Info; className: string }
> = {
  alert: {
    icon: AlertTriangle,
    className: "border-amber-500/20 bg-amber-500/5",
  },
  info: {
    icon: Info,
    className: "border-primary/15 bg-primary/5",
  },
  success: {
    icon: TrendingUp,
    className: "border-emerald-500/20 bg-emerald-500/5",
  },
  neutral: {
    icon: CheckCircle2,
    className: "border-border/60 bg-card-elevated/30",
  },
};

function InsightCard({ card }: { card: BatimumInsightCard }) {
  const tone = TONE_STYLES[card.tone];
  const Icon = tone.icon;
  const content = (
    <Card
      className={cn(
        "btp-card-interactive flex h-full flex-col gap-2 px-4 py-3 transition-all duration-200",
        tone.className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-foreground">
            {card.title}
          </p>
          {card.description ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {card.description}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );

  if (card.href) {
    return (
      <Link href={card.href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}

export function DashboardInsightCards({ data }: { data: AppData }) {
  const cards = useMemo(
    () => buildTodayInsightCards(data),
    [data],
  );

  if (cards.length === 0) return null;

  return (
    <section className="mb-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Aujourd&apos;hui
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <InsightCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
