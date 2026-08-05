"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClientNameDisplay } from "@/components/client-name";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  buildClientFicheTimeline,
  chantierStatutLabel,
  computeClientFicheSummary,
  devisStatutLabel,
  factureStatutLabel,
  filterEntitiesForClient,
  formatClientFicheDateTime,
  getClientFullAddress,
  getClientMailtoHref,
  getClientNotes,
  getClientPhoneHref,
  getClientTypeLabel,
  withClientNotes,
  type ClientFicheTab,
  type ClientFicheTimelineEvent,
  type ClientFicheTimelineKind,
  type ClientNote,
} from "@/lib/client-fiche";
import { getClientDisplayName } from "@/lib/clients";
import { useStore } from "@/lib/store";
import type { Client } from "@/lib/types";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  Search,
} from "lucide-react";

const TABS: { id: ClientFicheTab; label: string }[] = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "devis", label: "Devis" },
  { id: "commandes", label: "Commandes" },
  { id: "chantiers", label: "Chantiers" },
  { id: "factures", label: "Factures" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
  { id: "historique", label: "Historique" },
];

const FILTER_KINDS: { id: "all" | ClientFicheTimelineKind; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "devis", label: "Devis" },
  { id: "chantier", label: "Chantiers" },
  { id: "facture", label: "Factures" },
  { id: "note", label: "Notes" },
  { id: "document", label: "Documents" },
];

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
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
    return (
      <EmptyState message="Aucun événement dans l'historique pour le moment." />
    );
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
              {event.status ? (
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {event.status}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {event.title}
            </p>
            {event.subtitle ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {event.subtitle}
              </p>
            ) : null}
            {event.amountLabel ? (
              <p className="mt-1 text-sm font-medium text-[#2563eb]">
                {event.amountLabel}
              </p>
            ) : null}
          </div>
        );

        return (
          <li key={event.id}>
            {event.href ? <Link href={event.href}>{body}</Link> : body}
          </li>
        );
      })}
    </ul>
  );
}

