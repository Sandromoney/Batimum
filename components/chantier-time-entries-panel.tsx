"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateInput, Input, Label, Select, Textarea } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import {
  computeChantierTempsReelHeures,
  computeEntryCoutMainOeuvre,
  computeTimeEntryHeures,
  resolveChantierTauxHoraireInterne,
  resolveEmployeCoutHoraire,
} from "@/lib/pilotage";
import { useIsAdminView } from "@/lib/use-admin-view";
import type {
  Chantier,
  ChantierTimeEntry,
  ChantierTimeEntryTypeTache,
} from "@/lib/types";
import { formatDate, formatCurrency, generateId } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

const TYPE_TACHE_LABELS: Record<ChantierTimeEntryTypeTache, string> = {
  preparation: "Préparation",
  pose: "Pose",
  finition: "Finition",
  deplacement: "Déplacement",
  autre: "Autre",
};

const TYPE_TACHES = Object.keys(TYPE_TACHE_LABELS) as ChantierTimeEntryTypeTache[];

export function ChantierTimeEntriesPanel({
  chantier,
  heuresPrevues,
}: {
  chantier: Chantier;
  heuresPrevues: number;
}) {
  const { data, setData } = useStore();
  const isAdminView = useIsAdminView();
  const [error, setError] = useState("");

  const entries = (data.chantierTimeEntries ?? [])
    .filter((entry) => entry.chantierId === chantier.id)
    .sort((a, b) => `${b.date}${b.heureDebut}`.localeCompare(`${a.date}${a.heureDebut}`));

  const heuresRealisees = computeChantierTempsReelHeures(
    data.chantierTimeEntries ?? [],
    chantier.id,
  );
  const ecart = Math.round((heuresRealisees - heuresPrevues) * 100) / 100;

  const devisLie = chantier.devisId
    ? data.devis.find((item) => item.id === chantier.devisId)
    : undefined;
  const coutOptions = {
    chantierTauxHoraire: resolveChantierTauxHoraireInterne(
      chantier,
      devisLie,
      data.parametres.tauxHoraireInterneDefaut,
    ),
    entrepriseTauxDefaut: data.parametres.tauxHoraireInterneDefaut,
  };
  const coutMainOeuvreReel = entries.reduce((sum, entry) => {
    const employe = data.employes.find((item) => item.id === entry.employeId);
    return (
      sum +
      computeEntryCoutMainOeuvre(
        computeTimeEntryHeures(entry),
        employe,
        coutOptions,
      )
    );
  }, 0);

  const [form, setForm] = useState({
    employeId: data.employes[0]?.id ?? "",
    date: new Date().toISOString().slice(0, 10),
    heureDebut: "08:00",
    heureFin: "12:00",
    pauseMinutes: "0",
    typeTache: "pose" as ChantierTimeEntryTypeTache,
    commentaire: "",
  });

  function addEntry() {
    setError("");
    if (!form.employeId) {
      setError("Sélectionnez un employé.");
      return;
    }
    if (form.heureFin <= form.heureDebut) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }

    const entry: ChantierTimeEntry = {
      id: generateId(),
      chantierId: chantier.id,
      employeId: form.employeId,
      date: form.date,
      heureDebut: form.heureDebut,
      heureFin: form.heureFin,
      pauseMinutes: Math.max(0, Number(form.pauseMinutes) || 0),
      typeTache: form.typeTache,
      commentaire: form.commentaire.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (computeTimeEntryHeures(entry) <= 0) {
      setError("Durée invalide après déduction de la pause.");
      return;
    }

    setData((prev) => ({
      ...prev,
      chantierTimeEntries: [...(prev.chantierTimeEntries ?? []), entry],
    }));
    setForm((current) => ({ ...current, commentaire: "" }));
  }

  function removeEntry(entryId: string) {
    setData((prev) => ({
      ...prev,
      chantierTimeEntries: (prev.chantierTimeEntries ?? []).filter(
        (entry) => entry.id !== entryId,
      ),
    }));
  }

  function getEmployeName(employeId: string) {
    const employe = data.employes.find((item) => item.id === employeId);
    return employe ? `${employe.prenom} ${employe.nom}` : "Employé";
  }

  return (
    <Card>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Heures passées
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pointage simple par employé — met à jour la rentabilité automatiquement.
          </p>
        </div>
        <dl className="flex gap-4 text-xs">
          <div>
            <dt className="text-muted-foreground">Prévu</dt>
            <dd className="font-semibold tabular-nums">{heuresPrevues.toFixed(1)} h</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Réalisé</dt>
            <dd className="font-semibold tabular-nums">{heuresRealisees.toFixed(1)} h</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Écart</dt>
            <dd
              className={`font-semibold tabular-nums ${
                ecart > 0 ? "text-amber-400" : "text-primary"
              }`}
            >
              {ecart >= 0 ? "+" : ""}
              {ecart.toFixed(1)} h
            </dd>
          </div>
          {isAdminView ? (
            <div>
              <dt className="text-muted-foreground">Coût MO réel</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {formatCurrency(coutMainOeuvreReel)}
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      {entries.length > 0 ? (
        <ul className="mb-4 divide-y divide-border/50 rounded-xl border border-border/50">
          {entries.map((entry) => {
            const employe = data.employes.find((item) => item.id === entry.employeId);
            const heures = computeTimeEntryHeures(entry);
            const taux = isAdminView
              ? resolveEmployeCoutHoraire(employe, coutOptions)
              : 0;
            const coutLigne = isAdminView
              ? computeEntryCoutMainOeuvre(heures, employe, coutOptions)
              : 0;

            return (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {getEmployeName(entry.employeId)} ·{" "}
                  {TYPE_TACHE_LABELS[entry.typeTache]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(entry.date)} · {entry.heureDebut} → {entry.heureFin}
                  {entry.pauseMinutes > 0 ? ` · pause ${entry.pauseMinutes} min` : ""}
                  {" · "}
                  {heures.toFixed(2)} h
                  {isAdminView && taux > 0 ? (
                    <>
                      {" · "}
                      {formatCurrency(coutLigne)} ({taux} €/h)
                    </>
                  ) : null}
                </p>
                {entry.commentaire ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.commentaire}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0 text-muted-foreground hover:text-red-400"
                onClick={() => removeEntry(entry.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
            );
          })}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          Aucune heure pointée pour ce chantier.
        </p>
      )}

      <form
        className="grid gap-3 rounded-xl border border-border/60 bg-card-elevated/40 p-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          addEntry();
        }}
      >
        <section>
          <Label>Employé</Label>
          <Select
            value={form.employeId}
            onChange={(event) =>
              setForm((current) => ({ ...current, employeId: event.target.value }))
            }
          >
            {data.employes
              .filter((employe) => employe.statut !== "desactive")
              .map((employe) => (
                <option key={employe.id} value={employe.id}>
                  {employe.prenom} {employe.nom}
                </option>
              ))}
          </Select>
        </section>
        <section>
          <Label>Date</Label>
          <DateInput
            value={form.date}
            onChangeValue={(value) => setForm((current) => ({ ...current, date: value }))}
          />
        </section>
        <section>
          <Label>Heure début</Label>
          <Input
            type="time"
            value={form.heureDebut}
            onChange={(event) =>
              setForm((current) => ({ ...current, heureDebut: event.target.value }))
            }
          />
        </section>
        <section>
          <Label>Heure fin</Label>
          <Input
            type="time"
            value={form.heureFin}
            onChange={(event) =>
              setForm((current) => ({ ...current, heureFin: event.target.value }))
            }
          />
        </section>
        <section>
          <Label>Pause (min)</Label>
          <Input
            type="number"
            min={0}
            value={form.pauseMinutes}
            onChange={(event) =>
              setForm((current) => ({ ...current, pauseMinutes: event.target.value }))
            }
          />
        </section>
        <section>
          <Label>Type de tâche</Label>
          <Select
            value={form.typeTache}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                typeTache: event.target.value as ChantierTimeEntryTypeTache,
              }))
            }
          >
            {TYPE_TACHES.map((type) => (
              <option key={type} value={type}>
                {TYPE_TACHE_LABELS[type]}
              </option>
            ))}
          </Select>
        </section>
        <section className="sm:col-span-2">
          <Label>Commentaire (optionnel)</Label>
          <Textarea
            rows={2}
            value={form.commentaire}
            onChange={(event) =>
              setForm((current) => ({ ...current, commentaire: event.target.value }))
            }
            placeholder="Ex : pose faïence murale"
          />
        </section>
        {error ? <p className="sm:col-span-2 text-xs text-red-400">{error}</p> : null}
        <section className="sm:col-span-2">
          <Button type="submit" className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Pointer les heures
          </Button>
        </section>
      </form>
    </Card>
  );
}
