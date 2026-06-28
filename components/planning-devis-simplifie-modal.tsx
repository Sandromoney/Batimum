"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  appendPlanningTaskText,
  formatPlanningTaskFromLignes,
} from "@/lib/planning-devis-tasks";
import type { Chantier, Devis, LigneDevis } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

function ligneKey(ligne: LigneDevis, index: number, devisId: string): string {
  return ligne.id || `${devisId}-ligne-${index}`;
}

export function PlanningDevisSimplifieModal({
  open,
  onClose,
  devis,
  chantier,
  currentTask,
  onAddToTask,
}: {
  open: boolean;
  onClose: () => void;
  devis: Devis | null;
  chantier?: Chantier | null;
  currentTask?: string;
  onAddToTask?: (nextTask: string) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const lignes = useMemo(
    () => (Array.isArray(devis?.lignes) ? devis!.lignes : []),
    [devis],
  );

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
    }
  }, [open, devis?.id]);

  if (!devis) return null;

  function toggleLine(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddToTask() {
    if (!devis || !onAddToTask) return;

    const selectedLignes = lignes.filter((ligne, index) =>
      selectedIds.has(ligneKey(ligne, index, devis.id)),
    );
    if (selectedLignes.length === 0) return;

    const formatted = formatPlanningTaskFromLignes(selectedLignes);
    onAddToTask(appendPlanningTaskText(currentTask, formatted));
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Devis ${devis.numero}`}
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-border/60 bg-card-elevated/40 px-4 py-3">
          <p className="text-sm font-medium text-foreground">{devis.titre}</p>
          {chantier && (
            <p className="mt-1 text-xs text-muted-foreground">
              Chantier : {chantier.nom}
            </p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lignes du devis
          </h3>
          {lignes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune ligne dans ce devis.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border/70 p-2">
              {lignes.map((ligne, index) => {
                const id = ligneKey(ligne, index, devis.id);
                const checked = selectedIds.has(id);

                return (
                  <li key={id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                        checked
                          ? "border-primary/30 bg-primary/10"
                          : "border-transparent bg-card-elevated/40 hover:bg-card-hover/60",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                        checked={checked}
                        onChange={() => toggleLine(id)}
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="font-medium text-foreground">
                          {ligne.description || "—"}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {ligne.quantite} {ligne.unite ?? "forfait"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-xs text-muted-foreground">
          Vue terrain — montants masqués. Cochez les lignes à reprendre dans la
          tâche planning.
        </p>

        {onAddToTask && lignes.length > 0 && (
          <Button
            type="button"
            className="w-full"
            disabled={selectedIds.size === 0}
            onClick={handleAddToTask}
          >
            <Plus className="h-4 w-4" />
            Ajouter à la tâche
          </Button>
        )}
      </div>
    </Modal>
  );
}