export function ClientFicheView({ clientId }: { clientId: string }) {
  const { data, setData } = useStore();
  const client = data.clients.find((item) => item.id === clientId) ?? null;

  const [tab, setTab] = useState<ClientFicheTab>("overview");
  const [filterKind, setFilterKind] = useState<"all" | ClientFicheTimelineKind>(
    "all",
  );
  const [query, setQuery] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);

  const linked = useMemo(
    () => (client ? filterEntitiesForClient(data, client.id) : null),
    [client, data],
  );

  const summary = useMemo(
    () =>
      client
        ? computeClientFicheSummary(data, client.id, client)
        : null,
    [client, data],
  );

  const timeline = useMemo(
    () => (client ? buildClientFicheTimeline(data, client) : []),
    [client, data],
  );

  const filteredTimeline = useMemo(() => {
    const q = query.trim().toLowerCase();
    return timeline.filter((event) => {
      if (filterKind !== "all" && event.kind !== filterKind) return false;
      if (!q) return true;
      return (
        event.title.toLowerCase().includes(q) ||
        (event.subtitle ?? "").toLowerCase().includes(q) ||
        (event.status ?? "").toLowerCase().includes(q)
      );
    });
  }, [timeline, filterKind, query]);

  const notes = client ? getClientNotes(client) : [];
  const phoneHref = client ? getClientPhoneHref(client) : null;
  const mailHref = client ? getClientMailtoHref(client) : null;

  function updateClient(next: Client) {
    setData((prev) => ({
      ...prev,
      clients: prev.clients.map((item) =>
        item.id === next.id ? next : item,
      ),
    }));
  }

  function addNote() {
    if (!client || !noteDraft.trim()) return;
    const nextNote: ClientNote = {
      id: generateId(),
      content: noteDraft.trim(),
      createdAt: new Date().toISOString(),
    };
    updateClient(withClientNotes(client, [nextNote, ...notes]));
    setNoteDraft("");
    setShowNoteForm(false);
    setTab("notes");
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

  const documents = linked.devis.filter((item) => Boolean(item.signedPdfBase64));

  return (
    <div className="space-y-6 print:space-y-4">
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

      <Card className="border-border/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                <ClientNameDisplay client={client} />
              </h1>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {getClientTypeLabel(client)}
              </span>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {client.telephone ? (
                <p className="inline-flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {client.indicatifTelephone
                    ? `${client.indicatifTelephone} `
                    : ""}
                  {client.telephone}
                </p>
              ) : null}
              {client.email ? (
                <p className="inline-flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {client.email}
                </p>
              ) : null}
              <p className="inline-flex items-start gap-2 sm:col-span-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{getClientFullAddress(client)}</span>
              </p>
              {client.typeClient === "professionnel" && client.siret ? (
                <p className="inline-flex items-center gap-2 sm:col-span-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  SIRET {client.siret}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Créé le {formatDate(client.createdAt.slice(0, 10))}</span>
              {summary.lastActivityAt ? (
                <span>
                  Dernière activité{" "}
                  {formatClientFicheDateTime(summary.lastActivityAt).date}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            {phoneHref ? (
              <a href={phoneHref}>
                <Button type="button" size="sm" variant="secondary">
                  <Phone className="mr-1.5 h-3.5 w-3.5" />
                  Appeler
                </Button>
              </a>
            ) : null}
            {mailHref ? (
              <a href={mailHref}>
                <Button type="button" size="sm" variant="secondary">
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Envoyer un email
                </Button>
              </a>
            ) : null}
            <Link href={`/devis?clientId=${client.id}&nouveau=1`}>
              <Button type="button" size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Créer un devis
              </Button>
            </Link>
            <Link href={`/chantiers?clientId=${client.id}&nouveau=1`}>
              <Button type="button" size="sm" variant="secondary">
                Créer un chantier
              </Button>
            </Link>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNoteForm(true);
                setTab("notes");
              }}
            >
              Ajouter une note
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Devis" value={summary.devisTotal} />
        <StatCard label="Brouillons" value={summary.devisBrouillons} />
        <StatCard label="Envoyés" value={summary.devisEnvoyes} />
        <StatCard label="Signés" value={summary.devisSignes} />
        <StatCard label="Refusés" value={summary.devisRefuses} />
        <StatCard label="Commandes" value={summary.commandes} />
        <StatCard label="Chantiers en cours" value={summary.chantiersEnCours} />
        <StatCard label="Chantiers terminés" value={summary.chantiersTermines} />
        <StatCard label="Factures" value={summary.factures} />
        <StatCard
          label="Total facturé"
          value={formatCurrency(summary.montantFacture)}
        />
        <StatCard
          label="Encaissé"
          value={formatCurrency(summary.montantEncaisse)}
        />
        <StatCard
          label="Restant dû"
          value={formatCurrency(summary.montantDu)}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/70 pb-2 print:hidden">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === item.id
                ? "bg-neutral-900 text-white"
                : "bg-white text-muted-foreground hover:bg-neutral-50 hover:text-foreground"
            }`}
          >
            {item.label}
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
            <TimelineList events={filteredTimeline.slice(0, 8)} />
          </Card>
          <Card className="border-border/70 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Coordonnées</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Nom affiché</dt>
                <dd className="font-medium">{getClientDisplayName(client)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Adresse</dt>
                <dd>{getClientFullAddress(client)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Contact</dt>
                <dd>
                  {client.telephone || "—"}
                  {client.email ? ` · ${client.email}` : ""}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      ) : null}

      {tab === "devis" ? (
        <Card className="border-border/70 bg-white p-5 shadow-sm">
          {linked.devis.length === 0 ? (
            <EmptyState
              message="Aucun devis n'est encore lié à ce client."
              actionHref={`/devis?clientId=${client.id}&nouveau=1`}
              actionLabel="Créer un devis"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {linked.devis.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link
                      href={`/devis/${item.id}`}
                      className="text-sm font-semibold text-foreground hover:text-[#2563eb]"
                    >
                      {item.numero} — {item.titre}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDate((item.dateCreation ?? item.date).slice(0, 10))} ·{" "}
                      {devisStatutLabel(item.statut)}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">
                    {item.montantTTC != null
                      ? formatCurrency(item.montantTTC)
                      : "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "commandes" ? (
        <Card className="border-border/70 bg-white p-5 shadow-sm">
          {linked.commandes.length === 0 ? (
            <EmptyState message="Aucune commande n'est encore liée à ce client." />
          ) : (
            <ul className="divide-y divide-border/60">
              {linked.commandes.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link
                      href={`/commandes/${item.id}`}
                      className="text-sm font-semibold hover:text-[#2563eb]"
                    >
                      {item.numero}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.devisTitre || item.devisNumero || "—"} · {item.statut}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">
                    {formatCurrency(item.montantTTC)}
                  </p>
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
              {linked.chantiers.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link
                      href={`/chantiers/${item.id}`}
                      className="text-sm font-semibold hover:text-[#2563eb]"
                    >
                      {item.nom}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {chantierStatutLabel(item.statut)} · {item.adresse}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(item.budget)}
                  </p>
                </li>
              ))}
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
              {linked.factures.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-semibold">{item.numero}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.dateEmission.slice(0, 10))} ·{" "}
                      {factureStatutLabel(item.statut)}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">
                    {formatCurrency(
                      typeof item.montantTTC === "number"
                        ? item.montantTTC
                        : item.montant,
                    )}
                  </p>
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
                <li key={item.id} className="flex items-center justify-between gap-2 py-3">
                  <div className="inline-flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Link
                        href={`/devis/${item.id}`}
                        className="text-sm font-semibold hover:text-[#2563eb]"
                      >
                        PDF signé — {item.numero}
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.titre}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "notes" ? (
        <Card className="border-border/70 bg-white p-5 shadow-sm">
          {showNoteForm || notes.length === 0 ? (
            <div className="mb-5 space-y-3">
              <Label>Nouvelle note</Label>
              <Textarea
                rows={3}
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Note interne visible uniquement dans Batimum…"
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={addNote}>
                  Enregistrer
                </Button>
                {notes.length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNoteForm(false)}
                  >
                    Annuler
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mb-4"
              onClick={() => setShowNoteForm(true)}
            >
              Ajouter une note
            </Button>
          )}

          {notes.length === 0 ? (
            <EmptyState message="Aucune note pour ce client." />
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => {
                const { date, time } = formatClientFicheDateTime(note.createdAt);
                return (
                  <li
                    key={note.id}
                    className="rounded-xl border border-border/80 px-4 py-3"
                  >
                    <p className="text-xs text-muted-foreground">
                      {date} · {time}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {note.content}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "historique" ? (
        <Card className="border-border/70 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="flex flex-wrap gap-1.5">
              {FILTER_KINDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilterKind(item.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    filterKind === item.id
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-border bg-white text-muted-foreground hover:text-foreground"
                  }`}
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
              />
            </div>
          </div>
          <TimelineList events={filteredTimeline} />
        </Card>
      ) : null}
    </div>
  );
}
