"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { buildPilotageSynthese } from "@/lib/batimum-insights";
import type { AppData } from "@/lib/types";
import { Sparkles } from "lucide-react";

export function PilotageSyntheseCard({ data }: { data: AppData }) {
  const synthese = useMemo(() => buildPilotageSynthese(data), [data]);

  return (
    <Card className="btp-card-interactive mb-6 border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Bonjour {synthese.greetingName},
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Aujourd&apos;hui :</p>
          <ul className="mt-2 space-y-1.5">
            {synthese.lines.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-sm leading-snug text-foreground/90"
              >
                <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
