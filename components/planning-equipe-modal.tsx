"use client";

import { useEffect, useMemo, useState } from "react";
import { EmployeAvatar } from "@/components/employe-avatar";
import { PlanningRangeCalendar } from "@/components/planning-range-calendar";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { employeDisplayName } from "@/lib/planning-utils";
import {
  applyAffectationCreate,
  applyAffectationUpdate,
  createDefaultAffectationDraft,
  DEFAULT_JOURS_SEMAINE_AFFECTATION,
  expandAffectationDates,
  JOURS_SEMAINE_PLANNING,
  type ConflictResolution,
  type PlanningAffectationConflict,
} from "@/lib/planning-affectations";
import type { AppData, Chantier, ChantierAffectation, Employe } from "@/lib/types";
import { cn, formatTime24h } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const heures24 = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const minutes = ["00", "15", "30", "45"];

function getTimePart(time: string, part: "hour" | "minute") {
  const [hour = "08", minute = "00"] = formatTime24h(time).split(":");
  return part === "hour" ? hour : minute;
}

function updateTimePart(time: string, part: "hour" | "minute", value: string) {
  const [hour = "08", minute = "00"] = formatTime24h(time).split(":");
  return part === "hour" ? `${value}:${minute}` : `${hour}:${value}`;
}

function toggleJour(jours: number[], jour: number): number[] {
  return jours.includes(jour)
    ? jours.filter((item) => item !== jour)
    : [...jours, jour].sort((a, b) => a - b);
}

function toggleEmploye(ids: string[], employeId: string): string[] {
  return ids.includes(employeId)
    ? ids.filter((id) => id !== employeId)
    : [...ids, employeId];
}

