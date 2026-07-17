"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { MumIaContextButton } from "@/components/mum-ia-context-button";
import { DataTable, RowActions, Td, Tr } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { DateInput, Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useStore } from "@/lib/store";
import type { Chantier, StatutChantier, TypeChantier } from "@/lib/types";
import {
  calculateChantierAvancement,
  CHANTIER_STATUT_LABELS,
  createEtapesForType,
  getChantierEtapes,
  getChantierTypeLabel,
  TYPE_CHANTIER_LABELS,
  TYPES_CHANTIER,
} from "@/lib/chantiers";
import { applyDevisLinkOnChantierCreate, formatDevisSelectLabel } from "@/lib/chantier-devis-link";
import { markChantierCreated, syncChantierStatut } from "@/lib/chantier-statut";
import { appendChantierWithHistorique } from "@/lib/historique-store";
import { RequiredMark } from "@/components/required-mark";
import {
  hasValidationErrors,
  validateChantier,
  CHANTIER_ADDRESS_REQUIRED_MSG,
  type ValidationErrors,
} from "@/lib/validations";
import { getClientAddress, getClientDisplayName } from "@/lib/clients";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";

const statuts: StatutChantier[] = [
  "planifie",
  "en_cours",
  "retard_demarrage",
  "en_retard",
  "termine",
  "suspendu",
];

