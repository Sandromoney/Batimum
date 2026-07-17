"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ParametresSection } from "@/components/parametres-section";
import { ParametresToggle } from "@/components/parametres-toggle";
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
import { Lock, Pencil, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";

const EMPTY_FORM = {
  categorie: "",
  designation: "",
  unite: "u",
  prixMoyenHT: "",
  tauxTVA: "",
  verrouille: true,
};

export function BibliothequePrestationsView() {
  const { data, setData } = useStore();
  const bibliotheque = useMemo(
    () => normalizeBibliothequeEntreprise(data.bibliothequeEntreprise),
    [data.bibliothequeEntreprise],
  );
  const entries = useMemo(
    () => getActiveBibliothequeEntries(bibliotheque),
    [bibliotheque],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => {
      const haystack = [entry.designation, entry.categorie].join(" ").toLowerCase();
      return query.split(/\s+/).every((token) => haystack.includes(token));
    });
  }, [entries, searchQuery]);

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
    <div className="space-y-6">
      <ParametresSection
        title="Prestations MUM IA"
        description="Prix de vente appris et manuels utilisés par MUM IA pour générer vos devis."
      >
        <Link href="/parametres/mum-ia" className="text-sm text-primary hover:underline">
          Réglages d&apos;apprentissage MUM IA →
        </Link>
      </ParametresSection>

      <Card className="p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">
          {editingId ? "Modifier une prestation" : "Ajouter une prestation"}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section>
            <Label>Catégorie</Label>
            <Input
              value={form.categorie}
              onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value }))}
              placeholder="Ex. : Plomberie"
            />
          </section>
          <section>
            <Label>Unité</Label>
            <Input
              value={form.unite}
              onChange={(e) => setForm((p) => ({ ...p, unite: e.target.value }))}
            />
          </section>
          <section className="sm:col-span-2">
            <Label>Désignation</Label>
            <Input
              value={form.designation}
              onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
            />
          </section>
          <section>
            <Label>Prix moyen HT</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.prixMoyenHT}
              onChange={(e) => setForm((p) => ({ ...p, prixMoyenHT: e.target.value }))}
            />
          </section>
          <section>
            <Label>TVA (%)</Label>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.tauxTVA}
              onChange={(e) => setForm((p) => ({ ...p, tauxTVA: e.target.value }))}
            />
          </section>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ParametresToggle
            label="Verrouiller ce prix"
            description="L'apprentissage automatique ne l'écrasera pas"
            checked={form.verrouille}
            onChange={(verrouille) => setForm((p) => ({ ...p, verrouille }))}
          />
          {formError ? <p className="text-xs text-red-400">{formError}</p> : null}
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

      <Card className="p-5 sm:p-6">
        <div className="mb-4">
          <Label>Rechercher une prestation</Label>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nom, catégorie…"
            className="mt-1"
          />
        </div>
        {filteredEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune prestation enregistrée.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/80 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-3">Catégorie</th>
                  <th className="px-2 py-3">Désignation</th>
                  <th className="px-2 py-3">Unité</th>
                  <th className="px-2 py-3">Moyen HT</th>
                  <th className="px-2 py-3">Fiab.</th>
                  <th className="px-2 py-3">Source</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/50">
                    <td className="px-2 py-3 text-muted-foreground">{entry.categorie}</td>
                    <td className="px-2 py-3 font-medium">
                      {entry.designation}
                      {entry.verrouille ? (
                        <Lock className="ml-1 inline h-3.5 w-3.5 text-primary" />
                      ) : null}
                    </td>
                    <td className="px-2 py-3">{entry.unite}</td>
                    <td className="px-2 py-3">{formatCurrency(entry.prixMoyenHT)}</td>
                    <td className="px-2 py-3 text-xs">
                      {getFiabiliteEntrepriseEntry({
                        source: entry.source,
                        verrouille: entry.verrouille,
                        nombreUtilisations: entry.nombreUtilisations,
                        fiabilite: entry.fiabilite,
                      })}
                      %
                    </td>
                    <td className="px-2 py-3 text-xs capitalize">{entry.source}</td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(entry.id)}
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
      </Card>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Supprimer cette prestation ?"
        message="La ligne sera masquée de MUM IA."
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          patchBibliotheque((c) => disableBibliothequeEntry(c, deleteId));
          setDeleteId(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(resetId)}
        title="Réinitialiser cette prestation ?"
        message="Supprime définitivement cette entrée."
        confirmLabel="Réinitialiser"
        variant="danger"
        onCancel={() => setResetId(null)}
        onConfirm={() => {
          if (!resetId) return;
          patchBibliotheque((c) => resetBibliothequeEntry(c, resetId));
          setResetId(null);
        }}
      />
    </div>
  );
}
