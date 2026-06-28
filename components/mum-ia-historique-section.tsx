"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { TYPE_CHANTIER_LABELS } from "@/lib/chantiers";
import {
  filterMumIaHistorique,
  MUM_IA_HISTORIQUE_STATUT_LABELS,
  type MumIaHistoriqueFilters,
} from "@/lib/mum-ia-historique";
import type { MumIaHistoriqueEntry, MumIaHistoriqueStatut, TypeChantier } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown, Eye, FileText, History, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const TYPE_OPTIONS = (
  Object.entries(TYPE_CHANTIER_LABELS) as [TypeChantier, string][]
).map(([value, label]) => ({ value, label }));

function formatHistoriqueDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatHistoriqueHeure(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MumIaHistoriqueSection({
  entries,
  activeEntryId,
  transformingId,
  onVoir,
  onTransformer,
  onSupprimer,
}: {
  entries: MumIaHistoriqueEntry[];
  activeEntryId?: string | null;
  transformingId?: string | null;
  onVoir: (entry: MumIaHistoriqueEntry) => void;
  onTransformer: (entry: MumIaHistoriqueEntry) => void;
  onSupprimer: (entryId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [statut, setStatut] = useState<MumIaHistoriqueStatut | "tous">("tous");
  const [typeChantier, setTypeChantier] = useState<TypeChantier | "tous">("tous");
  const [derniersJours, setDerniersJours] = useState<string>("tous");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters: MumIaHistoriqueFilters = useMemo(
    () => ({
      query,
      statut,
      typeChantier,
      derniersJours:
        derniersJours === "7"
          ? 7
          : derniersJours === "30"
            ? 30
            : derniersJours === "90"
              ? 90
              : undefined,
    }),
    [query, statut, typeChantier, derniersJours],
  );

  const visible = useMemo(
    () => filterMumIaHistorique(entries, filters),
    [entries, filters],
  );

  const activeCount = entries.filter((e) => e.statut !== "supprime").length;

  return (
    <Card className="border-border/80 bg-card/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Historique</h2>
          <span className="text-[10px] text-muted-foreground">({activeCount})</span>
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          Filtrer
          <ChevronDown
            className={`h-3 w-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {filtersOpen ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher…"
            className="h-8 text-xs sm:col-span-2"
          />
          <Select
            value={statut}
            onChange={(event) =>
              setStatut(event.target.value as MumIaHistoriqueStatut | "tous")
            }
            className="h-8 text-xs"
          >
            <option value="tous">Tous statuts</option>
            <option value="genere">Généré</option>
            <option value="transforme">Transformé</option>
            <option value="supprime">Supprimé</option>
          </Select>
          <Select
            value={derniersJours}
            onChange={(event) => setDerniersJours(event.target.value)}
            className="h-8 text-xs"
          >
            <option value="tous">Toute période</option>
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
          </Select>
          <Select
            value={typeChantier}
            onChange={(event) =>
              setTypeChantier(event.target.value as TypeChantier | "tous")
            }
            className="h-8 text-xs sm:col-span-2 lg:col-span-4"
          >
            <option value="tous">Tous types de chantier</option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Aucune demande enregistrée.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {visible.map((entry) => {
            const isActive = entry.id === activeEntryId;
            const isTransforming = transformingId === entry.id;

            return (
              <li
                key={entry.id}
                className={`flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between ${
                  isActive ? "rounded-lg bg-primary/5 px-2 -mx-2" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.titre}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatHistoriqueDate(entry.createdAt)}
                    {formatHistoriqueHeure(entry.createdAt)
                      ? ` · ${formatHistoriqueHeure(entry.createdAt)}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(entry.totalHT)} HT
                  </p>
                  <p
                    className={`mt-0.5 text-[11px] ${
                      entry.statut === "transforme"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : entry.statut === "supprime"
                          ? "text-muted-foreground"
                          : "text-primary"
                    }`}
                  >
                    {MUM_IA_HISTORIQUE_STATUT_LABELS[entry.statut]}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onVoir(entry)}
                    className="h-7 px-2.5 text-xs"
                  >
                    <Eye className="h-3 w-3" />
                    Voir
                  </Button>
                  {entry.statut === "genere" ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onTransformer(entry)}
                      disabled={isTransforming}
                      className="h-7 px-2.5 text-xs"
                    >
                      {isTransforming ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      Transformer
                    </Button>
                  ) : null}
                  {entry.statut === "transforme" && entry.devisBrouillonId ? (
                    <Link
                      href={`/devis/${entry.devisBrouillonId}`}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground hover:bg-card-elevated"
                    >
                      Devis
                    </Link>
                  ) : null}
                  {entry.statut !== "supprime" ? (
                    <button
                      type="button"
                      onClick={() => onSupprimer(entry.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-card-elevated hover:text-foreground"
                      aria-label="Supprimer de l'historique"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
