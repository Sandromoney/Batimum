"use client";

import { useRef, useState } from "react";
import { EmployeAvatar } from "@/components/employe-avatar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Employe } from "@/lib/types";
import {
  hasValidationErrors,
  validateEmploye,
  type ValidationErrors,
} from "@/lib/validations";
import { employeDisplayName } from "@/lib/planning-utils";
import { generateId } from "@/lib/utils";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";

function emptyEmploye(): Employe {
  return { id: generateId(), prenom: "", nom: "", poste: "" };
}

export function PlanningEmployesModal({
  open,
  onClose,
  employes,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  employes: Employe[];
  onSave: (next: Employe[]) => void;
}) {
  const [form, setForm] = useState<Employe | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invalidClass = "border-red-500 focus:border-red-500 focus:ring-red-500/20";

  function openCreate() {
    setForm(emptyEmploye());
    setErrors({});
  }

  function openEdit(employe: Employe) {
    setForm({ ...employe });
    setErrors({});
  }

  function saveEmploye() {
    if (!form) return;
    const nextErrors = validateEmploye(form);
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) return;

    const exists = employes.some((e) => e.id === form.id);
    onSave(
      exists
        ? employes.map((e) => (e.id === form.id ? form : e))
        : [...employes, form],
    );
    setForm(null);
  }

  function removeEmploye(id: string) {
    onSave(employes.filter((e) => e.id !== id));
    setDeleteId(null);
    if (form?.id === id) setForm(null);
  }

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !form) return;

    const allowed = ["image/png", "image/jpeg"];
    if (!allowed.includes(file.type)) {
      alert("Format non supporté. Utilisez PNG ou JPEG.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => (prev ? { ...prev, photo: reader.result as string } : prev));
      }
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Équipe — employés">
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Gérez votre équipe et assignez-les aux événements du planning.
          </p>

          <ul className="space-y-2">
            {employes.map((employe) => (
              <li
                key={employe.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-card-elevated/50 px-3 py-2.5"
              >
                <EmployeAvatar employe={employe} size="md" />
                <section className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {employeDisplayName(employe)}
                  </p>
                  {employe.poste && (
                    <p className="truncate text-xs text-muted-foreground">
                      {employe.poste}
                    </p>
                  )}
                </section>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(employe)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteId(employe.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {employes.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Aucun employé. Ajoutez votre première ressource.
            </p>
          )}

          <Button type="button" variant="secondary" className="w-full" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ajouter un employé
          </Button>

          {form && (
            <form
              className="space-y-4 rounded-2xl border border-border bg-card-elevated/40 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveEmploye();
              }}
            >
              <p className="text-sm font-semibold text-foreground">
                {employes.some((e) => e.id === form.id) ? "Modifier" : "Nouvel employé"}
              </p>
              <div className="flex items-center gap-4">
                <EmployeAvatar employe={form} size="lg" />
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Photo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!form.photo}
                    onClick={() => setForm({ ...form, photo: undefined })}
                  >
                    Retirer
                  </Button>
                </div>
              </div>
              <section className="grid gap-4 sm:grid-cols-2">
                <section>
                  <Label>Prénom</Label>
                  <Input
                    value={form.prenom}
                    className={errors.prenom ? invalidClass : undefined}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  />
                  {errors.prenom && (
                    <p className="mt-1 text-sm text-red-400">{errors.prenom}</p>
                  )}
                </section>
                <section>
                  <Label>Nom</Label>
                  <Input
                    value={form.nom}
                    className={errors.nom ? invalidClass : undefined}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  />
                  {errors.nom && (
                    <p className="mt-1 text-sm text-red-400">{errors.nom}</p>
                  )}
                </section>
              </section>
              <section>
                <Label>Poste (optionnel)</Label>
                <Input
                  value={form.poste ?? ""}
                  onChange={(e) => setForm({ ...form, poste: e.target.value })}
                  placeholder="Ex : chef d'équipe, maçon…"
                />
              </section>
              <footer className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                  Annuler
                </Button>
                <Button type="submit">Enregistrer</Button>
              </footer>
            </form>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Supprimer cet employé ?"
        message="Il sera retiré des assignations futures. Les événements existants conservent l’historique par ID."
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) removeEmploye(deleteId);
        }}
      />
    </>
  );
}
