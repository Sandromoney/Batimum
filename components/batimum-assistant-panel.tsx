"use client";

import { Card } from "@/components/ui/card";
import { BatimumAssistantChat } from "@/components/batimum-assistant-chat";
import { Bot } from "lucide-react";

/** Variante intégrée (legacy) — le dashboard utilise la bulle flottante. */
export function BatimumAssistantPanel() {
  return (
    <Card className="btp-card-interactive mb-6 flex flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Bot className="h-4 w-4 text-primary" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Assistant Batimum</h2>
          <p className="text-xs text-muted-foreground">
            Pilotez votre entreprise en discutant.
          </p>
        </div>
      </header>
      <BatimumAssistantChat />
    </Card>
  );
}
