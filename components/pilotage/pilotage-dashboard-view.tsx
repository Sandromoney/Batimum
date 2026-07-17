"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmployeAvatar } from "@/components/employe-avatar";
import { PilotageOnboardingCard } from "@/components/pilotage-onboarding-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import {
  buildPilotageDashboard,
  type PilotagePeriod,
} from "@/lib/pilotage";
import { getPilotageReadiness } from "@/lib/pilotage/readiness";
import { cn, formatCurrency } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Building2,
  HardHat,
  Percent,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const KPI_ICONS: Record<string, LucideIcon> = {
  ca: Wallet,
  marge: TrendingUp,
  rentabilite: Percent,
  chantiers: HardHat,
  alertes: AlertTriangle,
  presents: Users,
};

const KPI_TONES: Record<string, string> = {
  positive: "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40",
  warning: "border-amber-100 bg-gradient-to-br from-white to-amber-50/30",
  neutral: "border-border/60 bg-white",
};

function VariationBadge({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        up ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800",
      )}
    >
      {up ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5" />
      )}
      {up ? "+" : ""}
      {value} %
    </span>
  );
}

function CountUp({ value }: { value: string }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(value);
      return;
    }

    const isPct = /^-?\d+(\.\d+)?\s*%$/.test(value.trim());
    const isInt = /^-?\d+$/.test(value.trim());
    if (!isPct && !isInt) {
      setShown("…");
      const timer = window.setTimeout(() => setShown(value), 220);
      return () => window.clearTimeout(timer);
    }

    const target = Number.parseFloat(value);
    let frame = 0;
    const frames = 22;
    const id = window.setInterval(() => {
      frame += 1;
      const eased = 1 - Math.pow(1 - frame / frames, 3);
      const current = Math.round(target * eased);
      setShown(isPct ? `${current} %` : String(current));
      if (frame >= frames) {
        window.clearInterval(id);
        setShown(value);
      }
    }, 24);
    return () => window.clearInterval(id);
  }, [value]);
  return <span className="tabular-nums">{shown}</span>;
}

