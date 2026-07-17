"use client";

import { Input, Select } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import {
  CATEGORIES_PILOTAGE,
  CATEGORIE_PILOTAGE_LABELS,
  computeDevisCoutMainOeuvrePrevu,
  computeDevisCoutMateriauxPrevu,
} from "@/lib/pilotage";
import type { CategoriePilotageChantier, Devis } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown, Lock } from "lucide-react";
import { useState } from "react";

export function DevisPilotageSection({
  devis,
  onUpdateDevis,
}: {
  devis: Devis;
  onUpdateDevis: (patch: Partial<Devis>) => void;
}) {
  const { data } = useStore();
  const [open, setOpen] = useState(false);
  const mo = devis.pilotageMainOeuvre ?? {};
  const heures = mo.heuresPrevues ?? 0;
  const defaultTaux = data.parametres.tauxHoraireInterneDefaut ?? 32;
  const taux = mo.tauxHoraireInterne ?? defaultTaux;
  const coutMoPrevu = computeDevisCoutMainOeuvrePrevu({
    ...devis,
    pilotageMainOeuvre: { ...mo, heuresPrevues: heures, tauxHoraireInterne: taux },
  });
  const coutMateriauxPrevu = computeDevisCoutMateriauxPrevu(devis);

  function updateMainOeuvre(patch: Partial<NonNullable<Devis["pilotageMainOeuvre"]>>) {
    onUpdateDevis({
      pilotageMainOeuvre: { ...mo, ...patch },
    });
  }

  function toggleEmployePrevu(employeId: string) {
    const current = mo.employesPrevusIds ?? [];
    const next = current.includes(employeId)
      ? current.filter((id) => id !== employeId)
      : [...current, employeId];
    updateMainOeuvre({ employesPrevusIds: next });
  }

  return (
    <section className="rounded-2xl border border-border/50 bg-card/40">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <Lock className="h-4 w-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Pilotage interne</p>
          <p className="text-xs text-muted-foreground">
            Main-d&apos;œuvre et catégorie — invisible sur le PDF client
          </p>
        </div>
        <span className="hidden rounded-full bg-card-elevated px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          MO {formatCurrency(coutMoPrevu)} · Mat. {formatCurrency(coutMateriauxPrevu)}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="grid gap-4 border-t border-border/50 px-4 py-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">
              Type de chantier (analyse)
            </span>
            <Select
              className="h-9 rounded-xl text-sm"
              value={devis.categoriePilotage ?? ""}
              onChange={(event) =>
                onUpdateDevis({
                  categoriePilotage: (event.target.value ||
                    undefined) as CategoriePilotageChantier | undefined,
                })
              }
            >
              <option value="">— Choisir —</option>
              {CATEGORIES_PILOTAGE.map((categorie) => (
                <option key={categorie} value={categorie}>
                  {CATEGORIE_PILOTAGE_LABELS[categorie]}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Heures prévues
            </span>
            <Input
              type="number"
              min={0}
              step="0.5"
              className="h-9 rounded-xl text-sm"
              value={heures || ""}
              onChange={(event) =>
                updateMainOeuvre({
                  heuresPrevues: Math.max(0, Number(event.target.value) || 0),
                })
              }
              placeholder="Ex : 80"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Taux horaire interne (€/h)
            </span>
            <Input
              type="number"
              min={0}
              step="0.5"
              className="h-9 rounded-xl text-sm"
              value={taux || ""}
              onChange={(event) =>
                updateMainOeuvre({
                  tauxHoraireInterne: Math.max(0, Number(event.target.value) || 0),
                })
              }
              placeholder={`Ex : ${defaultTaux} (défaut entreprise)`}
            />
          </label>

          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Équipe prévue (optionnel)
            </p>
            <div className="flex flex-wrap gap-2">
              {data.employes
                .filter((employe) => employe.statut !== "desactive")
                .map((employe) => {
                  const selected = (mo.employesPrevusIds ?? []).includes(employe.id);
                  return (
                    <button
                      key={employe.id}
                      type="button"
                      onClick={() => toggleEmployePrevu(employe.id)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        selected
                          ? "border-foreground/20 bg-card-elevated font-medium text-foreground"
                          : "border-border/60 text-muted-foreground hover:border-border"
                      }`}
                    >
                      {employe.prenom} {employe.nom}
                    </button>
                  );
                })}
            </div>
          </div>

          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Coût MO prévu :{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(coutMoPrevu)} HT
            </span>
            {heures > 0 && taux > 0 ? ` (${heures} h × ${taux} €/h)` : null}
          </p>
        </div>
      )}
    </section>
  );
}
