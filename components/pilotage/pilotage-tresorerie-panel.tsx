"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getAccount } from "@/lib/account";
import { buildAuthenticatedFetchInit } from "@/lib/authenticated-api-fetch";
import { extractImportableText } from "@/lib/fournisseur-prix-utils";
import {
  computeDepenseAmounts,
  loadPilotageDepenses,
  removePilotageDepense,
  upsertPilotageDepense,
  type PilotageDepense,
} from "@/lib/pilotage/depenses";
import type { FactureFournisseurExtraction } from "@/lib/pilotage/facture-fournisseur-ia";
import { buildPilotageTresorerie } from "@/lib/pilotage/tresorerie";
import type { AppData } from "@/lib/types";
import { cn, formatCurrency, generateId } from "@/lib/utils";
import {
  ArrowDownRight,
  FileUp,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";

type DepenseForm = {
  fournisseur: string;
  libelle: string;
  date: string;
  montantHT: string;
  tauxTVA: string;
  montantTTC: string;
};

const EMPTY_FORM: DepenseForm = {
  fournisseur: "",
  libelle: "",
  date: new Date().toISOString().slice(0, 10),
  montantHT: "",
  tauxTVA: "20",
  montantTTC: "",
};

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        tone === "positive" && "border-emerald-200/80 bg-emerald-50/40",
        tone === "warning" && "border-amber-200/80 bg-amber-50/40",
        tone === "neutral" && "border-border/60 bg-white",
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PilotageTresoreriePanel({ data }: { data: AppData }) {
  const companyId = getAccount()?.companyId ?? null;
  const [depenses, setDepenses] = useState<PilotageDepense[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<DepenseForm>(EMPTY_FORM);
  const [notice, setNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDepenses(loadPilotageDepenses(companyId));
  }, [companyId]);

  const model = useMemo(
    () => buildPilotageTresorerie(data, depenses),
    [data, depenses],
  );

  function openNewDepense() {
    setForm({
      ...EMPTY_FORM,
      date: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  function applyExtraction(extraction: FactureFournisseurExtraction, fileName: string) {
    setForm({
      fournisseur: extraction.fournisseur ?? "",
      libelle: `Facture fournisseur${fileName ? ` — ${fileName}` : ""}`,
      date: extraction.date ?? new Date().toISOString().slice(0, 10),
      montantHT:
        extraction.montantHT != null ? String(extraction.montantHT) : "",
      tauxTVA:
        extraction.tauxTVA != null ? String(extraction.tauxTVA) : "20",
      montantTTC:
        extraction.montantTTC != null ? String(extraction.montantTTC) : "",
    });
    setModalOpen(true);
  }

  async function handlePdfImport(file: File) {
    setImporting(true);
    setNotice(null);
    try {
      const content = await extractImportableText(file);
      const response = await fetch(
        "/api/pilotage/extract-facture-fournisseur",
        await buildAuthenticatedFetchInit({
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            content,
          }),
        }),
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        extraction?: FactureFournisseurExtraction;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.extraction) {
        setNotice(payload.error ?? "Extraction IA impossible.");
        // Ouvre quand même le formulaire pour saisie manuelle
        setForm({
          ...EMPTY_FORM,
          libelle: `Facture fournisseur — ${file.name}`,
          date: new Date().toISOString().slice(0, 10),
        });
        setModalOpen(true);
        return;
      }
      applyExtraction(payload.extraction, file.name);
      setNotice("Champs extraits du PDF — vérifiez puis enregistrez.");
    } catch {
      setNotice("Import PDF impossible.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function saveDepense() {
    const ht = Number(form.montantHT.replace(",", "."));
    const tva = Number(form.tauxTVA.replace(",", "."));
    const ttc = Number(form.montantTTC.replace(",", "."));
    if (!Number.isFinite(ht) && !Number.isFinite(ttc)) {
      setNotice("Indiquez au moins un montant HT ou TTC.");
      return;
    }
    const amounts = computeDepenseAmounts({
      montantHT: Number.isFinite(ht) ? ht : 0,
      tauxTVA: Number.isFinite(tva) ? tva : 20,
      montantTTC: Number.isFinite(ttc) ? ttc : undefined,
    });
    const depense: PilotageDepense = {
      id: generateId(),
      fournisseur: form.fournisseur.trim() || "Fournisseur",
      libelle: form.libelle.trim() || "Dépense",
      date: form.date || new Date().toISOString().slice(0, 10),
      ...amounts,
      source: form.libelle.toLowerCase().includes("facture fournisseur")
        ? "pdf_fournisseur"
        : "manuel",
      createdAt: new Date().toISOString(),
    };
    setDepenses(upsertPilotageDepense(depense, companyId));
    setModalOpen(false);
    setNotice("Dépense enregistrée.");
  }

  function deleteDepense(id: string) {
    setDepenses(removePilotageDepense(id, companyId));
  }

  const maxAbs = Math.max(
    ...model.points.map((p) => Math.abs(p.solde)),
    1,
  );

  return (
    <Card className="pilotage-reveal border-border/60 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card-elevated text-accent-hover ring-1 ring-accent/70">
            <Wallet className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Trésorerie</h2>
            <p className="text-xs text-muted-foreground">
              Données réelles Batimum (factures, devis, achats) + dépenses Pilotage
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handlePdfImport(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="mr-1.5 h-3.5 w-3.5" />
            {importing ? "Analyse PDF…" : "Import PDF fournisseur"}
          </Button>
          <Button type="button" size="sm" onClick={openNewDepense}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nouvelle dépense
          </Button>
        </div>
      </div>

      {notice ? (
        <p className="mt-3 rounded-lg border border-border/60 bg-card-elevated/50 px-3 py-2 text-xs text-muted-foreground">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Trésorerie actuelle"
          value={formatCurrency(model.tresorerieActuelle)}
          hint="Encaissé − dépenses"
          tone={model.tresorerieActuelle >= 0 ? "positive" : "warning"}
        />
        <Metric
          label="Dépenses"
          value={formatCurrency(model.depensesTotalTTC)}
          hint={`${formatCurrency(model.depensesTotalHT)} HT`}
        />
        <Metric
          label="Recettes prévues"
          value={formatCurrency(model.recettesPrevuesTTC)}
          hint="Factures ouvertes + devis signés"
        />
        <Metric
          label="Marge prévisionnelle"
          value={formatCurrency(model.margePrevisionnelleHT)}
          hint="Recettes HT − dépenses HT"
          tone={model.margePrevisionnelleHT >= 0 ? "positive" : "warning"}
        />
        <Metric
          label="Prévision de trésorerie"
          value={formatCurrency(model.previsionFinHorizon)}
          hint="Horizon 8 semaines"
        />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Prévision hebdomadaire
        </p>
        <div className="flex h-28 items-end gap-1.5">
          {model.points.map((point) => {
            const height = Math.max(8, (Math.abs(point.solde) / maxAbs) * 100);
            const positive = point.solde >= 0;
            return (
              <div
                key={point.date}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
                title={`${point.label}: ${formatCurrency(point.solde)}`}
              >
                <div
                  className={cn(
                    "w-full rounded-t-md",
                    positive ? "bg-accent/80" : "bg-amber-400/80",
                  )}
                  style={{ height: `${height}%` }}
                />
                <span className="truncate text-[10px] text-muted-foreground">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Dépenses récentes
          </p>
          {model.depensesDetail.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune dépense enregistrée.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {model.depensesDetail.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.fournisseur} · {item.date}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums font-medium">
                      {formatCurrency(item.montantTTC)}
                    </span>
                    {item.source === "pilotage" ? (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-red-600"
                        onClick={() => deleteDepense(item.id)}
                      >
                        Suppr.
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <TrendingUp className="h-3.5 w-3.5" />
            Recettes prévues
          </p>
          {model.recettesDetail.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune recette prévue pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {model.recettesDetail.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.kind === "facture" ? "Facture" : "Devis signé"} ·{" "}
                      {item.date}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums font-medium">
                    {formatCurrency(item.montantTTC)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle dépense"
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveDepense();
          }}
        >
          <div>
            <Label htmlFor="dep-fournisseur">Fournisseur</Label>
            <Input
              id="dep-fournisseur"
              value={form.fournisseur}
              onChange={(event) =>
                setForm({ ...form, fournisseur: event.target.value })
              }
              placeholder="Ex. Point.P"
            />
          </div>
          <div>
            <Label htmlFor="dep-libelle">Libellé</Label>
            <Input
              id="dep-libelle"
              value={form.libelle}
              onChange={(event) =>
                setForm({ ...form, libelle: event.target.value })
              }
              placeholder="Matériaux, location…"
            />
          </div>
          <div>
            <Label htmlFor="dep-date">Date</Label>
            <Input
              id="dep-date"
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="dep-ht">Montant HT</Label>
              <Input
                id="dep-ht"
                inputMode="decimal"
                value={form.montantHT}
                onChange={(event) =>
                  setForm({ ...form, montantHT: event.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="dep-tva">TVA %</Label>
              <Input
                id="dep-tva"
                inputMode="decimal"
                value={form.tauxTVA}
                onChange={(event) =>
                  setForm({ ...form, tauxTVA: event.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="dep-ttc">Montant TTC</Label>
              <Input
                id="dep-ttc"
                inputMode="decimal"
                value={form.montantTTC}
                onChange={(event) =>
                  setForm({ ...form, montantTTC: event.target.value })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
