"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAccount } from "@/lib/account";
import { ClientNameDisplay } from "@/components/client-name";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  CLIENT_NOTE_TYPE_LABELS,
  buildClientFicheTimeline,
  chantierStatutLabel,
  computeClientFicheSummary,
  devisStatutLabel,
  factureStatutLabel,
  filterEntitiesForClient,
  formatClientCoordinatesBlock,
  formatClientFicheDateTime,
  getClientDirectionsUrl,
  getClientFullAddress,
  getClientMailtoHref,
  getClientNotes,
  getClientPhoneHref,
  getClientTypeLabel,
  getClientWhatsAppHref,
  isTouchLikeDevice,
  listClientPayments,
  matchesTimelineFilter,
  partitionClientDevis,
  visibleClientFicheTabs,
  withClientNotes,
  type ClientFicheTab,
  type ClientFicheTimelineEvent,
  type ClientFicheTimelineFilter,
  type ClientNote,
  type ClientNoteType,
} from "@/lib/client-fiche";
import { markClientModified } from "@/lib/client-historique";
import { getClientAddress, getClientDisplayName } from "@/lib/clients";
import { calculateChantierAvancement, getChantierEtapes } from "@/lib/chantiers";
import { downloadDevisPdf } from "@/lib/devis-pdf";
import { downloadFacturePdf } from "@/lib/facture-pdf";
import { markFacturePayee } from "@/lib/facture-statut";
import { useStore } from "@/lib/store";
import type { Client, Commande, TypeClient } from "@/lib/types";
import { cn, formatCurrency, formatDate, generateId } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";

const TAB_ORDER: ClientFicheTab[] = [
  "overview",
  "historique",
  "devis",
  "commandes",
  "chantiers",
  "factures",
  "paiements",
  "documents",
  "notes",
];

const TAB_LABELS: Record<ClientFicheTab, string> = {
  overview: "Vue d'ensemble",
  historique: "Historique",
  devis: "Devis",
  commandes: "Commandes",
  chantiers: "Chantiers",
  factures: "Factures",
  paiements: "Paiements",
  documents: "Documents",
  notes: "Notes",
};

const FILTER_OPTIONS: { id: ClientFicheTimelineFilter; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "devis", label: "Devis" },
  { id: "chantier", label: "Chantiers" },
  { id: "facture", label: "Factures" },
  { id: "note", label: "Notes" },
  { id: "paiement", label: "Paiements" },
];

const INDICATIFS = [
  { value: "+33", label: "FRA +33" },
  { value: "+32", label: "BEL +32" },
  { value: "+41", label: "CHE +41" },
  { value: "+352", label: "LUX +352" },
  { value: "+34", label: "ESP +34" },
  { value: "+39", label: "ITA +39" },
  { value: "+49", label: "DEU +49" },
  { value: "+351", label: "PRT +351" },
  { value: "+44", label: "GBR +44" },
];

type ClientEditForm = {
  typeClient: TypeClient;
  nom: string;
  prenom: string;
  societe: string;
  email: string;
  indicatifTelephone: string;
  telephone: string;
  adresse: string;
  codePostal: string;
  ville: string;
  siret: string;
};

function buildEditForm(client: Client): ClientEditForm {
  return {
    typeClient: client.typeClient === "professionnel" ? "professionnel" : "particulier",
    nom: client.nom ?? "",
    prenom: client.prenom ?? "",
    societe: client.societe ?? "",
    email: client.email ?? "",
    indicatifTelephone: client.indicatifTelephone ?? "+33",
    telephone: client.telephone ?? "",
    adresse: client.adresse ?? "",
    codePostal: client.codePostal ?? "",
    ville: client.ville ?? "",
    siret: client.siret ?? "",
  };
}

type NoteForm = {
  content: string;
  type: ClientNoteType;
};

const EMPTY_NOTE_FORM: NoteForm = { content: "", type: "information" };

async function copyToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fallback ci-dessous
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