function MiniBars({
  points,
  color = "emerald",
}: {
  points: Array<{ label: string; value: number }>;
  color?: "emerald" | "amber" | "slate";
}) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const bar =
    color === "amber"
      ? "bg-amber-400/80"
      : color === "slate"
        ? "bg-slate-400/70"
        : "bg-emerald-500/80";
  return (
    <div className="flex h-32 items-end gap-1.5">
      {points.map((point, index) => (
        <div
          key={`${point.label}-${index}`}
          className="flex min-w-0 flex-1 flex-col items-center gap-1"
        >
          <div
            className={cn("pilotage-bar w-full rounded-t-md", bar)}
            style={{
              height: `${Math.max(8, (Math.max(0, point.value) / max) * 100)}%`,
              animationDelay: `${index * 40}ms`,
            }}
            title={`${point.label}: ${point.value}`}
          />
          <span className="truncate text-[10px] text-muted-foreground">
            {point.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChantierMetricCard({
  title,
  items,
  watch,
}: {
  title: string;
  items: ReturnType<typeof buildPilotageDashboard>["chantiersRentables"];
  watch?: boolean;
}) {
  return (
    <Card
      className={cn(
        "pilotage-reveal border-border/60 bg-white p-5 shadow-sm",
        watch && "border-amber-100",
      )}
    >
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/chantiers/${item.id}`}
              className={cn(
                "block rounded-xl border px-3 py-2.5 transition-colors",
                watch
                  ? "border-amber-200/70 bg-amber-50/40 hover:border-amber-300"
                  : "border-border/50 hover:border-emerald-300",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-medium">{item.nom}</p>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    watch ? "text-amber-800" : "text-emerald-700",
                  )}
                >
                  {item.margePct} %
                </span>
              </div>
              {item.motif ? (
                <p className="mt-0.5 text-xs text-amber-800">{item.motif}</p>
              ) : null}
              <dl className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground sm:grid-cols-6">
                <div>
                  <dt>CA</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {formatCurrency(item.ca)}
                  </dd>
                </div>
                <div>
                  <dt>Marge</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {formatCurrency(item.marge)}
                  </dd>
                </div>
                <div>
                  <dt>Dépass.</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {formatCurrency(item.depassement)}
                  </dd>
                </div>
                <div>
                  <dt>Temps</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {item.tempsReel} h
                  </dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {formatCurrency(item.budget)}
                  </dd>
                </div>
                <div>
                  <dt>Prévu</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {item.tempsPrevu} h
                  </dd>
                </div>
              </dl>
              {item.estimation ? (
                <p className="mt-1 text-[10px] text-amber-700">Estimation</p>
              ) : null}
            </Link>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">Pas encore de données.</li>
        ) : null}
      </ul>
    </Card>
  );
}

export function PilotageDashboardView() {
  const { data } = useStore();
  const [period, setPeriod] = useState<PilotagePeriod>("30d");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const model = useMemo(
    () => buildPilotageDashboard(data, { period }),
    [data, period],
  );
  const readiness = useMemo(() => getPilotageReadiness(data), [data]);

  return (
    <div className={cn("space-y-6", mounted ? "pilotage-ready" : "opacity-0")}>
      {!readiness.isActionable ? (
        <PilotageOnboardingCard readiness={readiness} />
      ) : null}

      {/* Hero — compact premium */}
      <section className="pilotage-reveal relative overflow-hidden rounded-[22px] border border-emerald-100/80 bg-[linear-gradient(145deg,#ffffff_0%,#f0fdf4_48%,#ffffff_100%)] px-4 py-3.5 shadow-[0_8px_28px_rgba(16,185,129,0.06)] sm:px-5 sm:py-4">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-200/15 blur-3xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <p className="text-xs font-medium text-emerald-800">
              Bonjour {model.greetingName} 👋
            </p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Aujourd&apos;hui votre entreprise fonctionne à{" "}
              <span className="text-emerald-700">
                <CountUp value={`${model.potentielPct} %`} />
              </span>{" "}
              <span className="font-medium text-muted-foreground">
                de son potentiel.
              </span>
            </h1>
          </div>
        </div>

        <div className="relative mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/80 bg-white/75 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Objectif mensuel
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${model.objectifPct}%` }}
              />
            </div>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {model.objectifPct} %
            </p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/75 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Prévision fin de mois
            </p>
            <p className="mt-1.5 text-base font-semibold tabular-nums sm:text-lg">
              <CountUp value={formatCurrency(model.previsionFinMois)} />
            </p>
            {model.forecast.estimation ? (
              <span className="mt-0.5 inline-flex text-[10px] font-medium text-amber-700">
                Estimation
              </span>
            ) : (
              <p className="mt-0.5 text-[10px] text-muted-foreground">CA estimé</p>
            )}
          </div>
          <div className="rounded-xl border border-white/80 bg-white/75 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Objectif CA
            </p>
            <p className="mt-1.5 text-base font-semibold tabular-nums sm:text-lg">
              {formatCurrency(model.objectifCa)}
            </p>
          </div>
        </div>
      </section>

      {/* KPI */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {model.kpis.map((kpi, index) => {
          const Icon = KPI_ICONS[kpi.id] ?? TrendingUp;
          return (
            <div
              key={kpi.id}
              className="pilotage-reveal"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <Card
                className={cn(
                  "border p-3.5 shadow-sm",
                  KPI_TONES[kpi.tone] ?? KPI_TONES.neutral,
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-xs font-medium text-muted-foreground">
                      {kpi.label}
                    </p>
                  </div>
                  <VariationBadge value={kpi.variationPct} />
                </div>
                <p className="mt-2.5 text-2xl font-semibold tracking-tight text-foreground">
                  <CountUp value={kpi.value} />
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {kpi.comparisonLabel}
                </p>
                {kpi.estimation ? (
                  <p className="mt-1 text-[10px] text-amber-800">
                    Estimation
                    {kpi.estimationHint ? ` — ${kpi.estimationHint}` : ""}
                  </p>
                ) : null}
              </Card>
            </div>
          );
        })}
      </section>

      {/* Graphiques */}
      <Card className="pilotage-reveal border-border/60 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Évolutions</h2>
            <p className="text-xs text-muted-foreground">
              CA, marge, rentabilité, temps
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["7d", "7 jours"],
                ["30d", "30 jours"],
                ["90d", "90 jours"],
                ["12m", "12 mois"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={period === id ? "primary" : "secondary"}
                className="h-8 rounded-lg"
                onClick={() => setPeriod(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">CA</p>
            <MiniBars
              points={model.series.map((p) => ({ label: p.label, value: p.ca }))}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Marge</p>
            <MiniBars
              points={model.series.map((p) => ({
                label: p.label,
                value: Math.max(0, p.marge),
              }))}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Rentabilité
            </p>
            <MiniBars
              points={model.series.map((p) => ({
                label: p.label,
                value: Math.max(0, p.rentabilite),
              }))}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Temps travaillé
            </p>
            <MiniBars
              points={model.series.map((p) => ({
                label: p.label,
                value: p.tempsTravaille,
              }))}
              color="slate"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Temps perdu
            </p>
            <MiniBars
              points={model.series.map((p) => ({
                label: p.label,
                value: p.tempsPerdu,
              }))}
              color="amber"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Heures pointées
            </p>
            <MiniBars
              points={model.series.map((p) => ({
                label: p.label,
                value: p.heuresPointees,
              }))}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="pilotage-reveal border-border/60 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Aujourd&apos;hui</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Timeline intelligente
          </p>
          <div className="mt-4 space-y-3">
            {model.timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun événement pour le moment — la journée commence.
              </p>
            ) : (
              model.timeline.map((event) => (
                <div key={event.id} className="flex gap-3">
                  <span className="w-12 shrink-0 pt-2 text-xs font-medium tabular-nums text-muted-foreground">
                    {event.time}
                  </span>
                  <div
                    className={cn(
                      "min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm",
                      event.tone === "warning"
                        ? "border-amber-200 bg-amber-50/50"
                        : event.tone === "positive"
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-border/60 bg-white",
                    )}
                  >
                    {event.label}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="pilotage-reveal border-border/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold">Alertes importantes</h2>
          </div>
          <ul className="mt-4 space-y-2">
            {model.alertes.map((alerte) => (
              <li
                key={alerte.id}
                className="rounded-xl border border-amber-200/70 bg-amber-50/40 px-3 py-2.5 text-sm"
              >
                {alerte.message}
              </li>
            ))}
            {model.alertes.length === 0 ? (
              <li className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5 text-sm text-emerald-800">
                Rien d&apos;urgent — bon rythme.
              </li>
            ) : null}
          </ul>
        </Card>
      </div>

      {/* Employés */}
      <Card className="pilotage-reveal border-border/60 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-semibold">Classement des employés</h2>
          </div>
          <p className="text-xs text-muted-foreground">Cliquez pour ouvrir la fiche</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-2 py-2">Employé</th>
                <th className="px-2 py-2">CA généré</th>
                <th className="px-2 py-2">Rentabilité</th>
                <th className="px-2 py-2">Marge</th>
                <th className="px-2 py-2">Heures</th>
                <th className="px-2 py-2">Retards</th>
                <th className="px-2 py-2">Temps perdu</th>
              </tr>
            </thead>
            <tbody>
              {model.employes.map((row) => (
                <tr
                  key={row.employe.id}
                  className="border-t border-border/50 transition-colors hover:bg-emerald-50/30"
                >
                  <td className="px-2 py-3">
                    <Link
                      href={`/pilotage/employes/${row.employe.id}`}
                      className="inline-flex items-center gap-2.5 font-medium hover:text-emerald-700"
                    >
                      <EmployeAvatar employe={row.employe} size="sm" />
                      {row.employe.prenom} {row.employe.nom}
                    </Link>
                  </td>
                  <td className="px-2 py-3 tabular-nums">
                    {formatCurrency(row.caGenere)}
                  </td>
                  <td className="px-2 py-3 tabular-nums">
                    {row.rentabilitePct.toFixed(0)} %
                    {row.estimation ? (
                      <span className="ml-1 text-[10px] text-amber-700">Est.</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-3 tabular-nums">
                    {formatCurrency(row.marge)}
                  </td>
                  <td className="px-2 py-3 tabular-nums">{row.heures} h</td>
                  <td className="px-2 py-3 tabular-nums">{row.retards}</td>
                  <td className="px-2 py-3 tabular-nums">{row.heuresPerdues} h</td>
                </tr>
              ))}
            </tbody>
          </table>
          {model.employes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun pointage pour construire le classement.
            </p>
          ) : null}
        </div>
      </Card>

      {/* Métiers */}
      <Card className="pilotage-reveal border-border/60 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-700" />
          <h2 className="text-sm font-semibold">Meilleur employé par métier</h2>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {model.metiers.map((metier) => (
            <div
              key={metier.categorie}
              className="rounded-2xl border border-border/60 px-3 py-3"
            >
              <p className="text-xs text-muted-foreground">{metier.label}</p>
              <p className="mt-1 text-sm font-semibold">
                🥇 {metier.employe?.prenom} {metier.employe?.nom}
              </p>
              <p className="mt-0.5 text-xs font-medium text-emerald-700">
                {metier.rentabilitePct.toFixed(0)} %
              </p>
            </div>
          ))}
          {model.metiers.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Pas assez de données métier pour un podium.
            </p>
          ) : null}
        </div>
      </Card>

      {/* Chantiers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChantierMetricCard
          title="🏆 Top rentabilité"
          items={model.chantiersRentables}
        />
        <ChantierMetricCard
          title="⚠ À surveiller"
          items={model.chantiersSurveillance}
          watch
        />
      </div>

      {/* Fournisseurs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="pilotage-reveal border-border/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-semibold">Comparatif fournisseurs</h2>
          </div>
          <ul className="mt-4 space-y-2">
            {model.fournisseurs.map((row) => (
              <li
                key={row.nom}
                className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5 text-sm"
              >
                <span className="font-medium">{row.nom}</span>
                <span className="tabular-nums">{formatCurrency(row.totalHT)}</span>
              </li>
            ))}
            {model.fournisseurs.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Aucun achat enregistré sur les chantiers.
              </li>
            ) : null}
          </ul>
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <Bot className="h-3.5 w-3.5" />
              Pilotage
            </p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              {model.fournisseurInsights.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <Link
              href="/parametres/bibliotheque?tab=comparatif"
              className="mt-3 inline-block text-xs font-medium text-emerald-700 hover:underline"
            >
              Ouvrir le comparatif de prix →
            </Link>
          </div>
        </Card>

        <Card className="pilotage-reveal border-border/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-semibold">Prévision</h2>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/60 p-3">
              <dt className="text-xs text-muted-foreground">CA fin de mois</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {formatCurrency(model.forecast.ca)}
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <dt className="text-xs text-muted-foreground">Marge</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {model.forecast.margePct} %
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <dt className="text-xs text-muted-foreground">Résultat</dt>
              <dd className="mt-1 text-lg font-semibold">{model.forecast.resultat}</dd>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <dt className="text-xs text-muted-foreground">Objectif</dt>
              <dd className="mt-1 text-lg font-semibold">
                {model.forecast.objectifAtteint ? "✔ atteint" : "En cours"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Trésorerie : {model.forecast.tresorerie}
            {model.forecast.estimation ? " · Estimation" : ""}
          </p>
        </Card>
      </div>

      {/* Types */}
      <Card className="pilotage-reveal border-border/60 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <HardHat className="h-4 w-4 text-emerald-700" />
          <h2 className="text-sm font-semibold">Rentabilité par type de chantier</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {model.types.map((type) => {
            const best = model.metiers.find((m) => m.categorie === type.categorie);
            return (
              <div
                key={type.categorie}
                className="rounded-2xl border border-border/60 bg-white p-4"
              >
                <p className="font-semibold text-foreground">{type.label}</p>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">CA moyen</dt>
                    <dd className="tabular-nums">
                      {formatCurrency(
                        type.nombreChantiers > 0
                          ? type.caTotalHT / type.nombreChantiers
                          : 0,
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Marge</dt>
                    <dd className="tabular-nums">
                      {type.rentabiliteMoyenne.toFixed(0)} %
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Temps moyen</dt>
                    <dd className="tabular-nums">
                      {type.tempsMoyenReel.toFixed(1)} h
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Meilleur employé</dt>
                    <dd>{best?.employe ? best.employe.prenom : "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Fournisseur principal</dt>
                    <dd className="truncate text-right">
                      {model.typeFournisseurs[type.categorie] ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Chantiers</dt>
                    <dd className="tabular-nums">{type.nombreChantiers}</dd>
                  </div>
                </dl>
                {type.donneeAConfirmer ? (
                  <p className="mt-2 text-[10px] font-medium text-amber-700">
                    Estimation — données limitées
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Assistant analyse */}
      <Card className="pilotage-reveal overflow-hidden border-emerald-100 bg-[linear-gradient(160deg,#ffffff_0%,#f0fdf4_100%)] p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-700" />
          <h2 className="text-base font-semibold">
            Pilotage — Analyse du mois
          </h2>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-foreground/90">
          {model.assistantAnalyse.map((line) => (
            <li
              key={line}
              className="rounded-xl border border-white/70 bg-white/70 px-3 py-2.5"
            >
              {line}
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            3 conseils
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
            {model.assistantConseils.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
      </Card>
    </div>
  );
}
