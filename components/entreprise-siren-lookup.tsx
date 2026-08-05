"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  CompanyPrefillFields,
  LookupSuccess,
  OfficialCompanyLookup,
  OfficialEstablishment,
} from "@/lib/entreprise/annuaire-lookup";
import { toPrefillFields } from "@/lib/entreprise/annuaire-lookup";
import {
  formatSirenSiretDisplay,
  normalizeSirenSiretInput,
  validateSirenSiretInput,
} from "@/lib/entreprise/siren-siret";

export type EntrepriseSirenLookupProps = {
  /** Appelé uniquement après confirmation explicite « Utiliser ces informations ». */
  onApply: (fields: CompanyPrefillFields) => void;
  /** Si true, demande confirmation avant d'écraser des champs déjà remplis. */
  hasExistingData?: boolean;
  /** Affiche le bouton d'actualisation (Paramètres). */
  showRefresh?: boolean;
  lastCheckedAt?: string | null;
  /** Valeur initiale (SIREN/SIRET déjà connu). */
  initialValue?: string;
  className?: string;
  /** Variante compacte pour onboarding. */
  compact?: boolean;
  /** Met l'accent sur le SIRET (inscription). */
  preferSiret?: boolean;
};

function formatAddress(etab: OfficialEstablishment): string {
  const line = [etab.addressLine1, etab.addressLine2].filter(Boolean).join(", ");
  const city = [etab.postalCode, etab.city].filter(Boolean).join(" ");
  return [line, city].filter(Boolean).join(" — ") || "Adresse non renseignée";
}