function getNoteAuthorName(): string {
  const account = getAccount();
  if (!account) return "Moi";
  const fullName = [account.prenom, account.nom].filter(Boolean).join(" ").trim();
  return fullName || account.utilisateur?.trim() || account.entreprise?.trim() || "Moi";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

function CopyIconButton({
  value,
  label,
  onCopy,
}: {
  value: string;
  label: string;
  onCopy: (value: string, message: string) => void;
}) {
  if (!value) return null;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => onCopy(value, `${label.replace(/^Copier /i, "")} copié·e`)}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-neutral-100 hover:text-foreground"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
}

function EmptyState({
  message,
  actionHref,
  actionLabel,
}: {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-neutral-50/60 px-5 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-4 inline-block">
          <Button type="button" size="sm">
            {actionLabel}
          </Button>
        </Link>
      ) : null}
    </div>
  );
}

function TimelineList({ events }: { events: ClientFicheTimelineEvent[] }) {
  if (events.length === 0) {
    return <EmptyState message="Aucun événement dans l'historique pour le moment." />;
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const { date, time } = formatClientFicheDateTime(event.date);
        const body = (
          <div className="rounded-xl border border-border/80 bg-white px-4 py-3 transition hover:border-[#2563eb]/35">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {date}
                {time ? ` · ${time}` : ""}
              </p>
              {event.status ? <Pill>{event.status}</Pill> : null}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">{event.title}</p>
            {event.subtitle ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{event.subtitle}</p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {event.amountLabel ? (
                <span className="text-sm font-medium text-[#2563eb]">{event.amountLabel}</span>
              ) : null}
              {event.author ? (
                <span className="text-xs text-muted-foreground">Par {event.author}</span>
              ) : null}
            </div>
          </div>
        );

        return (
          <li key={event.id}>{event.href ? <Link href={event.href}>{body}</Link> : body}</li>
        );
      })}
    </ul>
  );
}

