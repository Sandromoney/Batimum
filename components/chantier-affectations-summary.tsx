"use client";

import Link from "next/link";
import { EmployeAvatar } from "@/components/employe-avatar";
import { Card } from "@/components/ui/card";
import { employeDisplayName } from "@/lib/planning-utils";
import {
  formatJoursSemaineLabel,
  getAffectationsForChantier,
  getNextAffectationDate,
} from "@/lib/planning-affectations";
import type { AppData, Chantier } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CalendarRange, Users } from "lucide-react";

export function ChantierAffectationsSummary({
  chantier,
  data,
}: {
  chantier: Chantier;
  data: AppData;
}) {
  const affectations = getAffectationsForChantier(data.affectations, chantier.id);
  const today = new Date().toISOString().slice(0, 10);

  if (affectations.length === 0) {
    return (
      <Card className="mt-6">
        <header className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Équipe affectée</h2>
        </header>
        <p className="text-sm text-muted-foreground">
          Aucun employé planifié.{" "}
          <Link href="/planning" className="font-medium text-primary hover:underline">
            Planifier une équipe
          </Link>{" "}
          depuis le planning.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Users className="h-4 w-4 text-primary" />
          Équipe affectée
        </h2>
        <Link
          href="/planning"
          className="text-xs font-medium text-primary hover:underline"
        >
          Gérer dans le planning
        </Link>
      </header>

      <ul className="space-y-3">
        {affectations.map((affectation) => {
          const nextDay = getNextAffectationDate(affectation, today);
          const employesAssignes = data.employes.filter((employe) =>
            affectation.employeIds.includes(employe.id),
          );

          return (
            <li
              key={affectation.id}
              className="rounded-xl border border-border/50 bg-card-elevated/25 px-3 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                {employesAssignes.map((employe) => (
                  <span
                    key={employe.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/50 px-2 py-0.5 text-xs"
                  >
                    <EmployeAvatar employe={employe} size="sm" />
                    {employeDisplayName(employe)}
                  </span>
                ))}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarRange className="h-3 w-3" />
                  {formatDate(affectation.dateDebut)} – {formatDate(affectation.dateFin)}
                </span>
                <span>{formatJoursSemaineLabel(affectation.joursSemaine)}</span>
                {nextDay && (
                  <span className="text-primary">
                    Prochain : {formatDate(nextDay)}
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
