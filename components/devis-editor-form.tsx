"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DateInput, Input, Select, Textarea } from "@/components/ui/input";
import { DevisLignesEditor } from "@/components/devis-lignes-editor";
import { DevisRecapSidebar } from "@/components/devis-recap-sidebar";
import {
  TYPE_CHANTIER_LABELS,
  TYPES_CHANTIER,
} from "@/lib/chantiers";
import type { DevisTvaRecap } from "@/lib/devis-tva";
import { TAUX_TVA_LIGNE_OPTIONS } from "@/lib/devis-tva";
import { getClientAddress, getClientDisplayName, isClientAddressComplete, resolveDevisChantierAddress } from "@/lib/clients";
import type { Client, Devis, LigneDevis, StatutDevis, TypeChantier } from "@/lib/types";
import { DEVIS_STATUT_LABELS } from "@/lib/devis";
import { MANUAL_DEVIS_STATUT_OPTIONS } from "@/lib/devis-statut";
import type { ValidationErrors } from "@/lib/validations";
import { formatDate, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  Layers,
  PanelRight,
  Plus,
  Save,
  Send,
} from "lucide-react";

function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function CompactField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

const compactControlClass =
  "h-8 min-h-8 rounded-xl border border-border/70 bg-card-elevated/40 px-2.5 text-xs shadow-none transition-all duration-200 hover:border-border focus:border-primary/60 focus:ring-2 focus:ring-primary/15";

const actionBtnBase =
  "rounded-xl transition-all duration-200";

const actionBtnSecondary = cn(actionBtnBase, "hover:bg-card-hover/90");

const actionBtnGhost = cn(
  actionBtnBase,
  "text-muted-foreground hover:bg-card-elevated/60 hover:text-foreground",
);

const actionBtnSend = cn(
  actionBtnBase,
  "border border-primary/25 bg-primary/[0.06] text-foreground shadow-none hover:border-primary/40 hover:bg-primary/10",
);

const actionBtnValidate =
  "rounded-xl px-4 font-semibold shadow-md shadow-primary/25 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30";

const VALIDITE_PRESETS = [15, 30, 45, 60] as const;