function ConflictDialog({
  open,
  conflicts,
  employes,
  onChoose,
  onClose,
}: {
  open: boolean;
  conflicts: PlanningAffectationConflict[];
  employes: Employe[];
  onChoose: (resolution: ConflictResolution) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const employeMap = new Map(employes.map((employe) => [employe.id, employe]));

  return (
    <Modal open={open} onClose={onClose} title="Conflits de planning">
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-xl border btp-alert-warning px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Un ou plusieurs employés sont déjà affectés sur certaines dates.
        </p>
        <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
          {conflicts.slice(0, 8).map((conflict, index) => {
            const employe = employeMap.get(conflict.employeId);
            return (
              <li
                key={`${conflict.employeId}-${conflict.date}-${index}`}
                className="rounded-lg border border-border/60 bg-card-elevated/40 px-3 py-2"
              >
                <span className="font-medium text-foreground">
                  {employe ? employeDisplayName(employe) : "Employé"}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  — {conflict.date} ({conflict.existingEvent.heureDebut}–
                  {conflict.existingEvent.heureFin}) : {conflict.existingEvent.titre}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onChoose("cancel")}>
            Annuler
          </Button>
          <Button type="button" variant="ghost" onClick={() => onChoose("ignore")}>
            Ignorer les jours en conflit
          </Button>
          <Button type="button" onClick={() => onChoose("replace")}>
            Remplacer l&apos;affectation existante
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function PlanningEquipeModal({
  open,
  onClose,
  chantiers,
  employes,
  data,
  onApply,
  editingAffectation,
  defaultChantierId,
}: {
  open: boolean;
  onClose: () => void;
  chantiers: Chantier[];
  employes: Employe[];
  data: AppData;
  onApply: (next: AppData) => void;
  editingAffectation?: ChantierAffectation | null;
  defaultChantierId?: string;
}) {
  const isEdit = Boolean(editingAffectation);
  const [form, setForm] = useState<ChantierAffectation>(() =>
    createDefaultAffectationDraft(),
  );
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<PlanningAffectationConflict[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);

  const selectedChantier = useMemo(
    () => chantiers.find((chantier) => chantier.id === form.chantierId) ?? null,
    [chantiers, form.chantierId],
  );

  useEffect(() => {
    if (!open) return;
    if (editingAffectation) {
      setForm(editingAffectation);
    } else {
      const chantier =
        chantiers.find((item) => item.id === defaultChantierId) ?? chantiers[0] ?? null;
      setForm(createDefaultAffectationDraft(chantier));
    }
    setError("");
    setConflicts([]);
    setConflictOpen(false);
  }, [open, editingAffectation, defaultChantierId, chantiers]);

  const activeEmployes = useMemo(
    () => employes.filter((employe) => employe.statut !== "desactive"),
    [employes],
  );

  const previewDates = useMemo(
    () => expandAffectationDates(form.dateDebut, form.dateFin, form.joursSemaine),
    [form.dateDebut, form.dateFin, form.joursSemaine],
  );

  function validate(): boolean {
    if (!form.chantierId) {
      setError("Sélectionnez un chantier.");
      return false;
    }
    if (form.employeIds.length === 0) {
      setError("Sélectionnez au moins un employé.");
      return false;
    }
    if (!form.dateDebut || !form.dateFin || form.dateFin < form.dateDebut) {
      setError("Sélectionnez une période valide dans le calendrier.");
      return false;
    }
    if (form.joursSemaine.length === 0) {
      setError("Sélectionnez au moins un jour travaillé.");
      return false;
    }
    if (form.heureFin <= form.heureDebut) {
      setError("L'heure de fin doit être après l'heure de début.");
      return false;
    }
    if (previewDates.length === 0) {
      setError("Aucun jour ne correspond à la période et aux jours sélectionnés.");
      return false;
    }
    setError("");
    return true;
  }

  function submit(resolution: ConflictResolution = "cancel") {
    if (!validate() || !selectedChantier) return;

    const payload: ChantierAffectation = {
      ...form,
      chantierId: selectedChantier.id,
      note: form.note?.trim() || undefined,
    };

    const result = isEdit
      ? applyAffectationUpdate(data, payload, resolution)
      : applyAffectationCreate(data, payload, resolution);

    if (!result.ok && "conflicts" in result) {
      setConflicts(result.conflicts);
      setConflictOpen(true);
      return;
    }

    if (!result.ok) return;

    onApply(result.data);
    onClose();
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isEdit ? "Modifier la planification d'équipe" : "Planifier une équipe"}
      >
        <form
          className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
          onSubmit={(event) => {
            event.preventDefault();
            submit("cancel");
          }}
        >
          {error && (
            <p className="rounded-xl border btp-alert-error px-4 py-3 text-sm">
              {error}
            </p>
          )}

          <section>
            <Label>Chantier</Label>
            <Select
              value={form.chantierId}
              onChange={(event) => {
                const chantier = chantiers.find((item) => item.id === event.target.value);
                setForm((previous) => ({
                  ...previous,
                  chantierId: event.target.value,
                  dateDebut: chantier?.dateDebut || previous.dateDebut,
                  dateFin: chantier?.dateFin || previous.dateFin,
                }));
              }}
            >
              <option value="">Sélectionner un chantier</option>
              {chantiers.map((chantier) => (
                <option key={chantier.id} value={chantier.id}>
                  {chantier.nom}
                </option>
              ))}
            </Select>
          </section>

          <section>
            <Label>Période</Label>
            <PlanningRangeCalendar
              dateDebut={form.dateDebut}
              dateFin={form.dateFin}
              onChange={({ dateDebut, dateFin }) =>
                setForm((previous) => ({ ...previous, dateDebut, dateFin }))
              }
            />
          </section>

          <section>
            <Label>Employé(s)</Label>
            {activeEmployes.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Aucun employé actif. Ajoutez-en via le bouton Équipe.
              </p>
            ) : (
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {activeEmployes.map((employe) => {
                  const selected = form.employeIds.includes(employe.id);
                  return (
                    <li key={employe.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((previous) => ({
                            ...previous,
                            employeIds: toggleEmploye(previous.employeIds, employe.id),
                          }))
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                          selected
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border/60 bg-card-elevated/30 text-muted-foreground hover:border-border hover:bg-card-hover/40",
                        )}
                      >
                        <EmployeAvatar employe={employe} size="sm" />
                        <span className="font-medium">{employeDisplayName(employe)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <Label>Jours travaillés</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {JOURS_SEMAINE_PLANNING.map((jour) => {
                const selected = form.joursSemaine.includes(jour.value);
                return (
                  <button
                    key={jour.value}
                    type="button"
                    onClick={() =>
                      setForm((previous) => ({
                        ...previous,
                        joursSemaine: toggleJour(previous.joursSemaine, jour.value),
                      }))
                    }
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border/60 bg-card-elevated/30 text-muted-foreground hover:border-border",
                    )}
                  >
                    {jour.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() =>
                  setForm((previous) => ({
                    ...previous,
                    joursSemaine: [...DEFAULT_JOURS_SEMAINE_AFFECTATION],
                  }))
                }
              >
                Lun – Ven
              </button>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() =>
                  setForm((previous) => ({
                    ...previous,
                    joursSemaine: [1, 2, 3, 4, 5, 6],
                  }))
                }
              >
                Lun – Sam
              </button>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Heure début</Label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="btp-input h-10 rounded-lg border border-border/60 bg-card px-2 text-sm"
                  value={getTimePart(form.heureDebut, "hour")}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      heureDebut: updateTimePart(
                        previous.heureDebut,
                        "hour",
                        event.target.value,
                      ),
                    }))
                  }
                >
                  {heures24.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
                <select
                  className="btp-input h-10 rounded-lg border border-border/60 bg-card px-2 text-sm"
                  value={getTimePart(form.heureDebut, "minute")}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      heureDebut: updateTimePart(
                        previous.heureDebut,
                        "minute",
                        event.target.value,
                      ),
                    }))
                  }
                >
                  {minutes.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>Heure fin</Label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="btp-input h-10 rounded-lg border border-border/60 bg-card px-2 text-sm"
                  value={getTimePart(form.heureFin, "hour")}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      heureFin: updateTimePart(
                        previous.heureFin,
                        "hour",
                        event.target.value,
                      ),
                    }))
                  }
                >
                  {heures24.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
                <select
                  className="btp-input h-10 rounded-lg border border-border/60 bg-card px-2 text-sm"
                  value={getTimePart(form.heureFin, "minute")}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      heureFin: updateTimePart(
                        previous.heureFin,
                        "minute",
                        event.target.value,
                      ),
                    }))
                  }
                >
                  {minutes.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <Label>Note (optionnelle)</Label>
            <Input
              value={form.note ?? ""}
              placeholder="Ex. Accès par l'arrière du bâtiment"
              onChange={(event) =>
                setForm((previous) => ({ ...previous, note: event.target.value }))
              }
            />
          </section>

          {selectedChantier && (
            <p className="rounded-xl border border-border/60 bg-card-elevated/30 px-4 py-3 text-xs text-muted-foreground">
              {previewDates.length} journée{previewDates.length > 1 ? "s" : ""} seront
              planifiée{previewDates.length > 1 ? "s" : ""} sur{" "}
              <span className="font-medium text-foreground">{selectedChantier.nom}</span>
              {form.joursSemaine.includes(7) ? "" : " (hors dimanches non cochés)"}.
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {isEdit ? "Mettre à jour" : "Planifier l'équipe"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConflictDialog
        open={conflictOpen}
        conflicts={conflicts}
        employes={employes}
        onChoose={(resolution) => {
          setConflictOpen(false);
          if (resolution === "cancel") return;
          submit(resolution);
        }}
        onClose={() => setConflictOpen(false)}
      />
    </>
  );
}