function formatCheckedAt(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EntrepriseSirenLookup({
  onApply,
  hasExistingData = false,
  showRefresh = false,
  lastCheckedAt,
  initialValue = "",
  className,
  compact = false,
  preferSiret = false,
}: EntrepriseSirenLookupProps) {
  const inputId = useId();
  const [value, setValue] = useState(() => {
    const digits = normalizeSirenSiretInput(initialValue);
    return digits ? formatSirenSiretDisplay(digits) : "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [result, setResult] = useState<LookupSuccess | null>(null);
  const [selectedSiret, setSelectedSiret] = useState<string | null>(null);
  const [closedConfirm, setClosedConfirm] = useState(false);
  const [overwriteConfirm, setOverwriteConfirm] = useState(false);

  const company = result?.company ?? null;
  const selected =
    company?.establishments.find((e) => e.siret === selectedSiret) ?? null;
  const multi =
    Boolean(company) && (company?.establishments.length ?? 0) > 1;
  const needsClosedConfirm =
    selected?.status === "ferme" || company?.companyStatus === "ferme";

  async function runLookup(raw: string) {
    setError("");
    setInfo("");
    setOverwriteConfirm(false);
    setClosedConfirm(false);

    const validation = validateSirenSiretInput(raw);
    if (!validation.ok) {
      setResult(null);
      setSelectedSiret(null);
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/entreprise/lookup?q=${encodeURIComponent(validation.digits)}`,
        { method: "GET", headers: { Accept: "application/json" } },
      );
      const data = (await response.json()) as
        | LookupSuccess
        | {
            ok: false;
            error?: string;
            allowManual?: boolean;
          };

      if (!data.ok) {
        setResult(null);
        setSelectedSiret(null);
        setError(
          data.error ||
            "Recherche impossible. Vous pouvez saisir les informations manuellement.",
        );
        return;
      }

      setResult(data);
      setSelectedSiret(data.company.preselectedSiret);
      setValue(formatSirenSiretDisplay(validation.digits));

      if (data.company.diffusionPartielle) {
        setInfo(
          "Certaines informations de cette entreprise sont en diffusion partielle dans le répertoire officiel.",
        );
      } else if (
        data.queryKind === "siren" &&
        (data.company.nombreEtablissementsOuverts ?? 0) > 1 &&
        data.company.establishments.length <= 1
      ) {
        setInfo(
          `Cette entreprise compte ${data.company.nombreEtablissementsOuverts} établissements ouverts. Le siège est proposé ; saisissez le SIRET de l'établissement concerné pour le sélectionner précisément.`,
        );
      } else if (multi) {
        setInfo(
          "Plusieurs établissements correspondent. Sélectionnez celui utilisé par Batimum.",
        );
      }
    } catch {
      setResult(null);
      setSelectedSiret(null);
      setError(
        "Le répertoire officiel est temporairement indisponible. Vous pouvez saisir les informations manuellement.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    void runLookup(value);
  }

  function applySelected() {
    if (!company || !selected || !result) return;

    if (needsClosedConfirm && !closedConfirm) {
      setError("");
      setInfo(
        "Cet établissement est déclaré fermé dans le répertoire officiel. Confirmez pour continuer, ou choisissez un autre établissement actif.",
      );
      setClosedConfirm(true);
      return;
    }

    if (hasExistingData && !overwriteConfirm) {
      setOverwriteConfirm(true);
      setInfo(
        "Des informations entreprise sont déjà renseignées. Confirmez pour les remplacer par les données officielles.",
      );
      return;
    }

    const fields = toPrefillFields(company, selected, result.checkedAt);
    onApply(fields);
    setOverwriteConfirm(false);
    setClosedConfirm(false);
    setInfo("Informations officielles appliquées. Vous pouvez encore les corriger manuellement.");
  }

  function selectEstablishment(etab: OfficialEstablishment) {
    setSelectedSiret(etab.siret);
    setClosedConfirm(false);
    setOverwriteConfirm(false);
    setError("");
    if (etab.status === "ferme") {
      setInfo(
        "Cet établissement est déclaré fermé dans le répertoire officiel.",
      );
    } else {
      setInfo("");
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-4 text-neutral-900 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            {preferSiret
              ? "Numéro SIRET"
              : "Recherche officielle SIREN / SIRET"}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            {preferSiret
              ? "Je saisis mon numéro, Batimum s'occupe du reste."
              : "Préremplissage via l'Annuaire des Entreprises (data.gouv.fr)."}
          </p>
        </div>
        {showRefresh && lastCheckedAt ? (
          <p className="text-[11px] text-neutral-400">
            Vérifié le {formatCheckedAt(lastCheckedAt)}
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSearch} className="mt-4 space-y-2">
        <Label htmlFor={inputId}>
          {preferSiret ? "Numéro SIRET" : "Numéro SIREN ou SIRET"}
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={inputId}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError("");
            }}
            inputMode="numeric"
            autoComplete="off"
            placeholder={preferSiret ? "123 456 789 00012" : "123 456 789"}
            className="border-neutral-200 bg-white text-neutral-900 focus-visible:ring-[#2563eb]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !normalizeSirenSiretInput(value)}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition",
              "bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Recherche…
              </>
            ) : showRefresh && result ? (
              <>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Actualiser
              </>
            ) : (
              "Rechercher"
            )}
          </button>
        </div>
        <p className="text-[11px] text-neutral-400">
          {preferSiret
            ? "14 chiffres — les espaces sont acceptés et normalisés automatiquement."
            : "Ex. 123 456 789 ou 123 456 789 00012"}
        </p>
      </form>

      {loading ? (
        <div
          className="mt-4 flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-3 text-sm text-neutral-600"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin text-[#2563eb]" aria-hidden />
          Interrogation du répertoire officiel…
        </div>
      ) : null}

      {error ? (
        <p
          className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800"
          role="alert"
        >
          {error}
          <span className="mt-1 block text-xs text-neutral-500">
            L&apos;inscription n&apos;est pas bloquée : saisissez les champs
            manuellement ci-dessous.
          </span>
        </p>
      ) : null}

      {info ? (
        <p className="mt-3 rounded-lg border border-[#2563eb]/25 bg-[#2563eb]/5 px-3 py-2 text-sm text-neutral-800">
          {info}
        </p>
      ) : null}

      {company && selected ? (
        <CompanyResultCard
          company={company}
          selected={selected}
          multi={multi}
          compact={compact}
          onSelect={selectEstablishment}
          onApply={applySelected}
          applyLabel={
            needsClosedConfirm && closedConfirm
              ? "Confirmer malgré la fermeture"
              : overwriteConfirm
                ? "Confirmer le remplacement"
                : "Utiliser ces informations"
          }
        />
      ) : null}

      {showRefresh && !result && lastCheckedAt ? (
        <button
          type="button"
          onClick={() => {
            const digits = normalizeSirenSiretInput(value);
            if (digits) void runLookup(digits);
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#2563eb] hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Actualiser depuis les données officielles
        </button>
      ) : null}
    </div>
  );
}

function CompanyResultCard({
  company,
  selected,
  multi,
  compact,
  onSelect,
  onApply,
  applyLabel,
}: {
  company: OfficialCompanyLookup;
  selected: OfficialEstablishment;
  multi: boolean;
  compact?: boolean;
  onSelect: (etab: OfficialEstablishment) => void;
  onApply: () => void;
  applyLabel: string;
}) {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-white">
            <Check className="h-3 w-3" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-900">
              Entreprise trouvée
            </p>
            <p className="mt-1 truncate text-sm text-neutral-900">
              {company.companyName || "Raison sociale non disponible"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {formatAddress(selected)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              SIRET {selected.siretDisplay}
              {selected.isSiege ? " · Siège" : ""}
              {selected.status === "ferme" ? " · Fermé" : ""}
            </p>
            {(selected.apeCode || company.apeCode || company.activityLabel) && (
              <p className="mt-1 text-xs text-neutral-500">
                Activité{" "}
                {company.activityLabel ||
                  selected.activityLabel ||
                  selected.apeCode ||
                  company.apeCode}
              </p>
            )}
          </div>
        </div>
      </div>

      {multi ? (
        <ul className={cn("space-y-2", compact && "max-h-56 overflow-y-auto")}>
          {company.establishments.map((etab) => {
            const active = etab.siret === selected.siret;
            return (
              <li key={etab.siret}>
                <button
                  type="button"
                  onClick={() => onSelect(etab)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                    active
                      ? "border-[#2563eb] bg-[#2563eb]/5"
                      : "border-neutral-200 bg-white hover:border-neutral-300",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      active
                        ? "border-[#2563eb] bg-[#2563eb] text-white"
                        : "border-neutral-300 bg-white",
                    )}
                  >
                    {active ? <Check className="h-3 w-3" aria-hidden /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-neutral-900">
                      {etab.siretDisplay}
                      {etab.isSiege ? (
                        <span className="ml-2 text-[11px] font-semibold text-[#2563eb]">
                          Siège
                        </span>
                      ) : (
                        <span className="ml-2 text-[11px] font-medium text-neutral-400">
                          Établissement
                        </span>
                      )}
                      {etab.status === "ferme" ? (
                        <span className="ml-2 text-[11px] font-medium text-neutral-500">
                          Fermé
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-500">
                      {formatAddress(etab)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selected.status === "ferme" || company.companyStatus === "ferme" ? (
        <p className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          Cet établissement est déclaré fermé dans le répertoire officiel.
          Choisissez un autre établissement actif, ou confirmez explicitement
          pour continuer.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onApply}
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] sm:w-auto"
      >
        {applyLabel}
      </button>
    </div>
  );
}
