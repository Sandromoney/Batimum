"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, RowActions, Td, Tr } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input, Label, PhoneInput, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EntityHistoriqueSection } from "@/components/entity-historique-section";
import { markClientCreated, markClientModified } from "@/lib/client-historique";
import { useStore } from "@/lib/store";
import type { Client, TypeClient } from "@/lib/types";
import { getClientAddress, getClientDisplayName, findDuplicateClient } from "@/lib/clients";
import { ClientNameDisplay } from "@/components/client-name";
import { RequiredMark } from "@/components/required-mark";
import {
  hasValidationErrors,
  validateClient,
  CLIENT_ADDRESS_REQUIRED_MSG,
  type ValidationErrors,
} from "@/lib/validations";
import { generateId, formatDate } from "@/lib/utils";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";

const empty: Omit<Client, "id" | "createdAt"> = {
  typeClient: "particulier",
  nom: "",
  prenom: "",
  societe: "",
  email: "",
  indicatifTelephone: "+33",
  telephone: "",
  adresse: "",
  codePostal: "",
  ville: "",
};

const indicatifs = [
  { value: "+33", label: "FRA +33" },
  { value: "+32", label: "BEL +32" },
  { value: "+41", label: "CHE +41" },
  { value: "+352", label: "LUX +352" },
  { value: "+34", label: "ESP +34" },
  { value: "+39", label: "ITA +39" },
  { value: "+49", label: "DEU +49" },
  { value: "+351", label: "PRT +351" },
  { value: "+44", label: "GBR +44" },
  { value: "+212", label: "MAR +212" },
  { value: "+213", label: "DZA +213" },
  { value: "+216", label: "TUN +216" },
];

type AddressSuggestion = {
  id: string;
  label: string;
  adresse: string;
  codePostal: string;
  ville: string;
};

