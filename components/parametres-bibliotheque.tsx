"use client";

import { PageHeader } from "@/components/page-header";
import { ParametresSection } from "@/components/parametres-section";
import { ParametresToggle } from "@/components/parametres-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  disableBibliothequeEntry,
  getActiveBibliothequeEntries,
  normalizeBibliothequeEntreprise,
  resetBibliothequeEntry,
  toggleBibliothequeEntryLock,
  upsertManualBibliothequeEntry,
} from "@/lib/bibliotheque-entreprise";
import { getFiabiliteEntrepriseEntry } from "@/lib/prix-fiabilite";
import { useStore } from "@/lib/store";
import type { BibliothequeEntrepriseEntry } from "@/lib/types";
import { formatCurrency, formatDateFR } from "@/lib/utils";
import { ArrowLeft, Lock, Pencil, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const EMPTY_FORM = {
  categorie: "",
  designation: "",
  unite: "u",
  prixMoyenHT: "",
  tauxTVA: "",
  verrouille: true,
};

export function ParametresBibliothequePage() {
  const { data, setData } = useStore();
  const bibliotheque = useMemo(
    () => normalizeBibliothequeEntreprise(data.bibliothequeEntreprise),
    [data.bibliothequeEntreprise],
  );

  const entries = useMemo(
    () => getActiveBibliothequeEntries(bibliotheque),
    [bibliotheque],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

  function patchBibliotheque(
    updater: (current: typeof bibliotheque) => typeof bibliotheque,
  ) {
    setData((prev) => ({
      ...prev,
      bibliothequeEntreprise: updater(
        normalizeBibliothequeEntreprise(prev.bibliothequeEntreprise),
      ),
    }));
  }

  function startEdit(entry: BibliothequeEntrepriseEntry) {
    setEditingId(entry.id);
    setForm({
      categorie: entry.categorie,
      designation: entry.designation,
      unite: entry.unite,
      prixMoyenHT: String(entry.prixMoyenHT),
      tauxTVA: entry.tauxTVA != null ? String(entry.tauxTVA) : "",
      verrouille: entry.verrouille ?? entry.source === "manuel",
    });
  }

  function saveEntry() {
    const prix = Number(form.prixMoyenHT);
    if (!form.designation.trim() || Number.isNaN(prix) || prix < 0) {
      setFormError("Renseignez une désignation et un prix HT valide (≥ 0).");
      return;
    }
    setFormError("");

    patchBibliotheque((current) =>
      upsertManualBibliothequeEntry(current, {
        id: editingId ?? undefined,
        categorie: form.categorie.trim() || "Autre",
        designation: form.designation.trim(),
        unite: form.unite.trim() || "u",
        prixMoyenHT: prix,
        prixMinHT: prix,
        prixMaxHT: prix,
        tauxTVA: form.tauxTVA ? Number(form.tauxTVA) : undefined,
        verrouille: form.verrouille,
        nombreUtilisations: editingId
          ? current.entries.find((entry) => entry.id === editingId)
              ?.nombreUtilisations ?? 0
          : 0,
        derniereUtilisation: new Date().toISOString().slice(0, 10),
      }),
    );

    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  return (
    <div className="btp-app-page mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Bibliothèque entreprise"
        description="Prix de référence de votre entreprise — utilisés en priorité par MUM IA."
        action={
          <Link
            href="/parametres"
            className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Paramètres
          </Link>
        }
      />

      <ParametresSection
        title="À propos"
        description="Cette bibliothèque est alimentée automatiquement et consultable ici. Les réglages d'apprentissage sont dans Paramètres > MUM IA."
      >
        <Link
          href="/parametres/mum-ia"
          className="text-sm text-primary hover:underline"
        >
          Ouvrir les paramètres MUM IA →
        </Link>
      </ParametresSection>

      <Card className="p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">
          {editingId ? "Modifier une ligne" : "Ajouter un prix manuel"}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section>
            <Label>Catégorie</Label>
            <Input
              value={form.categorie}
              onChange={(event) => setForm((prev) => ({ ...prev, categorie: event.target.value }))}
              placeholder="Ex. : Plomberie"
            />
          </section>
          <section>
            <Label>Unité</Label>
            <Input
              value={form.unite}
              onChange={(event) => setForm((prev) => ({ ...prev, unite: event.target.value }))}
              placeholder="m², u, forfait…"
            />
          </section>
          <section className="sm:col-span-2">
            <Label>Désignation</Label>
            <Input
              value={form.designation}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, designation: event.target.value }))
              }
              placeholder="Ex. : Pose carrelage sol"
            />
          </section>
          <section>
            <Label>Prix moyen HT</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.prixMoyenHT}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, prixMoyenHT: event.target.value }))
              }
            />
          </section>
          <section>
            <Label>TVA (%)</Label>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.tauxTVA}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tauxTVA: event.target.value }))
              }
              placeholder="10"
            />
          </section>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ParametresToggle
            label="Verrouiller ce prix"
            description="L'apprentissage automatique ne l'écrasera pas"
            checked={form.verrouille}
            onChange={(verrouille) => setForm((prev) => ({ ...prev, verrouille }))}
          />
          {formError ? (
            <p className="text-xs text-red-400 sm:col-span-2">{formError}</p>
          ) : null}
          <Button type="button" onClick={saveEntry} className="ml-auto">
            {editingId ? "Enregistrer" : "Ajouter"}
          </Button>
          {editingId ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              Annuler
            </Button>
          ) : null}
        </div>
      </Card>

      <ParametresSection
        title="Votre bibliothèque"
        description={`${entries.length} ligne${entries.length > 1 ? "s" : ""} active${entries.length > 1 ? "s" : ""}`}
      >
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun prix enregistré. Envoyez ou signez des devis pour alimenter la
            bibliothèque, ou ajoutez des prix manuels.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/80 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-2 py-3">Catégorie</th>
                  <th className="px-2 py-3">Désignation</th>
                  <th className="px-2 py-3">Unité</th>
                  <th className="px-2 py-3">Moyen HT</th>
                  <th className="px-2 py-3">Min / Max</th>
                  <th className="px-2 py-3">Util.</th>
                  <th className="px-2 py-3">Fiab.</th>
                  <th className="px-2 py-3">Source</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/50">
                    <td className="px-2 py-3 text-muted-foreground">{entry.categorie}</td>
                    <td className="px-2 py-3 font-medium text-foreground">
                      {entry.designation}
                      {entry.verrouille ? (
                        <Lock className="ml-1 inline h-3.5 w-3.5 text-primary" />
                      ) : null}
                    </td>
                    <td className="px-2 py-3">{entry.unite}</td>
                    <td className="px-2 py-3">{formatCurrency(entry.prixMoyenHT)}</td>
                    <td className="px-2 py-3 text-xs text-muted-foreground">
                      {formatCurrency(entry.prixMinHT)} — {formatCurrency(entry.prixMaxHT)}
                    </td>
                    <td className="px-2 py-3">{entry.nombreUtilisations}</td>
                    <td className="px-2 py-3 text-xs text-muted-foreground">
                      {getFiabiliteEntrepriseEntry({
                        source: entry.source,
                        verrouille: entry.verrouille,
                        nombreUtilisations: entry.nombreUtilisations,
                        fiabilite: entry.fiabilite,
                      })}
                      %
                    </td>
                    <td className="px-2 py-3">
                      <span className="rounded-full bg-card px-2 py-0.5 text-xs capitalize">
                        {entry.source}
                      </span>
                      {entry.derniereUtilisation ? (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatDateFR(entry.derniereUtilisation)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(entry)}
                          aria-label="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            patchBibliotheque((current) =>
                              toggleBibliothequeEntryLock(current, entry.id),
                            )
                          }
                          aria-label={entry.verrouille ? "Déverrouiller" : "Verrouiller"}
                        >
                          <Lock
                            className={`h-4 w-4 ${entry.verrouille ? "text-primary" : "text-muted-foreground"}`}
                          />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetId(entry.id)}
                          aria-label="Réinitialiser"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(entry.id)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ParametresSection>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Supprimer cette ligne ?"
        message="La ligne sera masquée de la bibliothèque et de MUM IA."
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          patchBibliotheque((current) => disableBibliothequeEntry(current, deleteId));
          setDeleteId(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(resetId)}
        title="Réinitialiser cette ligne ?"
        message="Supprime définitivement cette entrée. L'apprentissage pourra la recréer plus tard."
        confirmLabel="Réinitialiser"
        variant="danger"
        onCancel={() => setResetId(null)}
        onConfirm={() => {
          if (!resetId) return;
          patchBibliotheque((current) => resetBibliothequeEntry(current, resetId));
          setResetId(null);
        }}
      />
    </div>
  );
}
