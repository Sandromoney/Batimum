"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, PhoneInput, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RequiredMark } from "@/components/required-mark";
import { findDuplicateClient } from "@/lib/clients";
import { useStore } from "@/lib/store";
import type { Client, TypeClient } from "@/lib/types";
import {
  hasValidationErrors,
  validateClient,
  CLIENT_ADDRESS_REQUIRED_MSG,
  type ValidationErrors,
} from "@/lib/validations";
import { generateId } from "@/lib/utils";

const emptyClient: Omit<Client, "id" | "createdAt"> = {
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
  siret: "",
  tvaIntracom: "",
  codeApe: "",
};

const INPUT_ERROR_CLASS =
  "border-red-500 focus:border-red-500 focus:ring-red-500/20";

export function DevisQuickClientModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (clientId: string) => void;
}) {
  const { data, setData } = useStore();
  const [form, setForm] = useState(emptyClient);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showValidationToast, setShowValidationToast] = useState(false);

  function resetForm() {
    setForm(emptyClient);
    setErrors({});
    setShowValidationToast(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function patch(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateClient(form);
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) {
      setShowValidationToast(true);
      return;
    }

    const duplicate = findDuplicateClient(data.clients, form);
    if (duplicate) {
      onCreated(duplicate.id);
      handleClose();
      return;
    }

    const client: Client = {
      id: generateId(),
      ...form,
      siret: form.siret?.trim() || undefined,
      tvaIntracom: form.tvaIntracom?.trim() || undefined,
      codeApe: form.codeApe?.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setData((previous) => ({
      ...previous,
      clients: [...previous.clients, client],
    }));

    onCreated(client.id);
    handleClose();
  }

  const isPro = form.typeClient === "professionnel";

  return (
    <Modal open={open} onClose={handleClose} title="Nouveau client">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {showValidationToast && (
          <p className="rounded-xl border btp-alert-error px-4 py-3 text-sm">
            {errors.adresse || errors.codePostal || errors.ville
              ? CLIENT_ADDRESS_REQUIRED_MSG
              : "Veuillez corriger les champs en rouge."}
          </p>
        )}

        <section>
          <Label>Type de client</Label>
          <Select
            value={form.typeClient ?? "particulier"}
            onChange={(event) =>
              patch({ typeClient: event.target.value as TypeClient })
            }
          >
            <option value="particulier">Particulier</option>
            <option value="professionnel">Professionnel</option>
          </Select>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <section>
            <Label>
              Nom
              <RequiredMark />
            </Label>
            <Input
              value={form.nom}
              className={errors.nom ? INPUT_ERROR_CLASS : undefined}
              onChange={(event) => patch({ nom: event.target.value })}
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
              className={errors.prenom ? INPUT_ERROR_CLASS : undefined}
              onChange={(event) => patch({ prenom: event.target.value })}
            />
            {errors.prenom && (
              <p className="mt-1 text-sm text-red-400">{errors.prenom}</p>
            )}
          </section>
        </section>

        {isPro && (
          <section>
            <Label>Société / entreprise</Label>
            <Input
              value={form.societe ?? ""}
              onChange={(event) => patch({ societe: event.target.value })}
              placeholder="Raison sociale"
            />
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <section>
            <Label>
              Email{" "}
              <span className="font-normal text-muted-foreground">Conseillé</span>
            </Label>
            <Input
              type="email"
              value={form.email ?? ""}
              className={errors.email ? INPUT_ERROR_CLASS : undefined}
              onChange={(event) => patch({ email: event.target.value })}
              placeholder="contact@client.fr"
            />
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Conseillé pour l&apos;envoi des devis et relances. Un devis peut être
              créé sans email.
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
            <PhoneInput
              mode="local"
              value={form.telephone}
              className={errors.telephone ? INPUT_ERROR_CLASS : undefined}
              onChangeValue={(telephone) => patch({ telephone })}
              placeholder="06 12 34 56 78"
            />
            {errors.telephone && (
              <p className="mt-1 text-sm text-red-400">{errors.telephone}</p>
            )}
          </section>
        </section>

        <section>
          <Label>
            Adresse
            <RequiredMark />
          </Label>
          <Input
            value={form.adresse}
            className={errors.adresse ? INPUT_ERROR_CLASS : undefined}
            onChange={(event) => patch({ adresse: event.target.value })}
          />
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
              className={errors.codePostal ? INPUT_ERROR_CLASS : undefined}
              onChange={(event) => patch({ codePostal: event.target.value })}
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
              className={errors.ville ? INPUT_ERROR_CLASS : undefined}
              onChange={(event) => patch({ ville: event.target.value })}
            />
            {errors.ville && (
              <p className="mt-1 text-sm text-red-400">{errors.ville}</p>
            )}
          </section>
        </section>

        {isPro && (
          <section className="space-y-4 rounded-xl border border-border/70 bg-card-elevated/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Informations professionnelles
            </p>
            <section>
              <Label>SIRET</Label>
              <Input
                value={form.siret ?? ""}
                onChange={(event) => patch({ siret: event.target.value })}
                placeholder="123 456 789 00012"
              />
            </section>
            <section className="grid gap-4 sm:grid-cols-2">
              <section>
                <Label>TVA intracommunautaire</Label>
                <Input
                  value={form.tvaIntracom ?? ""}
                  onChange={(event) =>
                    patch({ tvaIntracom: event.target.value })
                  }
                  placeholder="FR12345678901"
                />
              </section>
              <section>
                <Label>Code APE</Label>
                <Input
                  value={form.codeApe ?? ""}
                  onChange={(event) => patch({ codeApe: event.target.value })}
                  placeholder="Ex : 4399C"
                />
              </section>
            </section>
          </section>
        )}

        <footer className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit">Créer le client</Button>
        </footer>
      </form>
    </Modal>
  );
}
