"use client";

import { useMemo, useState } from "react";
import { EmployeAvatar } from "@/components/employe-avatar";
import { PlanningDevisSimplifieModal } from "@/components/planning-devis-simplifie-modal";
import { PlanningEmployesModal } from "@/components/planning-employes-modal";
import { PlanningEquipeModal } from "@/components/planning-equipe-modal";
import { PlanningWeekView } from "@/components/planning-week-view";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DateInput, Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { getClientDisplayName } from "@/lib/clients";
import type { ChantierAffectation, Employe, EvenementPlanning } from "@/lib/types";
import {
  addWeeksIso,
  employeDisplayName,
  resolveEmployes,
  sortPlanningEvents,
  startOfWeekIso,
} from "@/lib/planning-utils";
import {
  applyAffectationDelete,
  formatJoursSemaineLabel,
} from "@/lib/planning-affectations";
import {
  getPlanningEventDisplayTitle,
  getPlanningTypeLabel,
  normalizePlanningEventType,
  PLANNING_EVENT_TYPES,
  preparePlanningEventForSave,
} from "@/lib/planning-types";
import {
  hasValidationErrors,
  validatePlanningEvent,
  type ValidationErrors,
} from "@/lib/validations";
import { cn, formatDateTimeFR, formatTime24h, generateId } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, FileText, CalendarClock, Plus, Trash2, Users } from "lucide-react";

const heures24 = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const minutes = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);

function getTimePart(time: string, part: "hour" | "minute") {
  const [hour = "00", minute = "00"] = formatTime24h(time).split(":");
  return part === "hour" ? hour : minute;
}

function updateTimePart(
  time: string,
  part: "hour" | "minute",
  value: string,
) {
  const [hour = "00", minute = "00"] = formatTime24h(time).split(":");
  return part === "hour" ? `${value}:${minute}` : `${hour}:${value}`;
}

function toggleEmployeId(ids: string[] | undefined, employeId: string): string[] {
  const current = ids ?? [];
  return current.includes(employeId)
    ? current.filter((id) => id !== employeId)
    : [...current, employeId];
}

function getEventEmployeeProgress(event: EvenementPlanning) {
  const assigned = event.employeIds?.length ?? 0;
  const done = event.employeTermineIds?.length ?? 0;
  const enCours = event.employeEnCoursIds?.length ?? 0;
  const problems = event.employeProblemes?.length ?? 0;
  return { assigned, done, enCours, problems };
}

