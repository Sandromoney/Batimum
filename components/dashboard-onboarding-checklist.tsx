"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Circle, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  dismissOnboardingChecklist,
  isOnboardingChecklistDismissed,
} from "@/lib/onboarding-flow";
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

  const hasSupplier = (parametres.fournisseurs?.length ?? 0) > 0;
  const hasImportedTarif =
    (parametres.entreprisePriceLibrary?.entries?.length ?? 0) > 0 ||
    (parametres.tarifsFournisseurs?.length ?? 0) > 0;
  const hasIaDevis = data.mumIaHistorique.length > 0 || data.devis.length > 0;
  const hasEmployee = (data.employes?.length ?? 0) > 0;

  return [
    {
      id: "company",
      label: "Configurer l'entreprise",
      href: "/parametres?section=entreprise",
      done: companyConfigured,
    },
    {
      id: "supplier",
      label: "Ajouter un fournisseur",
      href: "/parametres?section=entreprise",
      done: hasSupplier,
    },
    {
      id: "tarif",
      label: "Importer un tarif PDF",
      href: "/parametres?section=entreprise",
      done: hasImportedTarif,
    },
    {
      id: "devis-ia",
      label: "Générer un premier devis IA",
      href: "/devis/nouveau",
      done: hasIaDevis,
    },
    {
      id: "employee",
      label: "Inviter un employé",
      href: "/parametres?section=employes",
      done: hasEmployee,
    },
  ];
}

export function DashboardOnboardingChecklist({ data }: { data: AppData }) {
  const items = useMemo(() => buildChecklistItems(data), [data]);
  const completedCount = items.filter((item) => item.done).length;
  const allDone = completedCount === items.length;
  const [dismissed, setDismissed] = useState(isOnboardingChecklistDismissed);

  function handleDismiss() {
    dismissOnboardingChecklist();
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <Card className="overflow-hidden border-[rgba(16,185,129,0.18)] bg-[#f8faf8]">
      <div className="flex items-start justify-between gap-4 border-b border-[rgba(15,23,42,0.06)] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Premiers pas
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Checklist de démarrage
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {completedCount} sur {items.length} étapes complétées
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
          aria-label="Masquer la checklist"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="divide-y divide-[rgba(15,23,42,0.06)] px-5 py-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 py-3 text-sm transition-colors hover:text-primary",
                item.done ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {item.done ? (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(15,23,42,0.12)] text-muted-foreground">
                  <Circle className="h-3 w-3" />
                </span>
              )}
              <span className={cn(item.done && "line-through")}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {allDone ? (
        <div className="border-t border-[rgba(15,23,42,0.06)] px-5 py-4">
          <p className="text-sm font-medium text-foreground">
            Bravo — votre espace Batimum est prêt !
          </p>
        </div>
      ) : null}
    </Card>
  );
}