export function ClientFicheView({ clientId }: { clientId: string }) {
  const { data, setData } = useStore();
  const client = data.clients.find((item) => item.id === clientId) ?? null;

  const [tab, setTab] = useState<ClientFicheTab>("overview");
  const [filterKind, setFilterKind] = useState<ClientFicheTimelineFilter>("all");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<ClientEditForm | null>(null);

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState<NoteForm>(EMPTY_NOTE_FORM);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const linked = useMemo(
    () => (client ? filterEntitiesForClient(data, client.id) : null),
    [client, data],
  );

  const summary = useMemo(
    () => (client ? computeClientFicheSummary(data, client.id, client) : null),
    [client, data],
  );

  const timeline = useMemo(
    () => (client ? buildClientFicheTimeline(data, client) : []),
    [client, data],
  );

  const notes = useMemo(() => (client ? getClientNotes(client) : []), [client]);

  const documents = useMemo(
    () => (linked ? linked.devis.filter((item) => Boolean(item.signedPdfBase64)) : []),
    [linked],
  );

  const payments = useMemo(
    () => (linked ? listClientPayments(linked.factures) : []),
    [linked],
  );

  const devisGroups = useMemo(
    () => (linked ? partitionClientDevis(linked.devis) : null),
    [linked],
  );

  const visibleTabs = useMemo(
    () =>
      linked
        ? visibleClientFicheTabs({
            devis: linked.devis.length,
            commandes: linked.commandes.length,
            chantiers: linked.chantiers.length,
            factures: linked.factures.length,
            paiements: payments.length,
            documents: documents.length,
            notes: notes.length,
          })
        : TAB_ORDER,
    [linked, documents.length, notes.length, payments.length],
  );

  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab("overview");
  }, [visibleTabs, tab]);

  const filteredTimeline = useMemo(() => {
    const q = query.trim().toLowerCase();
    return timeline.filter((event) => {
      if (!matchesTimelineFilter(event, filterKind)) return false;
      if (!q) return true;
      return (
        event.title.toLowerCase().includes(q) ||
        (event.subtitle ?? "").toLowerCase().includes(q) ||
        (event.status ?? "").toLowerCase().includes(q)
      );
    });
  }, [timeline, filterKind, query]);

  const phoneHref = client ? getClientPhoneHref(client) : null;
  const whatsappHref = client ? getClientWhatsAppHref(client) : null;
  const mailHref = client ? getClientMailtoHref(client) : null;
  const directionsUrl = client ? getClientDirectionsUrl(client) : null;
  const isPro = client?.typeClient === "professionnel";

  function showToast(message: string) {
    setToast(message);
  }

  function handleCopy(value: string, message: string) {
    void copyToClipboard(value).then((ok) => {
      if (ok) showToast(message);
    });
  }

  function updateClient(next: Client) {
    setData((prev) => ({
      ...prev,
      clients: prev.clients.map((item) => (item.id === next.id ? next : item)),
    }));
  }

  function handleCallClick() {
    if (!client || !phoneHref) return;
    if (isTouchLikeDevice()) {
      window.location.href = phoneHref;
      return;
    }
    setPhoneModalOpen(true);
  }

  function openEditModal() {
    if (!client) return;
    setEditForm(buildEditForm(client));
    setEditModalOpen(true);
  }

  function saveEditClient() {
    if (!client || !editForm) return;
    const nom = editForm.nom.trim();
    if (!nom) {
      showToast("Le nom est obligatoire.");
      return;
    }

    const updated = markClientModified({
      ...client,
      typeClient: editForm.typeClient,
      nom,
      prenom: editForm.prenom.trim() || undefined,
      societe: editForm.societe.trim() || undefined,
      email: editForm.email.trim() || undefined,
      indicatifTelephone: editForm.indicatifTelephone,
      telephone: editForm.telephone.trim(),
      adresse: editForm.adresse.trim(),
      codePostal: editForm.codePostal.trim(),
      ville: editForm.ville.trim(),
      siret:
        editForm.typeClient === "professionnel"
          ? editForm.siret.trim() || undefined
          : undefined,
    });

    updateClient(updated);
    setEditModalOpen(false);
    showToast("Client modifié");
  }

  function openNoteModalForCreate() {
    setEditingNoteId(null);
    setNoteForm(EMPTY_NOTE_FORM);
    setNoteModalOpen(true);
  }

  function openNoteModalForEdit(note: ClientNote) {
    setEditingNoteId(note.id);
    setNoteForm({ content: note.content, type: note.type ?? "information" });
    setNoteModalOpen(true);
  }

  function saveNote() {
    if (!client) return;
    const content = noteForm.content.trim();
    if (!content) {
      showToast("La note ne peut pas être vide.");
      return;
    }

    const now = new Date().toISOString();
    let nextNotes: ClientNote[];

    if (editingNoteId) {
      nextNotes = notes.map((note) =>
        note.id === editingNoteId
          ? { ...note, content, type: noteForm.type, updatedAt: now }
          : note,
      );
    } else {
      const created: ClientNote = {
        id: generateId(),
        content,
        createdAt: now,
        author: getNoteAuthorName(),
        type: noteForm.type,
      };
      nextNotes = [created, ...notes];
    }

    updateClient(withClientNotes(client, nextNotes));
    setNoteModalOpen(false);
    setEditingNoteId(null);
    setNoteForm(EMPTY_NOTE_FORM);
    showToast(editingNoteId ? "Note modifiée" : "Note ajoutée");
  }

  function confirmDeleteNote() {
    if (!client || !noteToDelete) return;
    const nextNotes = notes.filter((note) => note.id !== noteToDelete);
    updateClient(withClientNotes(client, nextNotes));
    setNoteToDelete(null);
    showToast("Note supprimée");
  }

  async function handleDownloadDevisPdf(devisId: string) {
    const devis = linked?.devis.find((item) => item.id === devisId);
    if (!devis) return;
    try {
      await downloadDevisPdf({
        devis,
        client: client ?? undefined,
        parametres: data.parametres,
      });
    } catch {
      showToast("Erreur lors du téléchargement du PDF.");
    }
  }

  async function handleDownloadFacturePdf(factureId: string) {
    const facture = linked?.factures.find((item) => item.id === factureId);
    if (!facture) return;
    try {
      await downloadFacturePdf({
        facture,
        client: client ?? undefined,
        parametres: data.parametres,
      });
    } catch {
      showToast("Erreur lors du téléchargement du PDF.");
    }
  }

  function handleMarkFacturePayee(factureId: string) {
    setData((prev) => ({
      ...prev,
      factures: prev.factures.map((item) =>
        item.id === factureId ? markFacturePayee(item) : item,
      ),
    }));
    showToast("Facture marquée comme payée");
  }

  function printFiche() {
    window.print();
  }

  if (!client || !linked || !summary) {
    return (
      <div className="space-y-4">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux clients
        </Link>
        <Card className="border-border/70 bg-white p-6">
          <p className="text-sm text-muted-foreground">
            Client introuvable. Il a peut-être été supprimé.
          </p>
        </Card>
      </div>
    );
  }

  const displayName = getClientDisplayName(client);
  const fullAddress = getClientFullAddress(client);
  const hasAddress = getClientAddress(client).trim().length > 0;
  const lastActivityLabel = summary.lastActivityAt
    ? formatClientFicheDateTime(summary.lastActivityAt).date
    : "—";

  return (
    <div className="space-y-6 print:space-y-4">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-lg print:hidden"
        >
          {toast}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux clients
        </Link>
        <Button type="button" size="sm" variant="secondary" onClick={printFiche}>
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Imprimer la synthèse
        </Button>
      </div>

      {/* Zone A — Header */}
      <Card className="border-border/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                <ClientNameDisplay client={client} />
              </h1>
              <Pill>{getClientTypeLabel(client)}</Pill>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <p className="inline-flex min-w-0 items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {client.telephone ? (
                  <>
                    <span className="truncate">
                      {client.indicatifTelephone ? `${client.indicatifTelephone} ` : ""}
                      {client.telephone}
                    </span>
                    <CopyIconButton
                      value={`${client.indicatifTelephone ?? ""} ${client.telephone}`.trim()}
                      label="Copier le numéro"
                      onCopy={handleCopy}
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="text-[#2563eb] hover:underline"
                  >
                    Ajouter un numéro
                  </button>
                )}
              </p>

              <p className="inline-flex min-w-0 items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {client.email ? (
                  <>
                    <span className="truncate">{client.email}</span>
                    <CopyIconButton
                      value={client.email}
                      label="Copier l'email"
                      onCopy={handleCopy}
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="text-[#2563eb] hover:underline"
                  >
                    Ajouter un email
                  </button>
                )}
              </p>

              <p className="inline-flex items-start gap-2 sm:col-span-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {hasAddress ? (
                  <>
                    <span className="min-w-0">{fullAddress}</span>
                    <CopyIconButton
                      value={fullAddress}
                      label="Copier l'adresse"
                      onCopy={handleCopy}
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="text-[#2563eb] hover:underline"
                  >
                    Ajouter une adresse
                  </button>
                )}
              </p>

              {isPro ? (
                <p className="inline-flex items-center gap-2 sm:col-span-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  {client.siret ? (
                    <>
                      <span>SIRET {client.siret}</span>
                      <CopyIconButton
                        value={client.siret}
                        label="Copier le SIRET"
                        onCopy={handleCopy}
                      />
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="text-[#2563eb] hover:underline"
                    >
                      Ajouter un SIRET
                    </button>
                  )}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Créé le {formatDate(client.createdAt.slice(0, 10))}
              </span>
              <span>Dernière activité {lastActivityLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden lg:max-w-sm lg:justify-end">
            {phoneHref ? (
              <Button type="button" size="sm" variant="secondary" onClick={handleCallClick}>
                <Phone className="mr-1.5 h-3.5 w-3.5" />
                Appeler
              </Button>
            ) : (
              <Button type="button" size="sm" variant="ghost" onClick={openEditModal}>
                <Phone className="mr-1.5 h-3.5 w-3.5" />
                Ajouter un numéro
              </Button>
            )}

            {mailHref ? (
              <a href={mailHref}>
                <Button type="button" size="sm" variant="secondary">
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Envoyer un mail
                </Button>
              </a>
            ) : (
              <Button type="button" size="sm" variant="ghost" onClick={openEditModal}>
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Ajouter un email
              </Button>
            )}

            {directionsUrl ? (
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <Button type="button" size="sm" variant="secondary">
                  <Navigation className="mr-1.5 h-3.5 w-3.5" />
                  Ouvrir l&apos;adresse
                </Button>
              </a>
            ) : (
              <Button type="button" size="sm" variant="ghost" onClick={openEditModal}>
                <MapPin className="mr-1.5 h-3.5 w-3.5" />
                Ajouter une adresse
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                handleCopy(
                  formatClientCoordinatesBlock(client),
                  "Coordonnées copiées",
                )
              }
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copier les coordonnées
            </Button>

            <Link href={`/devis?clientId=${client.id}&nouveau=1`}>
              <Button type="button" size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Créer un devis
              </Button>
            </Link>

            <Link href={`/chantiers?clientId=${client.id}&nouveau=1`}>
              <Button type="button" size="sm" variant="secondary">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Créer un chantier
              </Button>
            </Link>

            <Button type="button" size="sm" variant="ghost" onClick={openNoteModalForCreate}>
              <StickyNote className="mr-1.5 h-3.5 w-3.5" />
              Ajouter une note
            </Button>

            <Button type="button" size="sm" variant="secondary" onClick={openEditModal}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Modifier le client
            </Button>
          </div>
        </div>
      </Card>

      {/* Zone B — Résumé */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Devis brouillons" value={summary.devisBrouillons} />
        <StatCard label="Devis envoyés" value={summary.devisEnvoyes} />
        <StatCard label="Devis signés" value={summary.devisSignes} />
        <StatCard label="Chantiers en cours" value={summary.chantiersEnCours} />
        <StatCard label="Factures" value={summary.factures} />
        <StatCard label="Paiements" value={payments.length} />
        <StatCard label="Encaissé" value={formatCurrency(summary.montantEncaisse)} />
        <StatCard label="Reste dû" value={formatCurrency(summary.montantDu)} />
      </div>

      {/* Zone C — Onglets */}
      <div className="flex flex-wrap gap-2 border-b border-border/70 pb-2 print:hidden">
        {TAB_ORDER.filter((id) => visibleTabs.includes(id)).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === id
                ? "bg-neutral-900 text-white"
                : "bg-white text-muted-foreground hover:bg-neutral-50 hover:text-foreground",
            )}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/70 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Historique récent</h2>
              <button
                type="button"
                className="text-xs font-medium text-[#2563eb] hover:underline"
                onClick={() => setTab("historique")}
              >
                Tout voir
              </button>
            </div>
            <TimelineList events={timeline.slice(0, 8)} />
          </Card>
          <Card className="border-border/70 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Coordonnées</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Nom affiché</dt>
                <dd className="font-medium">{displayName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Adresse</dt>
                <dd className="flex items-center gap-2">
                  <span className="min-w-0">{fullAddress}</span>
                  {hasAddress ? (
                    <CopyIconButton
                      value={fullAddress}
                      label="Copier l'adresse"
                      onCopy={handleCopy}
                    />
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Téléphone</dt>
                <dd className="flex items-center gap-2">
                  <span>{client.telephone || "—"}</span>
                  {client.telephone ? (
                    <CopyIconButton
                      value={`${client.indicatifTelephone ?? ""} ${client.telephone}`.trim()}
                      label="Copier le numéro"
                      onCopy={handleCopy}
                    />
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="flex items-center gap-2">
                  <span className="min-w-0 truncate">{client.email || "—"}</span>
                  {client.email ? (
                    <CopyIconButton
                      value={client.email}
                      label="Copier l'email"
                      onCopy={handleCopy}
                    />
                  ) : null}
                </dd>
              </div>
              {isPro && client.siret ? (
                <div>
                  <dt className="text-xs text-muted-foreground">SIRET</dt>
                  <dd className="flex items-center gap-2">
                    <span>{client.siret}</span>
                    <CopyIconButton
                      value={client.siret}
                      label="Copier le SIRET"
                      onCopy={handleCopy}
                    />
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </div>
      ) : null}

      {tab === "historique" ? (
        <Card className="border-border/70 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="flex flex-wrap gap-1.5">
              {FILTER_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilterKind(item.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    filterKind === item.id
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-border bg-white text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher dans l'historique…"
                className="pl-9"
                aria-label="Rechercher dans l'historique"
              />
            </div>
          </div>
          <TimelineList events={filteredTimeline} />
        </Card>
      ) : null}

      {tab === "devis" ? (
        linked.devis.length === 0 || !devisGroups ? (
          <Card className="border-border/70 bg-white p-5 shadow-sm">
            <EmptyState
              message="Aucun devis n'est encore lié à ce client."
              actionHref={`/devis?clientId=${client.id}&nouveau=1`}
              actionLabel="Créer un devis"
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {(
              [
                { key: "brouillons" as const, title: "Devis brouillons" },
                { key: "envoyes" as const, title: "Devis envoyés" },
                { key: "signes" as const, title: "Devis signés" },
                { key: "autres" as const, title: "Autres devis" },
              ] as const
            )
              .filter((section) => devisGroups[section.key].length > 0 || section.key !== "autres")
              .map((section) => (
                <Card key={section.key} className="border-border/70 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">{section.title}</h2>
                    <Pill>{devisGroups[section.key].length}</Pill>
                  </div>
                  {devisGroups[section.key].length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun élément.</p>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {devisGroups[section.key].map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/devis/${item.id}`}
                              className="text-sm font-semibold text-foreground hover:text-[#2563eb]"
                            >
                              {item.numero} — {item.titre}
                            </Link>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              {formatDate((item.dateCreation ?? item.date).slice(0, 10))}
                              <Pill>{devisStatutLabel(item.statut)}</Pill>
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <p className="text-sm font-medium tabular-nums">
                              {item.montantTTC != null
                                ? formatCurrency(item.montantTTC)
                                : "—"}
                            </p>
                            <Link href={`/devis/${item.id}`}>
                              <Button type="button" size="sm" variant="secondary">
                                Ouvrir
                              </Button>
                            </Link>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleDownloadDevisPdf(item.id)}
                            >
                              <FileText className="mr-1.5 h-3.5 w-3.5" />
                              PDF
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
          </div>
        )
      ) : null}

      {tab === "commandes" ? (
        <Card className="border-border/70 bg-white p-5 shadow-sm">
          {linked.commandes.length === 0 ? (
            <EmptyState message="Aucune commande n'est encore liée à ce client." />
          ) : (
            <ul className="divide-y divide-border/60">
              {linked.commandes.map((item: Commande) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/commandes/${item.id}`}
                      className="text-sm font-semibold hover:text-[#2563eb]"
                    >
                      Commande {item.numero}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {item.devisTitre || item.devisNumero || "—"}
                      <Pill>{item.statut}</Pill>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="text-sm font-medium tabular-nums">
                      {formatCurrency(item.montantTTC)}
                    </p>
                    <Link href={`/commandes/${item.id}`}>
                      <Button type="button" size="sm" variant="secondary">
                        Ouvrir
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "chantiers" ? (
        <Card className="border-border/70 bg-white p-5 shadow-sm">
          {linked.chantiers.length === 0 ? (
            <EmptyState
              message="Aucun chantier n'est encore lié à ce client."
              actionHref={`/chantiers?clientId=${client.id}&nouveau=1`}
              actionLabel="Créer un chantier"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {linked.chantiers.map((item) => {
                const avancement = calculateChantierAvancement(getChantierEtapes(item));
                return (
                  <li key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/chantiers/${item.id}`}
                        className="text-sm font-semibold hover:text-[#2563eb]"
                      >
                        {item.nom}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {item.adresse || "—"}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {formatDate(item.dateDebut)} — {formatDate(item.dateFin)}
                        <Pill>{chantierStatutLabel(item.statut)}</Pill>
                      </p>
                      <ProgressBar value={avancement} size="sm" className="mt-2 max-w-xs" />
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(item.budget)}
                      </p>
                      <Link href={`/chantiers/${item.id}`}>
                        <Button type="button" size="sm" variant="secondary">
                          Ouvrir
                        </Button>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "factures" ? (
        <Card className="border-border/70 bg-white p-5 shadow-sm">
          {linked.factures.length === 0 ? (
            <EmptyState
              message="Aucune facture n'est encore liée à ce client."
              actionHref="/factures"
              actionLabel="Voir les factures"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {linked.factures.map((item) => {
                const montant =
                  typeof item.montantTTC === "number" ? item.montantTTC : item.montant;
                const isPayee = item.statut === "payee";
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.numero}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        Émise le {formatDate(item.dateEmission.slice(0, 10))}
                        {item.dateEcheance
                          ? ` · Échéance ${formatDate(item.dateEcheance.slice(0, 10))}`
                          : ""}
                        <Pill>{factureStatutLabel(item.statut)}</Pill>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <p className="text-sm font-medium tabular-nums">
                        {formatCurrency(montant)}
                      </p>
                      <Link href="/factures">
                        <Button type="button" size="sm" variant="secondary">
                          Ouvrir
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleDownloadFacturePdf(item.id)}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        PDF
                      </Button>
                      {!isPayee ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMarkFacturePayee(item.id)}
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Marquer payée
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "paiements" ? (
        <Card className="border-border/70 bg-white p-5 shadow-sm">
          {payments.length === 0 ? (
            <EmptyState
              message="Aucun paiement enregistré pour ce client."
              actionHref="/factures"
              actionLabel="Voir les factures"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      Paiement — {payment.numero}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(payment.date.slice(0, 10))}
                      <span className="mx-1.5">·</span>
                      Facture payée
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="text-sm font-semibold tabular-nums text-emerald-700">
                      {formatCurrency(payment.montant)}
                    </p>
                    <Link href="/factures">
                      <Button type="button" size="sm" variant="secondary">
                        Voir la facture
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "documents" ? (
        <Card className="border-border/70 bg-white p-5 shadow-sm">
          {documents.length === 0 ? (
            <EmptyState message="Aucun document signé n'est encore lié à ce client." />
          ) : (
            <ul className="divide-y divide-border/60">
              {documents.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="inline-flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <Link
                        href={`/devis/${item.id}`}
                        className="text-sm font-semibold hover:text-[#2563eb]"
                      >
                        PDF signé — {item.numero}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{item.titre}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/devis/${item.id}`}>
                      <Button type="button" size="sm" variant="secondary">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Ouvrir
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDownloadDevisPdf(item.id)}
                    >
                      Télécharger
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "notes" ? (
        <Card className="border-border/70 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Notes internes</h2>
            <Button type="button" size="sm" onClick={openNoteModalForCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Ajouter une note
            </Button>
          </div>

          {notes.length === 0 ? (
            <EmptyState message="Aucune note pour ce client." />
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => {
                const { date, time } = formatClientFicheDateTime(note.createdAt);
                return (
                  <li key={note.id} className="rounded-xl border border-border/80 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {note.type ? <Pill>{CLIENT_NOTE_TYPE_LABELS[note.type]}</Pill> : null}
                        <span>
                          {date}
                          {time ? ` · ${time}` : ""}
                        </span>
                        {note.author ? <span>· {note.author}</span> : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Modifier la note"
                          title="Modifier la note"
                          onClick={() => openNoteModalForEdit(note)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-neutral-100 hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Supprimer la note"
                          title="Supprimer la note"
                          onClick={() => setNoteToDelete(note.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                      {note.content}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {/* Modale appel — fallback desktop */}
      <Modal
        open={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        title={`Appeler ${displayName}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {client.indicatifTelephone ? `${client.indicatifTelephone} ` : ""}
            {client.telephone}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                handleCopy(
                  `${client.indicatifTelephone ?? ""} ${client.telephone}`.trim(),
                  "Numéro copié",
                )
              }
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copier le numéro
            </Button>
            {whatsappHref ? (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="secondary" className="w-full">
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  WhatsApp
                </Button>
              </a>
            ) : null}
            {phoneHref ? (
              <a href={phoneHref}>
                <Button type="button" variant="primary" className="w-full">
                  <Phone className="mr-1.5 h-3.5 w-3.5" />
                  Appeler quand même
                </Button>
              </a>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => setPhoneModalOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modale modification client */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Modifier le client"
      >
        {editForm ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveEditClient();
            }}
          >
            <div>
              <Label htmlFor="client-type">Type de client</Label>
              <Select
                value={editForm.typeClient}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    typeClient: event.target.value as TypeClient,
                  })
                }
              >
                <option value="particulier">Particulier</option>
                <option value="professionnel">Professionnel</option>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="client-nom">Nom</Label>
                <Input
                  id="client-nom"
                  value={editForm.nom}
                  onChange={(event) => setEditForm({ ...editForm, nom: event.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="client-prenom">Prénom</Label>
                <Input
                  id="client-prenom"
                  value={editForm.prenom}
                  onChange={(event) => setEditForm({ ...editForm, prenom: event.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="client-societe">Société</Label>
              <Input
                id="client-societe"
                value={editForm.societe}
                onChange={(event) => setEditForm({ ...editForm, societe: event.target.value })}
                placeholder="Optionnel"
              />
            </div>

            <div>
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={editForm.email}
                onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                placeholder="ex : contact@client.fr"
              />
            </div>

            <div>
              <Label>Téléphone</Label>
              <div className="grid grid-cols-[8rem_1fr] gap-2">
                <Select
                  value={editForm.indicatifTelephone}
                  onChange={(event) =>
                    setEditForm({ ...editForm, indicatifTelephone: event.target.value })
                  }
                >
                  {INDICATIFS.map((indicatif) => (
                    <option key={indicatif.value} value={indicatif.value}>
                      {indicatif.label}
                    </option>
                  ))}
                </Select>
                <Input
                  type="tel"
                  value={editForm.telephone}
                  onChange={(event) =>
                    setEditForm({ ...editForm, telephone: event.target.value })
                  }
                  placeholder="ex : 06 49 23 18 00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="client-adresse">Adresse</Label>
              <Input
                id="client-adresse"
                value={editForm.adresse}
                onChange={(event) => setEditForm({ ...editForm, adresse: event.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="client-cp">Code postal</Label>
                <Input
                  id="client-cp"
                  value={editForm.codePostal}
                  onChange={(event) =>
                    setEditForm({ ...editForm, codePostal: event.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="client-ville">Ville</Label>
                <Input
                  id="client-ville"
                  value={editForm.ville}
                  onChange={(event) => setEditForm({ ...editForm, ville: event.target.value })}
                />
              </div>
            </div>

            {editForm.typeClient === "professionnel" ? (
              <div>
                <Label htmlFor="client-siret">SIRET</Label>
                <Input
                  id="client-siret"
                  value={editForm.siret}
                  onChange={(event) => setEditForm({ ...editForm, siret: event.target.value })}
                  placeholder="14 chiffres"
                />
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditModalOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* Modale note */}
      <Modal
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title={editingNoteId ? "Modifier la note" : "Ajouter une note"}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveNote();
          }}
        >
          <div>
            <Label htmlFor="note-content">Contenu</Label>
            <Textarea
              id="note-content"
              rows={4}
              value={noteForm.content}
              onChange={(event) => setNoteForm({ ...noteForm, content: event.target.value })}
              placeholder="Note interne visible uniquement dans Batimum…"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="note-type">Type</Label>
            <Select
              value={noteForm.type}
              onChange={(event) =>
                setNoteForm({ ...noteForm, type: event.target.value as ClientNoteType })
              }
            >
              {(Object.keys(CLIENT_NOTE_TYPE_LABELS) as ClientNoteType[]).map((type) => (
                <option key={type} value={type}>
                  {CLIENT_NOTE_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Auteur : {getNoteAuthorName()}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setNoteModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(noteToDelete)}
        title="Supprimer la note"
        message="Cette note sera définitivement supprimée. Voulez-vous continuer ?"
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setNoteToDelete(null)}
        onConfirm={confirmDeleteNote}
      />
    </div>
  );
}
