"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Circle, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  dismissOnboardingChecklist,
  isOnboardingChecklistDismissed,
} from "@/lib/onboarding-flow";
import { getPilotageReadiness } from "@/lib/pilotage/readiness";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

function buildChecklistItems(data: AppData): ChecklistItem[] {
  const parametres = data.parametres;
  const companyConfigured = Boolean(
    parametres.entreprise?.trim() &&
      parametres.adresse?.trim() &&
      parametres.telephone?.trim(),
  );

  const hasSupplierTarif =
    (parametres.entreprisePriceLibrary?.entries?.length ?? 0) > 0 ||
    (parametres.tarifsFournisseurs?.length ?? 0) > 0;

  const hasIaDevis = (data.mumIaHistorique?.length ?? 0) > 0;
  const hasChantier = (data.chantiers?.length ?? 0) > 0;
  const pilotageReady = getPilotageReadiness(data).isActionable;

  return [
    {
      id: "company",
      label: "Ajouter vos informations d'entreprise",
      href: "/parametres?section=entreprise",
      done: companyConfigured,
    },
    {
      id: "tarif",
      label: "Ajouter un premier tarif fournisseur",
      href: "/parametres/bibliotheque?tab=fournisseurs",
      done: hasSupplierTarif,
    },
    {
      id: "devis-ia",
      label: "Générer un premier devis avec MUM IA",
      href: "/ia",
      done: hasIaDevis,
    },
    {
      id: "chantier",
      label: "Ajouter votre premier chantier",
      href: "/chantiers",
      done: hasChantier,
    },
    {
      id: "pilotage",
      label: "Activer le pilotage",
      href: "/pilotage",
      done: pilotageReady,
    },
  ];
}

export function DashboardOnboardingChecklist({ data }: { data: AppData }) {
  const items = useMemo(() => buildChecklistItems(data), [data]);
  const completedCount = items.filter((item) => item.done).length;
  const progress = Math.round((completedCount / items.length) * 100);
  const allDone = completedCount === items.length;
  const [dismissed, setDismissed] = useState(isOnboardingChecklistDismissed);
  const [exiting, setExiting] = useState(false);
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const prevDoneRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    let newlyDone: string | null = null;
    for (const item of items) {
      if (item.done && prevDoneRef.current[item.id] === false) {
        newlyDone = item.id;
      }
      prevDoneRef.current[item.id] = item.done;
    }
    if (!newlyDone) return;
    setJustCompletedId(newlyDone);
    const timer = window.setTimeout(() => setJustCompletedId(null), 420);
    return () => window.clearTimeout(timer);
  }, [items]);

  useEffect(() => {
    if (!allDone || dismissed || exiting) return;
    dismissOnboardingChecklist();
    setExiting(true);
    const timer = window.setTimeout(() => setDismissed(true), 380);
    return () => window.clearTimeout(timer);
  }, [allDone, dismissed, exiting]);

  function handleDismiss() {
    dismissOnboardingChecklist();
    setExiting(true);
    window.setTimeout(() => setDismissed(true), 280);
  }

  if (dismissed) return null;

  return (
    <Card
      className={cn(
        "btp-onboarding-checklist overflow-hidden border-accent/25 bg-white p-0 transition-all duration-300 ease-out",
        exiting && "pointer-events-none translate-y-1 opacity-0",
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Débloquer Batimum
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Checklist de démarrage
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {completedCount} sur {items.length} étapes — débloquez les
            fonctionnalités avancées
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-card-elevated hover:text-foreground"
          aria-label="Masquer la checklist"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 pt-4">
        <ProgressBar value={progress} size="sm" label="Progression" />
      </div>

      <ul className="px-3 py-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm transition-all duration-200 ease-out",
                "hover:bg-accent/[0.04]",
                item.done ? "text-muted-foreground" : "text-foreground",
                justCompletedId === item.id && "btp-checklist-item-done",
              )}
            >
              {item.done ? (
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_0_0_3px_rgba(59,130,246,0.15)] transition-transform duration-200 group-hover:scale-105">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-200 group-hover:border-accent/40 group-hover:text-accent">
                  <Circle className="h-3 w-3" />
                </span>
              )}
              <span
                className={cn(
                  "min-w-0 flex-1 font-medium",
                  item.done && "line-through decoration-border",
                )}
              >
                {item.label}
              </span>
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground/50 transition-all duration-200",
                  "group-hover:translate-x-0.5 group-hover:text-accent",
                  item.done && "opacity-40",
                )}
              />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