export default function ChantiersPage() {
  const router = useRouter();
  const { data, setData } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Chantier | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showValidationToast, setShowValidationToast] = useState(false);
  const [chantierToDelete, setChantierToDelete] = useState<string | null>(null);
  /** Devis choisi à la création uniquement — appliqué une fois dans save(). */
  const [createFromDevisId, setCreateFromDevisId] = useState("");
  const [search, setSearch] = useState("");
  const invalidClass = "border-red-500 focus:border-red-500 focus:ring-red-500/20";

  const isEditing =
    form !== null && data.chantiers.some((chantier) => chantier.id === form.id);

  function devisForClient(clientId: string) {
    return data.devis.filter((devis) => devis.clientId === clientId);
  }

  const filteredChantiers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.chantiers;

    return data.chantiers.filter((ch) => {
      const client = data.clients.find((c) => c.id === ch.clientId);
      const haystack = [
        ch.nom,
        getClientDisplayName(client),
        CHANTIER_STATUT_LABELS[ch.statut],
        getChantierTypeLabel(ch),
        formatCurrency(ch.budget),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data.chantiers, data.clients, search]);

  function openCreate() {
    const firstClient = data.clients[0];
    setCreateFromDevisId("");
    setForm({
      id: generateId(),
      nom: "",
      clientId: firstClient?.id ?? "",
      adresse: firstClient ? getClientAddress(firstClient) : "",
      statut: "planifie",
      type: "renovation",
      typePersonnalise: "",
      etapes: createEtapesForType("renovation"),
      dateDebut: new Date().toISOString().slice(0, 10),
      dateFin: "",
      budget: 0,
    });
    setErrors({});
    setShowValidationToast(false);
    setOpen(true);
  }

  function save() {
    if (!form) return;
    const nextErrors = validateChantier(form);
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) {
      setShowValidationToast(true);
      return;
    }

    const alreadyExists = data.chantiers.some((c) => c.id === form.id);
    let chantierToSave: Chantier = form;

    if (!alreadyExists && createFromDevisId) {
      const devis = data.devis.find(
        (item) =>
          item.id === createFromDevisId && item.clientId === form.clientId,
      );
      if (devis) {
        chantierToSave = applyDevisLinkOnChantierCreate(form, devis);
      }
    }

    chantierToSave = alreadyExists
      ? syncChantierStatut(chantierToSave)
      : markChantierCreated(chantierToSave);

    setData((prev) => {
      const exists = prev.chantiers.some((c) => c.id === chantierToSave.id);
      if (exists) {
        return {
          ...prev,
          chantiers: prev.chantiers.map((c) =>
            c.id === chantierToSave.id ? chantierToSave : c,
          ),
        };
      }

      const devis = createFromDevisId
        ? prev.devis.find(
            (item) =>
              item.id === createFromDevisId && item.clientId === form.clientId,
          )
        : undefined;
      const slice = appendChantierWithHistorique(prev, {
        chantier: chantierToSave,
        devis,
      });
      return { ...prev, ...slice };
    });
    setCreateFromDevisId("");
    setOpen(false);
  }

  function remove(id: string) {
    setData((prev) => ({
      ...prev,
      chantiers: prev.chantiers.filter((c) => c.id !== id),
    }));
  }

  return (
    <>
      <PageHeader
        title="Chantiers"
        description="Suivez l'avancement de vos travaux"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MumIaContextButton source="chantier" entityLabel="Liste des chantiers" />
            <Button onClick={openCreate} disabled={!data.clients.length}>
              <Plus className="h-4 w-4" />
              Nouveau chantier
            </Button>
          </div>
        }
      />

      <section className="mb-4 max-w-sm">
        <Input
          placeholder="Rechercher un chantier (nom, client, statut, type, budget)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <DataTable
        headers={[
          "Nom",
          "Client",
          "Type",
          "Statut",
          "Avancement",
          "Budget",
          "Début",
          "Fin",
          "",
        ]}
      >
        {filteredChantiers.map((ch) => {
          const client = data.clients.find((c) => c.id === ch.clientId);
          const avancement = calculateChantierAvancement(getChantierEtapes(ch));
          return (
            <Tr
              key={ch.id}
              onClick={() => router.push(`/chantiers/${ch.id}`)}
              ariaLabel={`Voir le chantier ${ch.nom}`}
            >
              <Td className="font-medium">{ch.nom}</Td>
              <Td>{getClientDisplayName(client)}</Td>
              <Td>{getChantierTypeLabel(ch)}</Td>
              <Td>
                <Badge label={CHANTIER_STATUT_LABELS[ch.statut]} status={ch.statut} />
              </Td>
              <Td>
                <ProgressBar value={avancement} size="sm" />
              </Td>
              <Td>{formatCurrency(ch.budget)}</Td>
              <Td>{formatDate(ch.dateDebut)}</Td>
              <Td>{ch.dateFin ? formatDate(ch.dateFin) : "—"}</Td>
              <Td>
                <RowActions>
                  <Link
                    href={`/chantiers/${ch.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-muted transition-all duration-200 hover:bg-card-hover hover:text-primary active:scale-[0.98]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Voir chantier
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCreateFromDevisId("");
                      setForm(ch);
                      setErrors({});
                      setShowValidationToast(false);
                      setOpen(true);
                    }}
                  >
                    Éditer
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setChantierToDelete(ch.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </RowActions>
              </Td>
            </Tr>
          );
        })}
      </DataTable>

      {filteredChantiers.length === 0 && (
        <p className="mt-4 text-center text-muted-foreground">
          {data.chantiers.length === 0
            ? "Aucun chantier."
            : "Aucun résultat trouvé."}
        </p>
      )}

      {form && (
        <Modal open={open} onClose={() => setOpen(false)} title="Chantier">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {showValidationToast && (
              <p className="rounded-xl border btp-alert-error px-4 py-3 text-sm">
                {errors.adresse
                  ? CHANTIER_ADDRESS_REQUIRED_MSG
                  : "Veuillez corriger les champs en rouge."}
              </p>
            )}
            <section>
              <Label>
                Nom du chantier
                <RequiredMark />
              </Label>
              <Input
                value={form.nom}
                className={errors.nom ? invalidClass : undefined}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
              />
              {errors.nom && (
                <p className="mt-1 text-sm text-red-400">{errors.nom}</p>
              )}
            </section>
            <section>
              <Label>
                Client
                <RequiredMark />
              </Label>
              <Select
                value={form.clientId}
                className={errors.clientId ? invalidClass : undefined}
                onChange={(e) => {
                  setCreateFromDevisId("");
                  const client = data.clients.find(
                    (item) => item.id === e.target.value,
                  );
                  setForm({
                    ...form,
                    clientId: e.target.value,
                    adresse: client ? getClientAddress(client) : form.adresse,
                  });
                }}
              >
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getClientDisplayName(c)}
                  </option>
                ))}
              </Select>
              {errors.clientId && (
                <p className="mt-1 text-sm text-red-400">{errors.clientId}</p>
              )}
            </section>
            {!isEditing && (
              <section>
                <Label>Créer depuis un devis</Label>
                <Select
                  value={createFromDevisId}
                  onChange={(e) => {
                    const devisId = e.target.value;
                    setCreateFromDevisId(devisId);
                    if (!devisId) return;
                    const devis = data.devis.find((item) => item.id === devisId);
                    if (devis) {
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              nom: devis.titre,
                              adresse:
                                devis.adresseChantier?.trim() ||
                                current.adresse,
                            }
                          : current,
                      );
                    }
                  }}
                >
                  <option value="">Aucun devis</option>
                  {devisForClient(form.clientId).map((devis) => (
                    <option key={devis.id} value={devis.id}>
                      {formatDevisSelectLabel(devis)}
                    </option>
                  ))}
                </Select>
                {devisForClient(form.clientId).length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aucun devis pour ce client.
                  </p>
                )}
              </section>
            )}
            <section>
              <Label>
                Adresse
                <RequiredMark />
              </Label>
              <Input
                value={form.adresse}
                className={errors.adresse ? invalidClass : undefined}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                placeholder="Adresse complète du chantier"
              />
              {errors.adresse && (
                <p className="mt-1 text-sm text-red-400">{errors.adresse}</p>
              )}
            </section>
            <section className="grid grid-cols-2 gap-4">
              <section>
                <Label>Statut</Label>
                <Select
                  value={form.statut}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      statut: e.target.value as StatutChantier,
                    })
                  }
                >
                  {statuts.map((s) => (
                    <option key={s} value={s}>
                      {CHANTIER_STATUT_LABELS[s]}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Calculé automatiquement selon les dates et l&apos;avancement.
                  Modifiable manuellement si besoin.
                </p>
              </section>
              <section>
                <Label>Budget (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.budget || ""}
                  className={errors.budget ? invalidClass : undefined}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      budget: e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                />
                {errors.budget && (
                  <p className="mt-1 text-sm text-red-400">{errors.budget}</p>
                )}
              </section>
              <section>
                <Label>Date début</Label>
                <DateInput
                  value={form.dateDebut}
                  className={errors.dateDebut ? invalidClass : undefined}
                  onChangeValue={(value) => setForm({ ...form, dateDebut: value })}
                />
                {errors.dateDebut && (
                  <p className="mt-1 text-sm text-red-400">{errors.dateDebut}</p>
                )}
              </section>
              <section>
                <Label>Date fin</Label>
                <DateInput
                  value={form.dateFin}
                  className={errors.dateFin ? invalidClass : undefined}
                  onChangeValue={(value) => setForm({ ...form, dateFin: value })}
                />
                {errors.dateFin && (
                  <p className="mt-1 text-sm text-red-400">{errors.dateFin}</p>
                )}
              </section>
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
              <section>
                <Label>Type de chantier</Label>
                <Select
                  value={form.type ?? "autre"}
                  className={errors.type ? invalidClass : undefined}
                  onChange={(e) => {
                    const type = e.target.value as TypeChantier;
                    setForm({
                      ...form,
                      type,
                      typePersonnalise:
                        type === "autre" ? form.typePersonnalise ?? "" : "",
                      etapes: createEtapesForType(type),
                    });
                  }}
                >
                  {TYPES_CHANTIER.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_CHANTIER_LABELS[type]}
                    </option>
                  ))}
                </Select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-400">{errors.type}</p>
                )}
              </section>
              {form.type === "autre" && (
                <section>
                  <Label>Type personnalisé</Label>
                  <Input
                    value={form.typePersonnalise ?? ""}
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
            </section>
            <section className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                {isEditing ? "Enregistrer" : "Créer"}
              </Button>
            </section>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(chantierToDelete)}
        title="Confirmer la suppression"
        message="Cette action est définitive. Voulez-vous continuer ?"
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setChantierToDelete(null)}
        onConfirm={() => {
          if (chantierToDelete) remove(chantierToDelete);
          setChantierToDelete(null);
        }}
      />
    </>
  );
}
