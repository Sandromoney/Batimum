"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { DevisCounters } from "@/components/devis-counters";
import { DataTable, RowActions, Td, Tr } from "@/components/data-table";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateInput, Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ClientNameDisplay } from "@/components/client-name";
import { DevisQuickClientModal } from "@/components/devis-quick-client-modal";
import { RequiredMark } from "@/components/required-mark";
import { useDevisLocal } from "@/lib/hooks/use-devis-local";
import { devisTotal } from "@/lib/data";
import { computeDevisTvaRecap } from "@/lib/devis-tva";
import { isTvaClassique } from "@/lib/parametres";
import { DEVIS_STATUT_LABELS } from "@/lib/devis";
import { getDevisDisplayStatut } from "@/lib/devis-statut";
import { useStore } from "@/lib/store";
import { getClientAddress, getClientDisplayName, hasIncompleteProClientInfo, isClientAddressComplete } from "@/lib/clients";
import {
  hasValidationErrors,
  validateDevisCreation,
  DEVIS_CLIENT_ADDRESS_REQUIRED_MSG,
  type ValidationErrors,
} from "@/lib/validations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Eye, Plus, Trash2 } from "lucide-react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DevisPage() {
  const router = useRouter();
  const { data } = useStore();
  const { devis, clients, counters, addDevisBrouillon, removeDevis } =
    useDevisLocal();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [dateDevis, setDateDevis] = useState(todayISO());
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showValidationToast, setShowValidationToast] = useState(false);
  const [devisToDelete, setDevisToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quickClientOpen, setQuickClientOpen] = useState(false);

  const tauxTVA = data.parametres.tva ?? 0;
  const invalidClass = "border-red-500 focus:border-red-500 focus:ring-red-500/20";

  const devisTries = useMemo(
    () => [...devis].sort((a, b) => b.date.localeCompare(a.date)),
    [devis],
  );

  const filteredDevis = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return devisTries;

    return devisTries.filter((d) => {
      const client = clients.find((c) => c.id === d.clientId);
      const displayStatut = getDevisDisplayStatut(d);
      const haystack = [
        d.numero,
        d.titre,
        getClientDisplayName(client),
        DEVIS_STATUT_LABELS[displayStatut],
        formatDate(d.dateDevis ?? d.date),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [clients, devisTries, search]);

  const selectedClient = clients.find((client) => client.id === clientId);

  function openCreateModal() {
    setClientId(clients[0]?.id ?? "");
    setDateDevis(todayISO());
    setErrors({});
    setShowValidationToast(false);
    setIsCreateOpen(true);
  }

  function handleCreateDevis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = clients.find((item) => item.id === clientId);
    const nextErrors = validateDevisCreation({ clientId, dateDevis, client });

    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) {
      setShowValidationToast(true);
      return;
    }

    const created = addDevisBrouillon({
      clientId,
      dateDevis,
      tauxTVA,
    });

    if (!created) {
      setErrors({ clientAddress: DEVIS_CLIENT_ADDRESS_REQUIRED_MSG });
      setShowValidationToast(true);
      return;
    }

    if (created) {
      setIsCreateOpen(false);
      router.push(`/devis/${created.id}`);
    }
  }

  function handleDeleteDevis(id: string) {
    removeDevis(id);
  }

  return (
    <div className="btp-app-page">
      <PageHeader
        title="Devis"
        description="Créez et suivez vos propositions commerciales"
        action={
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Nouveau devis
          </Button>
        }
      />

      <DevisCounters counters={counters} />

      <section className="mb-4 max-w-sm">
        <Input
          placeholder="Rechercher un devis (n°, titre, client, statut, date)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <DataTable
        headers={["N°", "Titre", "Client", "Montant HT", "Statut", "Date", ""]}
      >
        {filteredDevis.map((d) => {
          const client = clients.find((c) => c.id === d.clientId);
          const displayStatut = getDevisDisplayStatut(d);
          return (
            <Tr
              key={d.id}
              onClick={() => router.push(`/devis/${d.id}`)}
              ariaLabel={`Voir le devis ${d.numero}`}
            >
              <Td className="font-mono text-xs">{d.numero}</Td>
              <Td className="font-medium">{d.titre}</Td>
              <Td>
                <ClientNameDisplay client={client} />
                {hasIncompleteProClientInfo(client) && (
                  <p className="mt-1">
                    <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-[rgb(var(--color-warning-text))] ring-1 ring-amber-500/25">
                      Infos PRO manquantes
                    </span>
                  </p>
                )}
              </Td>
              <Td className="font-semibold">
                {formatCurrency(
                  computeDevisTvaRecap(
                    d,
                    data.parametres.tva,
                    isTvaClassique(data.parametres),
                  ).totalHT,
                )}
              </Td>
              <Td>
                <Badge
                  label={DEVIS_STATUT_LABELS[displayStatut]}
                  status={displayStatut}
                />
              </Td>
              <Td>{formatDate(d.dateDevis ?? d.date)}</Td>
              <Td>
                <RowActions>
                  <ButtonLink
                    href={`/devis/${d.id}`}
                    variant="secondary"
                    size="sm"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Eye className="h-4 w-4" />
                    Voir
                  </ButtonLink>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDevisToDelete(d.id)}
                    aria-label="Supprimer le devis"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </RowActions>
              </Td>
            </Tr>
          );
        })}
      </DataTable>

      {filteredDevis.length === 0 && (
        <p className="mt-4 text-center text-muted-foreground">
          {devisTries.length === 0
            ? "Aucun devis. Cliquez sur « Nouveau devis » pour créer un brouillon."
            : "Aucun résultat trouvé."}
        </p>
      )}

      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Nouveau devis"
      >
        <form className="space-y-4" onSubmit={handleCreateDevis}>
          {showValidationToast && (
            <p className="rounded-xl border btp-alert-error px-4 py-3 text-sm">
              {errors.clientAddress
                ? errors.clientAddress
                : "Veuillez corriger les champs en rouge."}
            </p>
          )}
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label>
                Client
                <RequiredMark />
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuickClientOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau client
              </Button>
            </div>
            <Select
              value={clientId}
              className={
                errors.clientId || errors.clientAddress ? invalidClass : undefined
              }
              onChange={(event) => setClientId(event.target.value)}
            >
              {clients.length === 0 ? (
                <option value="">Aucun client — créez-en un</option>
              ) : null}
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {getClientDisplayName(client)}
                </option>
              ))}
            </Select>
            {errors.clientId && (
              <p className="mt-1 text-sm text-danger-foreground">
                {errors.clientId}
              </p>
            )}
            {errors.clientAddress && (
              <p className="mt-1 text-sm text-danger-foreground">
                {errors.clientAddress}
              </p>
            )}
          </section>

          {selectedClient ? (
            <section>
              <Label>Adresse client</Label>
              <p
                className={`rounded-xl border px-3 py-2 text-sm ${
                  isClientAddressComplete(selectedClient)
                    ? "border-border/70 bg-card-elevated/40 text-foreground"
                    : "border-red-500/40 bg-red-500/5 text-muted-foreground"
                }`}
              >
                {isClientAddressComplete(selectedClient)
                  ? getClientAddress(selectedClient)
                  : "Adresse incomplète — complétez la fiche client."}
              </p>
            </section>
          ) : null}

          <section>
            <Label>
              Date du devis
              <RequiredMark />
            </Label>
            <DateInput
              value={dateDevis}
              onChangeValue={setDateDevis}
              className={errors.dateDevis ? invalidClass : undefined}
            />
            {errors.dateDevis && (
              <p className="mt-1 text-sm text-danger-foreground">
                {errors.dateDevis}
              </p>
            )}
          </section>

          <p className="rounded-xl border border-border bg-card-elevated/60 px-4 py-3 text-sm text-muted-foreground">
            Le montant sera calculé automatiquement à partir des lignes du devis.
          </p>

          <footer className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit">Créer le devis</Button>
          </footer>
        </form>
      </Modal>

      <DevisQuickClientModal
        open={quickClientOpen}
        onClose={() => setQuickClientOpen(false)}
        onCreated={(newClientId) => setClientId(newClientId)}
      />

      <ConfirmDialog
        open={Boolean(devisToDelete)}
        title="Confirmer la suppression"
        message="Cette action est définitive. Voulez-vous continuer ?"
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setDevisToDelete(null)}
        onConfirm={() => {
          if (devisToDelete) handleDeleteDevis(devisToDelete);
          setDevisToDelete(null);
        }}
      />
    </div>
  );
}
