"use client";

import { useMemo, useRef, useState } from "react";
import { ParametresSection } from "@/components/parametres-section";
import { EmployeAvatar } from "@/components/employe-avatar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useStore } from "@/lib/store";
import type { Employe } from "@/lib/types";
import {
  employeDisplayLabel,
  getEmployeLoginKey,
  normalizeEmployeRecord,
  removeEmployeCredentials,
  saveEmployeCredentials,
} from "@/lib/employee-access";
import { generateId, formatDateTimeFR } from "@/lib/utils";
import {
  getEmployeChantiersAssignes,
  getEmployeUpcomingEvents,
} from "@/lib/planning-affectations";
import { getPlanningEventDisplayTitle } from "@/lib/planning-types";
import { EMPLOYEE_PLANNING_COLORS } from "@/lib/planning-colors";
import { normalizePhoneForTel } from "@/lib/employee-chantier-actions";
import { ImagePlus, Pencil, Phone, UserPlus } from "lucide-react";

function emptyEmploye(): Employe {
  return {
    id: generateId(),
    prenom: "",
    nom: "",
    statut: "actif",
  };
}

export function ParametresEmployesSection() {
  const { data, setData } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Employe>(emptyEmploye);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [disableTarget, setDisableTarget] = useState<Employe | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const employes = useMemo(
    () =>
      [...data.employes].sort((a, b) =>
        employeDisplayLabel(a).localeCompare(employeDisplayLabel(b), "fr"),
      ),
    [data.employes],
  );

  const editingEmployePreview = useMemo(() => {
    if (!data.employes.some((item) => item.id === form.id)) return null;
    const upcoming = getEmployeUpcomingEvents(data.planning, form.id, undefined, 4);
    const chantiers = getEmployeChantiersAssignes(
      data.planning,
      data.chantiers,
      form.id,
    );
    return { upcoming, chantiers };
  }, [data.chantiers, data.employes, data.planning, form.id]);

  function openCreate() {
    setForm(emptyEmploye());
    setPassword("");
    setError("");
    setOpen(true);
  }

  function openEdit(employe: Employe) {
    setForm({ ...employe });
    setPassword("");
    setError("");
    setOpen(true);
  }

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/png", "image/jpeg"];
    if (!allowed.includes(file.type)) {
      setError("Format non supporté. Utilisez PNG ou JPEG.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((previous) => ({ ...previous, photo: reader.result as string }));
      }
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  async function saveEmploye() {
    const normalized = normalizeEmployeRecord(form);
    if (!normalized.prenom.trim() || !normalized.nom.trim()) {
      setError("Le prénom et le nom sont obligatoires.");
      return;
    }
    if (!normalized.email?.trim() && !normalized.identifiant?.trim()) {
      setError("Un email ou un identifiant de connexion est obligatoire.");
      return;
    }

    const loginKey = getEmployeLoginKey(normalized);
    const exists = data.employes.some(
      (item) =>
        item.id !== normalized.id &&
        getEmployeLoginKey(item) === loginKey &&
        loginKey.length > 0,
    );
    if (exists) {
      setError("Cet email ou identifiant est déjà utilisé.");
      return;
    }

    const isNew = !data.employes.some((item) => item.id === normalized.id);

    if (isNew && password.trim().length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (!isNew && password.trim() && password.trim().length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (isNew || password.trim()) {
      await saveEmployeCredentials(
        loginKey,
        password.trim(),
        normalized.id,
      );
    }

    setData((previous) => ({
      ...previous,
      employes: isNew
        ? [...previous.employes, normalized]
        : previous.employes.map((item) =>
            item.id === normalized.id ? normalized : item,
          ),
    }));

    setOpen(false);
    setPassword("");
  }

  function toggleStatut(employe: Employe) {
    const nextStatut = employe.statut === "desactive" ? "actif" : "desactive";
    setData((previous) => ({
      ...previous,
      employes: previous.employes.map((item) =>
        item.id === employe.id ? { ...item, statut: nextStatut } : item,
      ),
    }));
    setDisableTarget(null);
  }

  async function removeEmploye(employe: Employe) {
    const loginKey = getEmployeLoginKey(employe);
    if (loginKey) {
      await removeEmployeCredentials(loginKey);
    }

    setData((previous) => ({
      ...previous,
      employes: previous.employes.filter((item) => item.id !== employe.id),
      planning: previous.planning.map((event) => ({
        ...event,
        employeIds: (event.employeIds ?? []).filter((id) => id !== employe.id),
        employeTermineIds: (event.employeTermineIds ?? []).filter(
          (id) => id !== employe.id,
        ),
        employeEnCoursIds: (event.employeEnCoursIds ?? []).filter(
          (id) => id !== employe.id,
        ),
      })),
    }));
  }

  return (
    <ParametresSection
      title="Employés"
      description="Créez des accès limités au planning pour votre équipe (V1 locale — sécurité production via Supabase à venir)"
    >
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>
          <UserPlus className="h-4 w-4" />
          Ajouter un employé
        </Button>
      </div>

      {employes.length === 0 ? (
        <p className="rounded-xl border border-border bg-card-elevated px-4 py-4 text-sm text-muted-foreground">
          Aucun employé avec accès planning. Ajoutez un membre de votre équipe
          avec un identifiant et un mot de passe.
        </p>
      ) : (
        <ul className="space-y-3">
          {employes.map((employe) => {
            const nextEvents = getEmployeUpcomingEvents(
              data.planning,
              employe.id,
              undefined,
              1,
            );
            const assignedChantiers = getEmployeChantiersAssignes(
              data.planning,
              data.chantiers,
              employe.id,
            );

            return (
            <li
              key={employe.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <EmployeAvatar employe={employe} size="md" />
                <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {employeDisplayLabel(employe)}
                </p>
                {employe.poste && (
                  <p className="text-xs text-muted-foreground">{employe.poste}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  {employe.email || employe.identifiant || "—"}
                </p>
                {employe.telephone?.trim() && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {employe.telephone}
                  </p>
                )}
                {(assignedChantiers.length > 0 || nextEvents.length > 0) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {assignedChantiers.length > 0 && (
                      <span>
                        {assignedChantiers.length} chantier
                        {assignedChantiers.length > 1 ? "s" : ""} assigné
                        {assignedChantiers.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {assignedChantiers.length > 0 && nextEvents.length > 0 && " · "}
                    {nextEvents.length > 0 && (
                      <span>
                        Prochaine intervention :{" "}
                        {formatDateTimeFR(nextEvents[0].date, nextEvents[0].heureDebut)}
                      </span>
                    )}
                  </p>
                )}
              </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  label={employe.statut === "desactive" ? "Désactivé" : "Actif"}
                  status={employe.statut === "desactive" ? "en_attente" : "payee"}
                />
                {employe.telephone?.trim() && (
                  <a
                    href={`tel:${normalizePhoneForTel(employe.telephone)}`}
                    className="btp-btn inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-card transition-all hover:bg-card-hover"
                  >
                    <Phone className="h-4 w-4" />
                    Appeler
                  </a>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => openEdit(employe)}
                >
                  <Pencil className="h-4 w-4" />
                  Modifier
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDisableTarget(employe)}
                >
                  {employe.statut === "desactive" ? "Réactiver" : "Désactiver"}
                </Button>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          data.employes.some((item) => item.id === form.id)
            ? "Modifier l'employé"
            : "Nouvel employé"
        }
      >
        <div className="space-y-4">
          <section className="flex flex-wrap items-center gap-4">
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
                Photo de profil
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!form.photo}
                onClick={() => setForm((previous) => ({ ...previous, photo: undefined }))}
              >
                Retirer
              </Button>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Prénom</Label>
              <Input
                value={form.prenom}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    prenom: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Nom</Label>
              <Input
                value={form.nom}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, nom: event.target.value }))
                }
              />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Poste</Label>
              <Input
                value={form.poste ?? ""}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, poste: event.target.value }))
                }
                placeholder="Ex : chef d'équipe, maçon…"
              />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                type="tel"
                value={form.telephone ?? ""}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    telephone: event.target.value,
                  }))
                }
                placeholder="06 12 34 56 78"
              />
            </div>
          </section>

          <section>
            <Label>Couleur planning</Label>
            <Select
              value={form.couleurPlanning ?? ""}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  couleurPlanning: event.target.value || undefined,
                }))
              }
            >
              <option value="">Par défaut</option>
              {EMPLOYEE_PLANNING_COLORS.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </Select>
          </section>

          <section>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, email: event.target.value }))
              }
              placeholder="employe@entreprise.fr"
            />
          </section>

          <section>
            <Label>Identifiant (si pas d&apos;email)</Label>
            <Input
              value={form.identifiant ?? ""}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  identifiant: event.target.value,
                }))
              }
              placeholder="lucas.b"
            />
          </section>

          <section>
            <Label>Mot de passe</Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                data.employes.some((item) => item.id === form.id)
                  ? "Laisser vide pour conserver le mot de passe actuel"
                  : "Minimum 6 caractères"
              }
            />
          </section>

          <section>
            <Label>Statut</Label>
            <Select
              value={form.statut ?? "actif"}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  statut: event.target.value === "desactive" ? "desactive" : "actif",
                }))
              }
            >
              <option value="actif">Actif</option>
              <option value="desactive">Désactivé</option>
            </Select>
          </section>

          {editingEmployePreview && (
            <section className="rounded-xl border border-border/60 bg-card-elevated/30 px-4 py-3">
              <p className="text-sm font-medium text-foreground">Planning à venir</p>
              {editingEmployePreview.chantiers.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Chantiers :{" "}
                  <span className="text-foreground">
                    {editingEmployePreview.chantiers.map((c) => c.nom).join(", ")}
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Aucun chantier assigné à venir.
                </p>
              )}
              {editingEmployePreview.upcoming.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {editingEmployePreview.upcoming.map((event) => {
                    const chantier = event.chantierId
                      ? data.chantiers.find((item) => item.id === event.chantierId)
                      : null;
                    return (
                      <li key={event.id}>
                        {formatDateTimeFR(event.date, event.heureDebut)} —{" "}
                        {getPlanningEventDisplayTitle(event, chantier)}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Aucune intervention planifiée.
                </p>
              )}
            </section>
          )}

          {error && (
            <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
              {error}
            </p>
          )}

          <footer className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveEmploye()}>
              Enregistrer
            </Button>
            {data.employes.some((item) => item.id === form.id) && (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  void removeEmploye(form);
                  setOpen(false);
                }}
              >
                Supprimer
              </Button>
            )}
          </footer>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(disableTarget)}
        title={
          disableTarget?.statut === "desactive"
            ? "Réactiver l'employé"
            : "Désactiver l'employé"
        }
        message={
          disableTarget?.statut === "desactive"
            ? "L'employé pourra à nouveau se connecter."
            : "L'employé ne pourra plus se connecter tant que le compte est désactivé."
        }
        confirmLabel={
          disableTarget?.statut === "desactive" ? "Réactiver" : "Désactiver"
        }
        onCancel={() => setDisableTarget(null)}
        onConfirm={() => disableTarget && toggleStatut(disableTarget)}
      />
    </ParametresSection>
  );
}