export default function PlanningPage() {
  const { data, setData } = useStore();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeekIso(new Date().toISOString().slice(0, 10)),
  );
  const [openEvent, setOpenEvent] = useState(false);
  const [openEmployes, setOpenEmployes] = useState(false);
  const [form, setForm] = useState<EvenementPlanning | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showValidationToast, setShowValidationToast] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [affectationToDelete, setAffectationToDelete] = useState<string | null>(null);
  const [openEquipe, setOpenEquipe] = useState(false);
  const [editingAffectation, setEditingAffectation] = useState<ChantierAffectation | null>(
    null,
  );
  const [devisModalOpen, setDevisModalOpen] = useState(false);
  const invalidClass = "border-red-500 focus:border-red-500 focus:ring-red-500/20";

  const sortedAll = useMemo(
    () => sortPlanningEvents(data.planning),
    [data.planning],
  );

  function openCreate(date?: string) {
    setForm({
      id: generateId(),
      titre: "",
      tache: "",
      date: date ?? new Date().toISOString().slice(0, 10),
      heureDebut: "09:00",
      heureFin: "10:00",
      type: "intervention",
      employeIds: [],
    });
    setErrors({});
    setShowValidationToast(false);
    setDevisModalOpen(false);
    setOpenEvent(true);
  }

  function openEdit(event: EvenementPlanning) {
    setForm({
      ...event,
      type: normalizePlanningEventType(event.type) as EvenementPlanning["type"],
      tache: event.tache ?? event.titre ?? "",
      employeIds: event.employeIds ?? [],
    });
    setErrors({});
    setShowValidationToast(false);
    setDevisModalOpen(false);
    setOpenEvent(true);
  }

  function save() {
    if (!form) return;
    const nextErrors = validatePlanningEvent(form);
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) {
      setShowValidationToast(true);
      return;
    }
    const chantier = form.chantierId
      ? data.chantiers.find((ch) => ch.id === form.chantierId)
      : null;
    const prepared = preparePlanningEventForSave(form, chantier);
    setData((prev) => {
      const exists = prev.planning.some((p) => p.id === prepared.id);
      return {
        ...prev,
        planning: exists
          ? prev.planning.map((p) => (p.id === prepared.id ? prepared : p))
          : [...prev.planning, prepared],
      };
    });
    setOpenEvent(false);
    setWeekStart(startOfWeekIso(prepared.date));
  }

  function remove(id: string) {
    setData((prev) => ({
      ...prev,
      planning: prev.planning.filter((p) => p.id !== id),
    }));
  }

  function saveEmployes(nextEmployes: Employe[]) {
    const validIds = new Set(nextEmployes.map((e) => e.id));
    setData((prev) => ({
      ...prev,
      employes: nextEmployes,
      planning: prev.planning.map((event) => ({
        ...event,
        employeIds: (event.employeIds ?? []).filter((id) => validIds.has(id)),
      })),
    }));
  }

  function openPlanifierEquipe(affectation?: ChantierAffectation | null) {
    setEditingAffectation(affectation ?? null);
    setOpenEquipe(true);
  }

  return (
    <>
      <PageHeader
        title="Planning"
        description="Vue hebdomadaire, équipe et assignations chantier"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setOpenEmployes(true)}>
              <Users className="h-4 w-4" />
              Équipe ({data.employes.length})
            </Button>
            <Button variant="secondary" onClick={() => openPlanifierEquipe()}>
              <CalendarClock className="h-4 w-4" />
              Planifier une équipe
            </Button>
            <Button onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              Nouvel événement
            </Button>
          </div>
        }
      />

      <div className="btp-planning-page space-y-6">
      <PlanningWeekView
        weekStart={weekStart}
        onWeekChange={(delta) =>
          setWeekStart((current) => addWeeksIso(current, delta))
        }
        onToday={() =>
          setWeekStart(
            startOfWeekIso(new Date().toISOString().slice(0, 10)),
          )
        }
        events={data.planning}
        chantiers={data.chantiers}
        employes={data.employes}
        onEditEvent={openEdit}
        onDeleteEvent={setEventToDelete}
        onCreateForDate={openCreate}
      />

      <section className="mt-10">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Tous les événements
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedAll.map((e) => {
            const chantier = e.chantierId
              ? data.chantiers.find((ch) => ch.id === e.chantierId)
              : null;
            const assigned = resolveEmployes(e.employeIds, data.employes);
            const displayTitle = getPlanningEventDisplayTitle(e, chantier);
            const typeLabel = getPlanningTypeLabel(e);
            const progress = getEventEmployeeProgress(e);

            return (
              <li key={e.id}>
                <Card className="flex flex-col gap-3">
                  <header className="flex items-start justify-between gap-2">
                    <section>
                      <h3 className="font-semibold">{displayTitle}</h3>
                      <p className="text-sm text-muted">
                        {formatDateTimeFR(e.date, e.heureDebut)}–
                        {formatTime24h(e.heureFin)}
                      </p>
                      {chantier && (
                        <p className="mt-1 text-xs text-primary">{chantier.nom}</p>
                      )}
                    </section>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge label={typeLabel} status={normalizePlanningEventType(e.type)} />
                      {progress.assigned > 0 && progress.done > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <CheckCircle2 className="h-3 w-3" />
                          {progress.done}/{progress.assigned} terminé
                          {progress.done > 1 ? "s" : ""}
                        </span>
                      )}
                      {progress.problems > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-warning-foreground">
                          <AlertTriangle className="h-3 w-3" />
                          {progress.problems} signalement
                          {progress.problems > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </header>
                  {assigned.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {assigned.map((employe) => (
                        <span
                          key={employe.id}
                          className="btp-employe-chip inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card-elevated/50 px-2 py-1 text-xs"
                        >
                          <EmployeAvatar employe={employe} size="sm" />
                          {employeDisplayName(employe)}
                        </span>
                      ))}
                    </div>
                  )}
                  <footer className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(e)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setEventToDelete(e.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </footer>
                </Card>
              </li>
            );
          })}
        </ul>
        {sortedAll.length === 0 && (
          <p className="py-8 text-center text-muted">
            Aucun événement planifié.
          </p>
        )}
      </section>
      </div>

      {form && (() => {
        const selectedChantier = form.chantierId
          ? data.chantiers.find((ch) => ch.id === form.chantierId)
          : null;
        const selectedClient = selectedChantier
          ? data.clients.find((c) => c.id === selectedChantier.clientId)
          : null;
        const linkedDevis = selectedChantier?.devisId
          ? data.devis.find((d) => d.id === selectedChantier.devisId)
          : null;
        const linkedAffectation = form.affectationId
          ? data.affectations.find((item) => item.id === form.affectationId)
          : null;
        const tacheRequired = !form.chantierId?.trim();

        return (
        <Modal
          open={openEvent}
          onClose={() => setOpenEvent(false)}
          title="Événement"
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {showValidationToast && (
              <p className="rounded-xl border btp-alert-error px-4 py-3 text-sm">
                Veuillez corriger les champs en rouge.
              </p>
            )}
            {linkedAffectation && selectedChantier && (
              <section className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">
                  Affectation sur période — {selectedChantier.nom}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {linkedAffectation.dateDebut} → {linkedAffectation.dateFin} ·{" "}
                  {formatJoursSemaineLabel(linkedAffectation.joursSemaine)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => openPlanifierEquipe(linkedAffectation)}
                  >
                    Modifier toute la période
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => setAffectationToDelete(linkedAffectation.id)}
                  >
                    Supprimer toute la période
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Vous pouvez aussi modifier uniquement cette journée ci-dessous.
                </p>
              </section>
            )}
            <section>
              <Label>
                Tâche
                {!tacheRequired && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    (optionnel)
                  </span>
                )}
              </Label>
              <Input
                value={form.tache ?? ""}
                placeholder={
                  tacheRequired
                    ? "Ex. Pose carrelage salle de bain"
                    : "Ex. Préparation zone de travail"
                }
                className={errors.tache ? invalidClass : undefined}
                onChange={(e) => setForm({ ...form, tache: e.target.value })}
              />
              {errors.tache && (
                <p className="mt-1 text-sm text-red-400">{errors.tache}</p>
              )}
            </section>
            <section className="grid grid-cols-2 gap-4">
              <section>
                <Label>Date</Label>
                <DateInput
                  value={form.date}
                  className={errors.date ? invalidClass : undefined}
                  onChangeValue={(value) => setForm({ ...form, date: value })}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-400">{errors.date}</p>
                )}
              </section>
              <section>
                <Label>Type</Label>
                <Select
                  value={normalizePlanningEventType(form.type)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as EvenementPlanning["type"],
                      typePersonnalise:
                        e.target.value === "autre"
                          ? form.typePersonnalise
                          : undefined,
                    })
                  }
                >
                  {PLANNING_EVENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </section>
              {normalizePlanningEventType(form.type) === "autre" && (
                <section className="col-span-2">
                  <Label>Type personnalisé</Label>
                  <Input
                    value={form.typePersonnalise ?? ""}
                    placeholder="Précisez le type d'événement"
                    className={errors.typePersonnalise ? invalidClass : undefined}
                    onChange={(e) =>
                      setForm({ ...form, typePersonnalise: e.target.value })
                    }
                  />
                  {errors.typePersonnalise && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.typePersonnalise}
                    </p>
                  )}
                </section>
              )}
              <section>
                <Label>Heure début</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={getTimePart(form.heureDebut, "hour")}
                    className={errors.heureDebut ? invalidClass : undefined}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        heureDebut: updateTimePart(
                          form.heureDebut,
                          "hour",
                          e.target.value,
                        ),
                      })
                    }
                    aria-label="Heure début"
                  >
                    {heures24.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={getTimePart(form.heureDebut, "minute")}
                    className={errors.heureDebut ? invalidClass : undefined}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        heureDebut: updateTimePart(
                          form.heureDebut,
                          "minute",
                          e.target.value,
                        ),
                      })
                    }
                    aria-label="Minute début"
                  >
                    {minutes.map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </Select>
                </div>
                {errors.heureDebut && (
                  <p className="mt-1 text-sm text-red-400">{errors.heureDebut}</p>
                )}
              </section>
              <section>
                <Label>Heure fin</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={getTimePart(form.heureFin, "hour")}
                    className={errors.heureFin ? invalidClass : undefined}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        heureFin: updateTimePart(
                          form.heureFin,
                          "hour",
                          e.target.value,
                        ),
                      })
                    }
                    aria-label="Heure fin"
                  >
                    {heures24.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={getTimePart(form.heureFin, "minute")}
                    className={errors.heureFin ? invalidClass : undefined}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        heureFin: updateTimePart(
                          form.heureFin,
                          "minute",
                          e.target.value,
                        ),
                      })
                    }
                    aria-label="Minute fin"
                  >
                    {minutes.map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </Select>
                </div>
                {errors.heureFin && (
                  <p className="mt-1 text-sm text-red-400">{errors.heureFin}</p>
                )}
              </section>
            </section>
            <section>
              <Label>Chantier (optionnel)</Label>
              <Select
                value={form.chantierId ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    chantierId: e.target.value || undefined,
                  })
                }
              >
                <option value="">— Aucun —</option>
                {data.chantiers.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.nom}
                  </option>
                ))}
              </Select>
              {selectedChantier && (
                <div className="mt-2 space-y-1 rounded-xl border border-border/50 bg-card-elevated/30 px-3 py-2.5 text-xs text-muted-foreground">
                  {selectedClient && (
                    <p>
                      Client :{" "}
                      <span className="text-foreground/80">
                        {getClientDisplayName(selectedClient)}
                      </span>
                    </p>
                  )}
                  <p>
                    Chantier :{" "}
                    <span className="text-foreground/80">
                      {selectedChantier.nom}
                    </span>
                  </p>
                  {linkedDevis ? (
                    <p>
                      Devis :{" "}
                      <span className="text-foreground/80">
                        {linkedDevis.numero}
                        {linkedDevis.titre ? ` — ${linkedDevis.titre}` : ""}
                      </span>
                    </p>
                  ) : selectedChantier.devisNumber ? (
                    <p>
                      Devis :{" "}
                      <span className="text-foreground/80">
                        {selectedChantier.devisNumber}
                      </span>
                    </p>
                  ) : null}
                </div>
              )}
              {selectedChantier && !linkedDevis && !selectedChantier.devisNumber && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Aucun devis assigné à ce chantier.
                </p>
              )}
              {linkedDevis && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => setDevisModalOpen(true)}
                >
                  <FileText className="h-4 w-4" />
                  Voir devis assigné
                </Button>
              )}
            </section>
            <section>
              <Label>Employés assignés</Label>
              {data.employes.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Aucun employé. Ajoutez votre équipe via le bouton « Équipe ».
                </p>
              ) : (
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-card-elevated/40 p-2">
                  {data.employes.map((employe) => {
                    const checked = (form.employeIds ?? []).includes(employe.id);
                    const isDone = form.employeTermineIds?.includes(employe.id);
                    const isEnCours = form.employeEnCoursIds?.includes(employe.id);
                    return (
                      <li key={employe.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors",
                            checked
                              ? "bg-primary/15 ring-1 ring-primary/30"
                              : "hover:bg-card-hover/60",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border accent-primary"
                            checked={checked}
                            onChange={() =>
                              setForm({
                                ...form,
                                employeIds: toggleEmployeId(
                                  form.employeIds,
                                  employe.id,
                                ),
                              })
                            }
                          />
                          <EmployeAvatar employe={employe} size="sm" />
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="font-medium text-foreground">
                              {employeDisplayName(employe)}
                            </span>
                            {employe.poste && (
                              <span className="block text-xs text-muted-foreground">
                                {employe.poste}
                              </span>
                            )}
                          </span>
                          {checked && isDone && (
                            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                              Terminé
                            </span>
                          )}
                          {checked && !isDone && isEnCours && (
                            <span className="shrink-0 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-info-foreground">
                              En cours
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            {(form.employeProblemes?.length ?? 0) > 0 && (
              <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
                <p className="text-sm font-medium text-warning-foreground">
                  Signalements employés
                </p>
                <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                  {form.employeProblemes?.map((item) => {
                    const employe = data.employes.find(
                      (entry) => entry.id === item.employeId,
                    );
                    return (
                      <li key={item.id} className="rounded-lg bg-card/40 px-3 py-2">
                        <p className="font-medium text-foreground/90">
                          {employe ? employeDisplayName(employe) : "Employé"} —{" "}
                          {formatDateTimeFR(
                            item.dateCreation.slice(0, 10),
                            item.dateCreation.slice(11, 16),
                          )}
                        </p>
                        <p className="mt-1">{item.message}</p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            <section className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpenEvent(false)}
              >
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </section>
          </form>
        </Modal>
        );
      })()}

      <PlanningDevisSimplifieModal
        open={devisModalOpen}
        onClose={() => setDevisModalOpen(false)}
        devis={
          form?.chantierId
            ? (() => {
                const chantier = data.chantiers.find(
                  (ch) => ch.id === form.chantierId,
                );
                return chantier?.devisId
                  ? data.devis.find((d) => d.id === chantier.devisId) ?? null
                  : null;
              })()
            : null
        }
        chantier={
          form?.chantierId
            ? data.chantiers.find((ch) => ch.id === form.chantierId) ?? null
            : null
        }
        currentTask={form?.tache ?? ""}
        onAddToTask={(nextTask) => {
          if (!form) return;
          setForm({ ...form, tache: nextTask });
        }}
      />

      <PlanningEmployesModal
        open={openEmployes}
        onClose={() => setOpenEmployes(false)}
        employes={data.employes}
        onSave={saveEmployes}
      />

      <PlanningEquipeModal
        open={openEquipe}
        onClose={() => {
          setOpenEquipe(false);
          setEditingAffectation(null);
        }}
        chantiers={data.chantiers}
        employes={data.employes}
        data={data}
        editingAffectation={editingAffectation}
        onApply={(next) => {
          setData(next);
          setOpenEquipe(false);
          const affectation =
            editingAffectation ??
            next.affectations[next.affectations.length - 1] ??
            null;
          setEditingAffectation(null);
          setOpenEvent(false);
          if (affectation) {
            setWeekStart(startOfWeekIso(affectation.dateDebut));
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(affectationToDelete)}
        title="Supprimer l'affectation"
        message="Supprimer toute la période d'affectation et tous les événements liés dans le planning ?"
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setAffectationToDelete(null)}
        onConfirm={() => {
          if (affectationToDelete) {
            setData((prev) => applyAffectationDelete(prev, affectationToDelete));
            setOpenEvent(false);
          }
          setAffectationToDelete(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(eventToDelete)}
        title="Confirmer la suppression"
        message="Cette action est définitive. Voulez-vous continuer ?"
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setEventToDelete(null)}
        onConfirm={() => {
          if (eventToDelete) remove(eventToDelete);
          setEventToDelete(null);
        }}
      />
    </>
  );
}
