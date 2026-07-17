"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { EmployeAvatar } from "@/components/employe-avatar";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { getEmployeDetailModel } from "@/lib/pilotage";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDateFR } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default function PilotageEmployePage() {
  const params = useParams();
  const employeId = String(params?.id ?? "");
  const { data } = useStore();

  const model = useMemo(
    () => getEmployeDetailModel(data, employeId),
    [data, employeId],
  );

  if (!model) {
    return (
      <div className="btp-app-page mx-auto w-full max-w-4xl space-y-4">
        <PageHeader title="Employé introuvable" description="" />
        <ButtonLink href="/pilotage" variant="secondary">
          Retour au pilotage
        </ButtonLink>
      </div>
    );
  }

  const { employe, classement, historique, typesFavoris, coutSalarial } = model;

  const evolutionMensuelle = (() => {
    const map = new Map<string, number>();
    for (const row of historique) {
      const key = row.date.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + row.heures);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, heures]) => ({
        label: new Date(`${month}-01`).toLocaleDateString("fr-FR", {
          month: "short",
        }),
        heures,
      }));
  })();

  const maxHeures = Math.max(...evolutionMensuelle.map((p) => p.heures), 1);

  return (
    <div className="btp-app-page mx-auto w-full max-w-4xl space-y-6">
      <div>
        <Link
          href="/pilotage"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Pilotage
        </Link>
      </div>

      <Card className="border-border/60 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <EmployeAvatar employe={employe} size="lg" />
          <div>
            <h1 className="text-2xl font-semibold">
              {employe.prenom} {employe.nom}
            </h1>
            <p className="text-sm text-muted-foreground">
              {employe.poste || "Collaborateur"}
              {employe.telephone ? ` · ${employe.telephone}` : ""}
            </p>
            {employe.specialitePrincipale ? (
              <p className="mt-1 text-xs text-emerald-700">
                Spécialité : {employe.specialitePrincipale}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Rentabilité</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {classement ? `${classement.rentabilitePct.toFixed(0)} %` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">CA généré</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {classement ? formatCurrency(classement.caGenere) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Heures</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {classement ? `${classement.heures} h` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Marge</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {classement ? formatCurrency(classement.marge) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Coût salarial estimé</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatCurrency(coutSalarial)}
            </p>
            {!(employe.coutHoraireInterne || data.parametres.tauxHoraireInterneDefaut) ? (
              <p className="mt-1 text-[10px] text-amber-700">Estimation</p>
            ) : null}
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Temps perdu</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {classement ? `${classement.heuresPerdues} h` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Retards</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {classement?.retards ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Chantiers terminés</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {classement?.chantiersTermines ?? 0}
            </p>
          </div>
        </div>
      </Card>

      <Card className="border-border/60 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Évolution mensuelle (heures)</h2>
        {evolutionMensuelle.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Pas encore assez de pointages pour tracer une évolution.
          </p>
        ) : (
          <div className="mt-4 flex h-28 items-end gap-2">
            {evolutionMensuelle.map((point) => (
              <div
                key={point.label}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
              >
                <div
                  className="w-full rounded-t-md bg-emerald-500/80"
                  style={{
                    height: `${Math.max(8, (point.heures / maxHeures) * 100)}%`,
                  }}
                  title={`${point.heures} h`}
                />
                <span className="truncate text-[10px] text-muted-foreground">
                  {point.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="border-border/60 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Types de chantier favoris</h2>
        <ul className="mt-3 space-y-2">
          {typesFavoris.map((type) => (
            <li
              key={type.label}
              className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm"
            >
              <span>{type.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {type.heures} h
              </span>
            </li>
          ))}
          {typesFavoris.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Pas encore assez de pointages pour identifier les types favoris.
            </li>
          ) : null}
        </ul>
      </Card>

      <Card className="border-border/60 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Historique des pointages</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Chantier</th>
                <th className="px-2 py-2">Tâche</th>
                <th className="px-2 py-2">Heures</th>
              </tr>
            </thead>
            <tbody>
              {historique.slice(0, 40).map((row) => (
                <tr key={row.id} className="border-t border-border/50">
                  <td className="px-2 py-2">{formatDateFR(row.date)}</td>
                  <td className="px-2 py-2">{row.chantierNom}</td>
                  <td className="px-2 py-2 capitalize">{row.typeTache}</td>
                  <td className="px-2 py-2 tabular-nums">{row.heures} h</td>
                </tr>
              ))}
            </tbody>
          </table>
          {historique.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun pointage enregistré.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