export default function ClientsPage() {
  const { data, setData } = useStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showValidationToast, setShowValidationToast] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressFocused, setAddressFocused] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [duplicateMessage, setDuplicateMessage] = useState("");

  const invalidClass = "border-red-500 focus:border-red-500 focus:ring-red-500/20";

  const filtered = data.clients.filter(
    (c) =>
      getClientDisplayName(c).toLowerCase().includes(search.toLowerCase()) ||
      (c.societe ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  useEffect(() => {
    if (!open || !addressFocused) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      return;
    }

    const query = form.adresse.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAddressLoading(true);
      setAddressSuggestions([]);

      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
            query,
          )}&limit=5`,
          { signal: controller.signal },
        );
        if (!response.ok) return;

        const result = (await response.json()) as {
          features?: Array<{
            properties?: {
              id?: string;
              label?: string;
              name?: string;
              postcode?: string;
              city?: string;
            };
          }>;
        };

        setAddressSuggestions(
          (result.features ?? [])
            .map((feature, index) => {
              const properties = feature.properties;
              return {
                id: properties?.id ?? `${properties?.label ?? "adresse"}-${index}`,
                label: properties?.label ?? "",
                adresse: properties?.name ?? properties?.label ?? "",
                codePostal: properties?.postcode ?? "",
                ville: properties?.city ?? "",
              };
            })
            .filter((suggestion) => suggestion.label && suggestion.adresse),
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") setAddressSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setAddressLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [addressFocused, form.adresse, open]);

  function openCreate() {
    setEditId(null);
    setForm(empty);
    setErrors({});
    setShowValidationToast(false);
    setAddressSuggestions([]);
    setAddressFocused(false);
    setOpen(true);
  }

  function openEdit(c: Client) {
    setEditId(c.id);
    setForm({
      typeClient: c.typeClient ?? "particulier",
      nom: c.nom,
      prenom: c.prenom ?? "",
      societe: c.societe ?? "",
      email: c.email ?? "",
      indicatifTelephone: c.indicatifTelephone ?? "+33",
      telephone: c.telephone,
      adresse: c.adresse,
      codePostal: c.codePostal ?? "",
      ville: c.ville ?? "",
    });
    setErrors({});
    setShowValidationToast(false);
    setAddressSuggestions([]);
    setAddressFocused(false);
    setOpen(true);
  }

  function save() {
    const nextErrors = validateClient(form);
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) {
      setShowValidationToast(true);
      return;
    }

    const duplicate = findDuplicateClient(data.clients, form, editId ?? undefined);
    if (duplicate) {
      setDuplicateMessage(
        `Un client existe déjà avec le même email ou téléphone (${getClientDisplayName(duplicate)}).`,
      );
      return;
    }
    setDuplicateMessage("");

    if (editId) {
      setData((prev) => ({
        ...prev,
        clients: prev.clients.map((c) =>
          c.id === editId ? markClientModified({ ...c, ...form }) : c,
        ),
      }));
    } else {
      const client = markClientCreated({
        id: generateId(),
        ...form,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      setData((prev) => ({ ...prev, clients: [...prev.clients, client] }));
    }
    setOpen(false);
  }

  function remove(id: string) {
    setData((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c.id !== id),
      devis: prev.devis.filter((d) => d.clientId !== id),
      chantiers: prev.chantiers.filter((ch) => ch.clientId !== id),
      factures: prev.factures.filter((f) => f.clientId !== id),
    }));
  }

  return (
    <>
      <PageHeader
        title="Clients"
        description="Gérez votre carnet d'adresses professionnel"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau client
          </Button>
        }
      />

      <section className="mb-4 max-w-sm">
        <Input
          placeholder="Rechercher un client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <DataTable headers={["Client", "Contact", "Adresse", "Créé le", "Actions"]}>
        {filtered.map((c) => (
          <Tr
            key={c.id}
            onClick={() => openEdit(c)}
            ariaLabel={`Voir le client ${getClientDisplayName(c)}`}
          >
            <Td>
              <ClientNameDisplay client={c} className="font-medium" />
              {c.societe && (
                <p className="mt-1 text-xs text-muted-foreground">{c.societe}</p>
              )}
            </Td>
            <Td>
              <p>{c.email || "—"}</p>
              <p className="text-xs text-muted">
                {[c.indicatifTelephone, c.telephone].filter(Boolean).join(" ")}
              </p>
            </Td>
            <Td className="max-w-[200px] truncate">{getClientAddress(c)}</Td>
            <Td>{formatDate(c.createdAt)}</Td>
            <Td>
              <RowActions>
                <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setClientToDelete(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </RowActions>
            </Td>
          </Tr>
        ))}
      </DataTable>

      {filtered.length === 0 && (
        <p className="mt-4 text-center text-muted">Aucun client trouvé.</p>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Modifier le client" : "Nouveau client"}
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
              {errors.adresse || errors.codePostal || errors.ville
                ? CLIENT_ADDRESS_REQUIRED_MSG
                : "Veuillez corriger les champs en rouge."}
            </p>
          )}
          <section className="grid gap-4 sm:grid-cols-2">
            <section>
              <Label>
                Nom
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
                Prénom
                <RequiredMark />
              </Label>
              <Input
                value={form.prenom ?? ""}
                className={errors.prenom ? invalidClass : undefined}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
              />
              {errors.prenom && (
                <p className="mt-1 text-sm text-red-400">{errors.prenom}</p>
              )}
            </section>
          </section>
          <section>
            <Label>Type de client</Label>
            <Select
              value={form.typeClient ?? "particulier"}
              onChange={(e) =>
                setForm({
                  ...form,
                  typeClient: e.target.value as TypeClient,
                })
              }
            >
              <option value="particulier">Particulier</option>
              <option value="professionnel">Professionnel</option>
            </Select>
          </section>
          <section>
            <Label>Société / entreprise</Label>
            <Input
              value={form.societe ?? ""}
              onChange={(e) => setForm({ ...form, societe: e.target.value })}
              placeholder="Optionnel"
            />
          </section>
          <section>
            <Label>
              Email{" "}
              <span className="font-normal text-muted-foreground">Conseillé</span>
            </Label>
            <Input
              type="email"
              value={form.email ?? ""}
              className={errors.email ? invalidClass : undefined}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ex : contact@client.fr"
            />
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Conseillé pour envoyer les devis, signatures et relances en un clic.
            </p>
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email}</p>
            )}
          </section>
          <section>
            <Label>
              Téléphone
              <RequiredMark />
            </Label>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <Select
                value={form.indicatifTelephone ?? "+33"}
                onChange={(e) =>
                  setForm({ ...form, indicatifTelephone: e.target.value })
                }
              >
                {indicatifs.map((indicatif) => (
                  <option key={indicatif.value} value={indicatif.value}>
                    {indicatif.label}
                  </option>
                ))}
              </Select>
              <PhoneInput
                mode="local"
                value={form.telephone}
                className={errors.telephone ? invalidClass : undefined}
                onChangeValue={(telephone) => setForm({ ...form, telephone })}
                placeholder="ex : 06 49 23 18 00"
              />
            </div>
            {errors.telephone && (
              <p className="mt-1 text-sm text-red-400">{errors.telephone}</p>
            )}
          </section>
          <section>
            <Label>
              Adresse
              <RequiredMark />
            </Label>
            <div className="relative">
              <Input
                value={form.adresse}
                className={errors.adresse ? invalidClass : undefined}
                autoComplete="off"
                onFocus={() => setAddressFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => {
                    setAddressFocused(false);
                    setAddressSuggestions([]);
                  }, 120);
                }}
                onChange={(e) => {
                  setForm({ ...form, adresse: e.target.value });
                  setAddressSuggestions([]);
                  setAddressFocused(true);
                }}
                placeholder="Numéro et voie"
              />
              {addressFocused &&
                (addressSuggestions.length > 0 || addressLoading) &&
                form.adresse.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
                  <div className="flex items-center justify-between border-b border-border/70 px-4 py-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {addressLoading ? "Recherche d'adresses…" : "Suggestions"}
                    </span>
                    <button
                      type="button"
                      className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
                      aria-label="Fermer les suggestions"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setAddressSuggestions([]);
                        setAddressFocused(false);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {addressSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setForm({
                          ...form,
                          adresse: suggestion.adresse,
                          codePostal: suggestion.codePostal,
                          ville: suggestion.ville,
                        });
                        setAddressSuggestions([]);
                        setAddressFocused(false);
                      }}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.adresse && (
              <p className="mt-1 text-sm text-red-400">{errors.adresse}</p>
            )}
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <section>
              <Label>
                Code postal
                <RequiredMark />
              </Label>
              <Input
                value={form.codePostal ?? ""}
                className={errors.codePostal ? invalidClass : undefined}
                onChange={(e) => setForm({ ...form, codePostal: e.target.value })}
              />
              {errors.codePostal && (
                <p className="mt-1 text-sm text-red-400">{errors.codePostal}</p>
              )}
            </section>
            <section>
              <Label>
                Ville
                <RequiredMark />
              </Label>
              <Input
                value={form.ville ?? ""}
                className={errors.ville ? invalidClass : undefined}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
              />
              {errors.ville && (
                <p className="mt-1 text-sm text-red-400">{errors.ville}</p>
              )}
            </section>
          </section>
          {duplicateMessage && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-warning-foreground">
              {duplicateMessage}
            </p>
          )}
          {editId && (
            <section className="rounded-2xl border border-border bg-card-elevated/60 p-4 text-sm">
              <h3 className="mb-3 font-semibold tracking-tight">Documents liés</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Devis
                  </p>
                  <ul className="mt-2 space-y-1">
                    {data.devis
                      .filter((devis) => devis.clientId === editId)
                      .slice(0, 5)
                      .map((devis) => (
                        <li key={devis.id}>
                          <Link
                            href={`/devis/${devis.id}`}
                            className="text-primary hover:underline"
                          >
                            {devis.numero}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Factures
                  </p>
                  <ul className="mt-2 space-y-1">
                    {data.factures
                      .filter((facture) => facture.clientId === editId)
                      .slice(0, 5)
                      .map((facture) => (
                        <li key={facture.id}>{facture.numero}</li>
                      ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Chantiers
                  </p>
                  <ul className="mt-2 space-y-1">
                    {data.chantiers
                      .filter((chantier) => chantier.clientId === editId)
                      .slice(0, 5)
                      .map((chantier) => (
                        <li key={chantier.id}>
                          <Link
                            href={`/chantiers/${chantier.id}`}
                            className="text-primary hover:underline"
                          >
                            {chantier.nom}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
          {editId && (
            <EntityHistoriqueSection
              title="Historique du client"
              historique={
                data.clients.find((client) => client.id === editId)?.historique ?? []
              }
              emptyLabel="Aucun événement enregistré pour ce client."
            />
          )}
          <section className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </section>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(clientToDelete)}
        title="Confirmer la suppression"
        message="Cette action est définitive. Voulez-vous continuer ?"
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setClientToDelete(null)}
        onConfirm={() => {
          if (clientToDelete) remove(clientToDelete);
          setClientToDelete(null);
        }}
      />
    </>
  );
}