export function DevisEditorForm({
  devis,
  client,
  clients,
  tvaRecap,
  defaultTva,
  errors,
  invalidClass,
  showValidationToast,
  onUpdateDevis,
  onQuickClientOpen,
  onAddLigne,
  onAddSection,
  onUpdateLigne,
  onRemoveLigne,
  onReorderLignes,
  onSaveDraft,
  onPreview,
  onSendToClient,
  onValidate,
  displayStatut,
  onRequestStatutChange,
  allowedManualStatuts,
  canSendToClient = true,
  sendToClientDisabledTitle,
}: {
  devis: Devis;
  client?: Client;
  clients: Client[];
  tvaRecap: DevisTvaRecap;
  defaultTva: number;
  errors: ValidationErrors;
  invalidClass: string;
  showValidationToast: boolean;
  onUpdateDevis: (patch: Partial<Devis>) => void;
  onQuickClientOpen: () => void;
  onAddLigne: () => void;
  onAddSection: () => void;
  onUpdateLigne: (id: string, patch: Partial<LigneDevis>) => void;
  onRemoveLigne: (id: string) => void;
  onReorderLignes: (from: number, to: number) => void;
  onSaveDraft: () => void;
  onPreview: () => void;
  onSendToClient: () => void;
  onValidate: () => void;
  displayStatut?: StatutDevis;
  onRequestStatutChange?: (statut: StatutDevis) => void;
  allowedManualStatuts?: StatutDevis[];
  canSendToClient?: boolean;
  sendToClientDisabledTitle?: string;
}) {
  const [draftSaved, setDraftSaved] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(
    Boolean(devis.descriptionChantier?.trim() || devis.titre?.trim()),
  );
  const dateDevis = devis.dateDevis ?? devis.date;
  const validiteJours = devis.validiteJours ?? 30;
  const validiteIsPreset = VALIDITE_PRESETS.includes(
    validiteJours as (typeof VALIDITE_PRESETS)[number],
  );
  const [validiteMode, setValiditeMode] = useState<"preset" | "custom">(
    validiteIsPreset ? "preset" : "custom",
  );
  const dateValidite = dateDevis
    ? addDaysIso(dateDevis, validiteJours)
    : "";
  const manualStatutOptions = allowedManualStatuts ?? MANUAL_DEVIS_STATUT_OPTIONS;

  function handleSaveDraft() {
    onSaveDraft();
    setDraftSaved(true);
    window.setTimeout(() => setDraftSaved(false), 2500);
  }

  useEffect(() => {
    if (!recapOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setRecapOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [recapOpen]);

  return (
    <div className="relative flex min-h-[calc(100vh-4.25rem)] w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/40 pb-3">
        <Link
          href="/devis"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Link>
        <span className="hidden h-4 w-px bg-border/80 sm:block" />
        <span className="shrink-0 font-mono text-xs font-semibold text-primary">
          {devis.numero}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Chiffrage
        </span>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 px-3 py-3 shadow-card sm:px-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <CompactField label="Client" className="col-span-2 md:col-span-1 xl:col-span-2">
            <div className="flex gap-1">
              <Select
                value={devis.clientId}
                className={cn(compactControlClass, "flex-1", errors.clientId && invalidClass)}
                onChange={(event) => {
                  const nextClient = clients.find(
                    (item) => item.id === event.target.value,
                  );
                  onUpdateDevis({
                    clientId: event.target.value,
                    adresseChantier:
                      nextClient && isClientAddressComplete(nextClient)
                        ? getClientAddress(nextClient)
                        : "",
                  });
                }}
              >
                {clients.map((clientOption) => (
                  <option key={clientOption.id} value={clientOption.id}>
                    {getClientDisplayName(clientOption)}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={cn("h-8 shrink-0 rounded-xl px-2", actionBtnSecondary)}
                onClick={onQuickClientOpen}
                aria-label="Ajouter un client"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CompactField>

          <CompactField label="Adresse chantier" className="col-span-2 md:col-span-2">
            <Input
              className={cn(
                compactControlClass,
                errors.adresseChantier && invalidClass,
              )}
              value={resolveDevisChantierAddress(devis, client)}
              onChange={(event) =>
                onUpdateDevis({ adresseChantier: event.target.value })
              }
              placeholder="Adresse des travaux"
            />
            {errors.adresseChantier ? (
              <span className="text-[10px] text-red-400">{errors.adresseChantier}</span>
            ) : client ? (
              <span className="text-[10px] text-muted-foreground">
                Client : {getClientAddress(client)}
              </span>
            ) : null}
          </CompactField>

          <CompactField label="Date devis">
            <DateInput
              className={cn(compactControlClass, errors.dateDevis && invalidClass)}
              value={dateDevis}
              onChangeValue={(value) =>
                onUpdateDevis({ date: value, dateDevis: value })
              }
            />
          </CompactField>

          <CompactField label="Validité du devis">
            <div className="space-y-1.5">
              <Select
                className={compactControlClass}
                value={
                  validiteMode === "custom"
                    ? "custom"
                    : String(validiteJours)
                }
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "custom") {
                    setValiditeMode("custom");
                    return;
                  }
                  setValiditeMode("preset");
                  onUpdateDevis({ validiteJours: Number(value) });
                }}
              >
                {VALIDITE_PRESETS.map((days) => (
                  <option key={days} value={days}>
                    {days} jours
                  </option>
                ))}
                <option value="custom">Personnalisée</option>
              </Select>
              {validiteMode === "custom" ? (
                <Input
                  type="number"
                  min={1}
                  className={compactControlClass}
                  value={validiteJours}
                  onChange={(event) =>
                    onUpdateDevis({
                      validiteJours: Math.max(1, Number(event.target.value) || 1),
                    })
                  }
                />
              ) : null}
              <p className="text-[10px] text-muted-foreground">
                Fin de validité : {dateValidite ? formatDate(dateValidite) : "—"}
              </p>
            </div>
          </CompactField>

          <CompactField label="TVA générale">
            <Select
              className={compactControlClass}
              value={String(devis.tauxTVA ?? defaultTva)}
              onChange={(event) =>
                onUpdateDevis({ tauxTVA: Number(event.target.value) })
              }
            >
              {TAUX_TVA_LIGNE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </CompactField>

          <CompactField label="Type chantier">
            <Select
              className={compactControlClass}
              value={devis.typeChantier ?? "renovation"}
              onChange={(event) =>
                onUpdateDevis({
                  typeChantier: event.target.value as TypeChantier,
                })
              }
            >
              {TYPES_CHANTIER.map((type) => (
                <option key={type} value={type}>
                  {TYPE_CHANTIER_LABELS[type]}
                </option>
              ))}
            </Select>
          </CompactField>

          {onRequestStatutChange && (
            <CompactField label="Statut" className="col-span-2 md:col-span-1">
              <Select
                className={compactControlClass}
                value={devis.statut}
                onChange={(event) =>
                  onRequestStatutChange(event.target.value as StatutDevis)
                }
              >
                {manualStatutOptions.map((statut) => (
                  <option key={statut} value={statut}>
                    {DEVIS_STATUT_LABELS[statut]}
                  </option>
                ))}
              </Select>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                Auto / manuel
              </span>
              {displayStatut && displayStatut !== devis.statut && (
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  Affiché : {DEVIS_STATUT_LABELS[displayStatut as StatutDevis]}
                </span>
              )}
            </CompactField>
          )}
        </div>
      </div>

      <button
        type="button"
        className="flex w-fit items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-card-elevated/40 hover:text-foreground"
        onClick={() => setDescriptionOpen((open) => !open)}
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            descriptionOpen && "rotate-180",
          )}
        />
        Description du chantier
        {(devis.descriptionChantier?.trim() || devis.titre?.trim()) && (
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
            Renseignée
          </span>
        )}
      </button>

      {descriptionOpen && (
        <div className="rounded-2xl border border-border/50 bg-card/40 p-3 sm:p-3.5">
          <Textarea
            rows={2}
            className="min-h-[3rem] rounded-xl border-border/70 text-xs focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
            value={devis.descriptionChantier ?? ""}
            onChange={(event) =>
              onUpdateDevis({ descriptionChantier: event.target.value })
            }
            placeholder="Périmètre des travaux…"
          />
          <Input
            className={cn("mt-2", compactControlClass)}
            value={devis.titre}
            onChange={(event) => onUpdateDevis({ titre: event.target.value })}
            placeholder="Intitulé du devis"
          />
        </div>
      )}

      {showValidationToast && (
        <p className="rounded-xl border btp-alert-error px-3.5 py-2.5 text-xs">
          Veuillez corriger les champs en rouge.
        </p>
      )}

      <section className="flex min-h-0 flex-1 w-full flex-col rounded-2xl border border-border/60 bg-card/50 shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2.5 sm:px-4">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={actionBtnSecondary}
              onClick={onAddLigne}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter ligne
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={actionBtnSecondary}
              onClick={onAddSection}
            >
              <Layers className="h-3.5 w-3.5" />
              Ajouter section
            </Button>
            <span className="mx-0.5 hidden h-5 w-px bg-border/60 sm:block" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={actionBtnGhost}
              onClick={onPreview}
            >
              <Eye className="h-3.5 w-3.5" />
              Prévisualiser
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={actionBtnGhost}
              onClick={handleSaveDraft}
            >
              {draftSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Enregistré
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Enregistrer
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={actionBtnSend}
              disabled={!canSendToClient}
              title={
                canSendToClient
                  ? undefined
                  : sendToClientDisabledTitle ??
                    "Ajoutez l'email du client pour envoyer le devis"
              }
              onClick={onSendToClient}
            >
              <Send className="h-3.5 w-3.5" />
              Envoyer au client
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRecapOpen(true)}
                className="hidden rounded-xl border border-border/60 bg-card-elevated/40 px-3 py-1.5 text-xs tabular-nums text-muted-foreground transition-all duration-200 hover:border-primary/35 hover:bg-card-elevated/60 hover:text-foreground sm:inline-flex"
              >
                TTC {formatCurrency(tvaRecap.totalTTC)}
              </button>
              <Button type="button" size="sm" className={actionBtnValidate} onClick={onValidate}>
                Valider
              </Button>
            </div>
          </div>

          {errors.lignes && (
            <p className="mx-3 mt-2.5 rounded-xl border btp-alert-error px-3.5 py-2.5 text-xs sm:mx-4">
              {errors.lignes}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-3">
            <DevisLignesEditor
              lignes={devis.lignes}
              defaultTva={defaultTva}
              errors={errors}
              invalidClass={invalidClass}
              onReorder={onReorderLignes}
              onUpdateLigne={onUpdateLigne}
              onRemoveLigne={onRemoveLigne}
            />
          </div>
        </section>

      <button
        type="button"
        onClick={() => setRecapOpen(true)}
        className="btp-shadow-sm fixed bottom-6 right-4 z-30 flex items-center gap-2 rounded-2xl border border-border/50 bg-card/85 px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur-md transition-all duration-200 hover:border-primary/30 hover:bg-card/95 hover:text-foreground sm:right-6"
        aria-label="Ouvrir le récapitulatif"
      >
        <PanelRight className="h-4 w-4 text-primary" />
        <span>Récapitulatif</span>
        <span className="tabular-nums text-foreground/90">
          {formatCurrency(tvaRecap.totalTTC)}
        </span>
      </button>

      {recapOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
          aria-label="Fermer le récapitulatif"
          onClick={() => setRecapOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-[min(100vw,300px)] border-l border-border/50 bg-card/98 shadow-card backdrop-blur-sm transition-transform duration-300 ease-out",
          recapOpen ? "translate-x-0" : "translate-x-full pointer-events-none",
        )}
        aria-hidden={!recapOpen}
      >
        <DevisRecapSidebar
          recap={tvaRecap}
          devis={devis}
          onUpdateAcompte={onUpdateDevis}
          onSave={handleSaveDraft}
          onValidate={onValidate}
          saved={draftSaved}
          onClose={() => setRecapOpen(false)}
          variant="panel"
        />
      </aside>
    </div>
  );
}
