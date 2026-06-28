"use client";

import type { MumIaConseil } from "@/lib/mum-ia-conseils";
import { Check, Sparkles } from "lucide-react";

export function MumIaConseilsCard({ conseils }: { conseils: MumIaConseil[] }) {
  if (conseils.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card-elevated/30 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        Conseils MUM IA
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {conseils.map((conseil) => (
          <li
            key={conseil.text}
            className="flex items-start gap-1.5 text-xs text-muted-foreground"
          >
            <Check
              className={`mt-0.5 h-3 w-3 shrink-0 ${
                conseil.ok ? "text-primary" : "text-amber-500"
              }`}
            />
            <span>{conseil.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
