"use client";

import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DashboardRevenueChart } from "@/components/dashboard-revenue-chart";
import { DashboardTodayDropdown } from "@/components/dashboard-today-dropdown";
import { DashboardMumIaQuotaCard } from "@/components/dashboard-mum-ia-quota-card";
import { DashboardOnboardingChecklist } from "@/components/dashboard-onboarding-checklist";
import { DashboardWelcome } from "@/components/dashboard-welcome";
import { useStore } from "@/lib/store";
import { getClientDisplayName } from "@/lib/clients";
import { devisTotal } from "@/lib/data";
import { DEVIS_STATUT_LABELS } from "@/lib/devis";
import { getDevisDisplayStatut } from "@/lib/devis-statut";
import {
  countChantiersByStatut,
  countClientsCreatedThisMonth,
  countDashboardUrgentCategories,
  getDashboardDynamicSubtitle,
  getDashboardGreetingHour,
  getDashboardGreetingName,
  getDashboardTodaySnapshot,
} from "@/lib/dashboard-today";
import {
  calculateSaasMetrics,
  getPaidInvoiceRevenueEntries,
} from "@/lib/saas-calculations";
import {
  formatCurrency,
  formatDate,
  formatDateTimeFR,
  formatTime24h,
} from "@/lib/utils";
import {
  Euro,
  FileText,
  HardHat,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

function planningEventStart(date: string, heureDebut: string) {
  return new Date(`${date}T${heureDebut}:00`);
}

export default function DashboardPage() {
  const { data, setData } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const referenceDate = mounted ? new Date() : new Date(0);
  const metrics = calculateSaasMetrics(data, referenceDate);
  const todaySnapshot = useMemo(
    () => getDashboardTodaySnapshot(data, referenceDate),
    [data, referenceDate],
  );
  const chantierStats = useMemo(
    () => countChantiersByStatut(data),
    [data],
  );
  const clientsThisMonth = useMemo(
    () => countClientsCreatedThisMonth(data, referenceDate),
    [data, referenceDate],
  );
  const urgentCategories = countDashboardUrgentCategories(todaySnapshot, data);
  const greetingName = getDashboardGreetingName(data.parametres.utilisateur);
  const greeting = getDashboardGreetingHour(referenceDate);
  const welcomeSubtitle = getDashboardDynamicSubtitle(
    urgentCategories,
    referenceDate,
  );

  const revenueEntries = useMemo(
    () => getPaidInvoiceRevenueEntries(data),
    [data],
  );
  const objectifCaMensuel = data.parametres.objectifCaMensuel ?? 15000;
  const [objectifDraft, setObjectifDraft] = useState(String(objectifCaMensuel));
  const [pendingObjectif, setPendingObjectif] = useState<number | null>(null);
  const progressionObjectif =
    objectifCaMensuel > 0
      ? Math.min(
          100,
          Math.round((metrics.chiffreAffairesMensuel / objectifCaMensuel) * 100),
        )
      : 0;

  const recentDevis = [...data.devis]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const upcomingInterventions = useMemo(() => {
    const now = new Date();
    return [...data.planning]
      .filter(
        (event) => planningEventStart(event.date, event.heureDebut) > now,
      )
      .sort(
        (a, b) =>
          planningEventStart(a.date, a.heureDebut).getTime() -
          planningEventStart(b.date, b.heureDebut).getTime(),
      )
      .slice(0, 5);
  }, [data.planning]);

  useEffect(() => {
    setObjectifDraft(String(objectifCaMensuel));
  }, [objectifCaMensuel]);

  function saveObjectifCaMensuel(value: number) {
    setData((previous) => ({
      ...previous,
      parametres: {
        ...previous.parametres,
        objectifCaMensuel: value,
      },
    }));
  }

  function requestObjectifCaMensuelSave() {
    const nextValue = Math.max(0, Number(objectifDraft));
    const safeValue = Number.isFinite(nextValue) ? nextValue : 0;
    if (safeValue === objectifCaMensuel) {
      setObjectifDraft(String(objectifCaMensuel));
      return;
    }
    setPendingObjectif(safeValue);
  }

  return (
    <div className="btp-dashboard">
      <DashboardWelcome
        greeting={greeting}
        name={greetingName}
        subtitle={welcomeSubtitle}
      />

      <DashboardOnboardingChecklist data={data} />

      <DashboardTodayDropdown data={data} />

      <DashboardMumIaQuotaCard />

      <section className="btp-dashboard-stats grid gap-5 overflow-visible sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Clients"
          value={String(metrics.totalClients)}
          helpText="Nombre total de clients enregistrés."
          details={[
            clientsThisMonth > 0
              ? `+${clientsThisMonth} ce mois`
              : "Aucun nouveau ce mois",
          ]}
          icon={Users}
        />
        <StatCard
          label="Devis"
          value={String(metrics.totalDevis)}
          helpText="Suivi des devis créés, envoyés et signés."
          details={[
            `${metrics.devisSigne} signé${metrics.devisSigne > 1 ? "s" : ""}`,
            `${metrics.devisEnvoye} envoyé${metrics.devisEnvoye > 1 ? "s" : ""}`,
            `${metrics.devisBrouillon} brouillon${metrics.devisBrouillon > 1 ? "s" : ""}`,
          ]}
          icon={FileText}
        />
        <StatCard
          label="Chantiers"
          value={String(chantierStats.total)}
          helpText="Vue rapide des chantiers en cours ou en retard."
          details={[
            chantierStats.enRetard > 0
              ? `${chantierStats.enRetard} en retard`
              : "Aucun retard",
            `${chantierStats.enCours} en cours`,
          ]}
          icon={HardHat}
        />
        <StatCard
          label="CA mensuel"
          value={formatCurrency(metrics.chiffreAffairesMensuel)}
          helpText="Chiffre d'affaires encaissé ce mois-ci."
          sub={`${progressionObjectif}% de l'objectif`}
          icon={Euro}
        />
        <StatCard
          label="Factures"
          value={String(metrics.totalFactures)}
          helpText="Suivi des factures payées et impayées."
          details={[
            `${metrics.facturesPayees} payée${metrics.facturesPayees > 1 ? "s" : ""}`,
            `${metrics.facturesImpayees} impayée${metrics.facturesImpayees > 1 ? "s" : ""}`,
          ]}
          icon={Receipt}
        />
      </section>

      <section className="btp-dashboard-panels mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <DashboardRevenueChart
          revenueEntries={revenueEntries}
          objectifCaMensuel={objectifCaMensuel}
          objectifDraft={objectifDraft}
          onObjectifDraftChange={setObjectifDraft}
          onObjectifBlur={requestObjectifCaMensuelSave}
        />

        <Card className="btp-card-interactive">
          <header className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Derniers devis
            </h2>
            <Link
              href="/devis"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
            >
              Voir tout
            </Link>
          </header>
          <ul className="space-y-3">
            {recentDevis.map((d) => {
              const client = data.clients.find((c) => c.id === d.clientId);
              const displayStatut = getDevisDisplayStatut(d);
              return (
                <li key={d.id}>
                  <Link
                    href={`/devis/${d.id}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card-elevated/40 px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:bg-card-hover/55 hover:shadow-card sm:flex-row sm:items-center sm:justify-between"
                  >
                    <section className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-foreground/85">
                        {d.titre}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {getClientDisplayName(client)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                        {formatDate(d.date)}
                      </p>
                    </section>
                    <section className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(devisTotal(d))}
                      </p>
                      <Badge
                        label={DEVIS_STATUT_LABELS[displayStatut]}
                        status={displayStatut}
                      />
                    </section>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="btp-dashboard-panel-wide btp-card-interactive lg:col-span-2">
          <header className="mb-5 flex items-center gap-2.5">
            <TrendingUp className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <h2 className="text-base font-semibold tracking-tight">
              Prochaines interventions
            </h2>
          </header>
          <ul className="space-y-3">
            {upcomingInterventions.length === 0 ? (
              <li className="rounded-xl border border-border/60 bg-card-elevated/40 px-4 py-3 text-sm text-muted-foreground">
                Aucune intervention à venir.
              </li>
            ) : (
              upcomingInterventions.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-card-elevated/40 px-4 py-3 transition-all duration-300 hover:border-border hover:bg-card-hover/50"
                >
                  <section>
                    <p className="text-sm font-medium text-foreground">{e.titre}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTimeFR(e.date, e.heureDebut)}–
                      {formatTime24h(e.heureFin)}
                    </p>
                  </section>
                  <Badge label={e.type} status={e.type} />
                </li>
              ))
            )}
          </ul>
          <Link
            href="/planning"
            className="mt-5 inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            Ouvrir le planning
          </Link>
        </Card>
      </section>

      <ConfirmDialog
        open={pendingObjectif !== null}
        message={`Confirmer le nouvel objectif mensuel de ${
          pendingObjectif !== null ? formatCurrency(pendingObjectif) : ""
        } ?`}
        confirmLabel="Confirmer"
        onCancel={() => {
          setPendingObjectif(null);
          setObjectifDraft(String(objectifCaMensuel));
        }}
        onConfirm={() => {
          if (pendingObjectif !== null) saveObjectifCaMensuel(pendingObjectif);
          setPendingObjectif(null);
        }}
      />
    </div>
  );
}
