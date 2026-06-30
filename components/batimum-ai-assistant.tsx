"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import {
  computeAiDevisTotalHT,
  computeAiSectionSubtotal,
  createDevisBrouillonFromAi,
  normalizeAiDevisResult,
  type AiDevisResult,
} from "@/lib/ai-devis";
import type { AiChantierAnalysis } from "@/lib/ai-devis-analysis";
import type { BtpNiveauPrix } from "@/lib/btp-tarifs-reference";
import {
  canUseAiGeneration,
  resolveAiQuota,
  type AiQuotaState,
} from "@/lib/ai-quota";
import {
  filterAiDevisForClientView,
  isMumIaInterneMode,
  type MumIaViewMode,
} from "@/lib/mum-ia-mode";
import { MumIaConseilsCard } from "@/components/mum-ia-conseils-card";
import { MumIaOptionalDetailsPanel } from "@/components/mum-ia-optional-details-panel";
import { MumIaHistoriqueSection } from "@/components/mum-ia-historique-section";
import {
  buildMumIaReponsesQuestions,
  EMPTY_MUM_IA_STANDARD_DETAILS,
  type MumIaStandardDetails,
} from "@/lib/mum-ia-optional-details";
import { buildMumIaConseils } from "@/lib/mum-ia-conseils";
import { buildMumIaDevisTitre } from "@/lib/mum-ia-titre";
import {
  createMumIaHistoriqueEntry,
  markMumIaHistoriqueSupprime,
  markMumIaHistoriqueTransforme,
} from "@/lib/mum-ia-historique";
import { serializeBibliothequeForApi, normalizeBibliothequeEntreprise } from "@/lib/bibliotheque-entreprise";
import {
  formatEntrepriseLocalisationHint,
  resolveEntrepriseLocalisation,
  type EntrepriseLocalisation,
} from "@/lib/entreprise-localisation";
import { TYPE_CHANTIER_LABELS } from "@/lib/chantiers";
import { FRANCE_REGIONS } from "@/lib/france-regions";
import { recordDevisCreatedForClient } from "@/lib/historique-events";
import { useStore } from "@/lib/store";
import { getAccount } from "@/lib/account";
import type { MumIaHistoriqueEntry, TypeChantier } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Sparkles,
  Eye,
  EyeOff,
  Wand2,
} from "lucide-react";

const PRIX_SOURCE_LABELS: Record<string, string> = {
  manuel: "Saisie manuelle",
  appris: "Appris depuis devis signés",
  regional: "Base régionale",
  batimum: "Bibliothèque Batimum",
  a_verifier: "À vérifier",
};

function formatPrixSourceLabel(source?: string) {
  if (!source) return "";
  return PRIX_SOURCE_LABELS[source] ?? source;
}
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

const TVA_OPTIONS = [
  { value: "20", label: "20 %" },
  { value: "10", label: "10 %" },
  { value: "5.5", label: "5,5 %" },
  { value: "0", label: "0 %" },
];

const NIVEAU_PRIX_AUTO: BtpNiveauPrix = "standard";

const TYPE_CHANTIER_OPTIONS = (
  Object.entries(TYPE_CHANTIER_LABELS) as [TypeChantier, string][]
).map(([value, label]) => ({ value, label }));

type ChantierContext = {
  description: string;
  regionCode: string;
  regionLabel: string;
  departementCode: string;
  departementLabel: string;
  typeChantier: TypeChantier;
  tauxTVA: number;
  niveauPrix: BtpNiveauPrix;
};

const MUM_IA_DRAFT_KEY = "batimum-mum-ia-draft";

export function BatimumAiAssistant() {
  const router = useRouter();
  const { data, setData } = useStore();
  const account = useMemo(() => getAccount(), []);

  const [description, setDescription] = useState("");
  const [regionCode, setRegionCode] = useState(FRANCE_REGIONS[0]?.code ?? "");
  const [departementCode, setDepartementCode] = useState(
    FRANCE_REGIONS[0]?.departements[0]?.code ?? "",
  );
  const [typeChantier, setTypeChantier] = useState<TypeChantier>("renovation");
  const [tauxTVA, setTauxTVA] = useState("20");
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiChantierAnalysis | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [standardDetails, setStandardDetails] = useState<MumIaStandardDetails>(
    EMPTY_MUM_IA_STANDARD_DETAILS,
  );
  const [optionalDetailsExpanded, setOptionalDetailsExpanded] = useState(false);
  const [result, setResult] = useState<AiDevisResult | null>(null);
  const [viewMode, setViewMode] = useState<MumIaViewMode>("interne");
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [transformingHistoryId, setTransformingHistoryId] = useState<string | null>(null);
  const [entrepriseLocalisation, setEntrepriseLocalisation] =
    useState<EntrepriseLocalisation | null>(null);
  const [serverQuota, setServerQuota] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);
  const geoPrefillDone = useRef(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const draftHydrated = useRef(false);

  useEffect(() => {
    if (draftHydrated.current) return;
    draftHydrated.current = true;
    try {
      const raw = sessionStorage.getItem(MUM_IA_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        description?: string;
        regionCode?: string;
        departementCode?: string;
        typeChantier?: TypeChantier;
        tauxTVA?: string;
        result?: AiDevisResult | null;
        analysis?: AiChantierAnalysis | null;
      };
      if (draft.description) setDescription(draft.description);
      if (draft.regionCode) setRegionCode(draft.regionCode);
      if (draft.departementCode) setDepartementCode(draft.departementCode);
      if (draft.typeChantier) setTypeChantier(draft.typeChantier);
      if (draft.tauxTVA) setTauxTVA(draft.tauxTVA);
      if (draft.result) setResult(draft.result);
      if (draft.analysis) setAnalysis(draft.analysis);
    } catch {
      /* brouillon illisible */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        MUM_IA_DRAFT_KEY,
        JSON.stringify({
          description,
          regionCode,
          departementCode,
          typeChantier,
          tauxTVA,
          result,
          analysis,
        }),
      );
    } catch {
      /* quota sessionStorage */
    }
  }, [description, regionCode, departementCode, typeChantier, tauxTVA, result, analysis]);

  const previewResult = useMemo(() => {
    if (!result) return null;
    return isMumIaInterneMode(viewMode) ? result : filterAiDevisForClientView(result);
  }, [result, viewMode]);

  const bibliothequeNormalized = useMemo(
    () => normalizeBibliothequeEntreprise(data.bibliothequeEntreprise),
    [data.bibliothequeEntreprise],
  );

  const refreshServerQuota = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/usage", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        used: number;
        limit: number;
        remaining: number;
      };
      setServerQuota(payload);
    } catch {
      /* quota serveur indisponible */
    }
  }, []);

  useEffect(() => {
    void refreshServerQuota();
  }, [refreshServerQuota]);

  const quota = useMemo((): AiQuotaState => {
    if (serverQuota) {
      return {
        used: serverQuota.used,
        limit: serverQuota.limit,
        month: "",
        remaining: serverQuota.remaining,
        isPro: serverQuota.limit >= 100,
      };
    }
    return resolveAiQuota(data.parametres, account);
  }, [serverQuota, data.parametres, account]);

  useEffect(() => {
    if (geoPrefillDone.current) return;
    geoPrefillDone.current = true;

    const loc = resolveEntrepriseLocalisation(
      data.parametres,
      bibliothequeNormalized,
    );
    if (!loc) return;

    setEntrepriseLocalisation(loc);
    setRegionCode(loc.regionCode);
    setDepartementCode(loc.departementCode);
  }, [data.parametres, bibliothequeNormalized]);

  const selectedRegion = useMemo(
    () => FRANCE_REGIONS.find((region) => region.code === regionCode),
    [regionCode],
  );

  const departementOptions = useMemo(
    () =>
      (selectedRegion?.departements ?? []).map((dept) => ({
        value: dept.code,
        label: `${dept.code} — ${dept.label}`,
      })),
    [selectedRegion],
  );

  const handleRegionChange = (value: string) => {
    setRegionCode(value);
    const region = FRANCE_REGIONS.find((item) => item.code === value);
    setDepartementCode(region?.departements[0]?.code ?? "");
    setAnalysis(null);
    setResult(null);
  };

  const buildContext = (): ChantierContext | null => {
    if (!selectedRegion) return null;
    const dept = selectedRegion.departements.find(
      (item) => item.code === departementCode,
    );
    if (!dept) return null;

    return {
      description: description.trim(),
      regionCode,
      regionLabel: selectedRegion.label,
      departementCode,
      departementLabel: dept.label,
      typeChantier,
      tauxTVA: Number(tauxTVA),
      niveauPrix: NIVEAU_PRIX_AUTO,
    };
  };

  const validateForm = (): ChantierContext | null => {
    if (!canUseAiGeneration(quota)) {
      setError(
        serverQuota
          ? "Vous avez atteint votre limite de 100 demandes IA ce mois-ci"
          : `Quota mensuel atteint (${quota.used}/${quota.limit}). Passez à l'offre Pro pour plus de générations.`,
      );
      return null;
    }
    if (description.trim().length < 10) {
      setError("Décrivez votre chantier en au moins 10 caractères.");
      return null;
    }
    const ctx = buildContext();
    if (!ctx) {
      setError("Sélectionnez une région et un département.");
      return null;
    }
    return ctx;
  };

  const doGenerate = async (
    ctx: ChantierContext,
    options: {
      forceWithHypotheses?: boolean;
      reponsesQuestions?: Record<string, string>;
      analysisData?: AiChantierAnalysis | null;
      niveauPrix?: BtpNiveauPrix;
    } = {},
  ) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ia/generate-devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptionChantier: ctx.description,
          regionCode: ctx.regionCode,
          regionLabel: ctx.regionLabel,
          departementCode: ctx.departementCode,
          departementLabel: ctx.departementLabel,
          typeChantier: ctx.typeChantier,
          tauxTVA: ctx.tauxTVA,
          niveauPrix: options.niveauPrix ?? ctx.niveauPrix,
          forceWithHypotheses: options.forceWithHypotheses ?? false,
          reponsesQuestions: options.reponsesQuestions,
          hypothesesFromAnalysis: options.analysisData?.hypothesesSuggerees,
          lotsIdentifies: options.analysisData?.lotsIdentifies,
          bibliothequeEntries: serializeBibliothequeForApi(bibliothequeNormalized),
          coefficientRegionalManuel:
            bibliothequeNormalized.coefficientRegionalManuel ?? null,
          departementPrincipal: bibliothequeNormalized.departementPrincipal,
          ratioEntries: bibliothequeNormalized.ratios,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
        code?: string;
        devis?: AiDevisResult;
      };

      if (!response.ok || !payload.success || !payload.devis) {
        if (response.status === 429) {
          setError(
            payload.message ??
              "Vous avez atteint votre limite de 100 demandes IA ce mois-ci",
          );
          await refreshServerQuota();
          return;
        }
        if (response.status === 503 && payload.code === "ai_quota_unavailable") {
          setError(
            payload.message ??
              "Quota IA indisponible. Vérifiez la migration user_ai_usage et SUPABASE_SERVICE_ROLE_KEY.",
          );
          return;
        }
        setError(
          payload.message ??
            (payload.code
              ? `Erreur MUM IA (${payload.code}).`
              : "Erreur lors de la génération."),
        );
        return;
      }

      const dept = selectedRegion?.departements.find(
        (item) => item.code === ctx.departementCode,
      );
      const smartTitle = buildMumIaDevisTitre({
        description: ctx.description,
        typeChantier: ctx.typeChantier,
        ville: entrepriseLocalisation?.ville,
        departementLabel: dept?.label,
        clients: data.clients,
        iaTitre: payload.devis.titre,
      });
      const devisResult =
        normalizeAiDevisResult({ ...payload.devis, titre: smartTitle }) ?? {
          ...payload.devis,
          titre: smartTitle,
        };

      setResult(devisResult);
      setAnalysis(null);
      const historyEntry = createMumIaHistoriqueEntry({
        devisIa: devisResult,
        context: {
          descriptionChantier: ctx.description,
          regionCode: ctx.regionCode,
          regionLabel: ctx.regionLabel,
          departementCode: ctx.departementCode,
          departementLabel: ctx.departementLabel,
          typeChantier: ctx.typeChantier,
          tauxTVA: ctx.tauxTVA,
          niveauPrix: NIVEAU_PRIX_AUTO,
          villeEntreprise: entrepriseLocalisation?.ville,
        },
      });
      setActiveHistoryId(historyEntry.id);
      setData((prev) => ({
        ...prev,
        mumIaHistorique: [historyEntry, ...(prev.mumIaHistorique ?? [])].slice(0, 200),
      }));
      await refreshServerQuota();
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async (ctx: ChantierContext) => {
    setAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/ia/analyze-chantier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptionChantier: ctx.description,
          regionCode: ctx.regionCode,
          regionLabel: ctx.regionLabel,
          departementCode: ctx.departementCode,
          departementLabel: ctx.departementLabel,
          typeChantier: ctx.typeChantier,
          tauxTVA: ctx.tauxTVA,
          niveauPrix: NIVEAU_PRIX_AUTO,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
        analysis?: AiChantierAnalysis;
      };

      if (!response.ok || !payload.success || !payload.analysis) {
        setError(payload.message ?? "Erreur lors de l'analyse.");
        return null;
      }

      setAnalysis(payload.analysis);
      setQuestionAnswers({});
      setStandardDetails(EMPTY_MUM_IA_STANDARD_DETAILS);
      setOptionalDetailsExpanded(false);
      return payload.analysis;
    } catch {
      setError("Connexion impossible lors de l'analyse.");
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    const ctx = validateForm();
    if (!ctx) return;
    await runAnalysis(ctx);
  };

  const handleGenerateWithDetails = async () => {
    const ctx = validateForm();
    if (!ctx || !analysis) return;
    const reponsesQuestions = buildMumIaReponsesQuestions(
      standardDetails,
      questionAnswers,
    );
    await doGenerate(ctx, {
      reponsesQuestions,
      analysisData: analysis,
    });
  };

  const handleGenerateWithHypotheses = async () => {
    const ctx = validateForm();
    if (!ctx) return;
    await doGenerate(ctx, {
      forceWithHypotheses: true,
      analysisData: analysis,
    });
  };

  const transformDevisFromAi = async (params: {
    aiResult: AiDevisResult;
    historyEntryId?: string | null;
    descriptionChantier: string;
    regionLabel: string;
    departementLabel: string;
    chantierType: TypeChantier;
    tva: number;
  }) => {
    setTransforming(true);
    setTransformingHistoryId(params.historyEntryId ?? null);
    setError(null);

    try {
      const draft = createDevisBrouillonFromAi({
        result: params.aiResult,
        clients: data.clients,
        existingDevis: data.devis,
        parametres: data.parametres,
        typeChantier: params.chantierType,
        regionLabel: params.regionLabel,
        departementLabel: params.departementLabel,
        descriptionChantier: params.descriptionChantier,
        tauxTVA: params.tva,
      });

      const client = data.clients.find((item) => item.id === draft.clientId);
      const recorded = recordDevisCreatedForClient({ devis: draft, client });

      setData((prev) => ({
        ...prev,
        devis: [recorded.devis, ...prev.devis],
        clients: recorded.client
          ? prev.clients.map((item) =>
              item.id === recorded.client!.id ? recorded.client! : item,
            )
          : prev.clients,
        mumIaHistorique: params.historyEntryId
          ? markMumIaHistoriqueTransforme(
              prev.mumIaHistorique ?? [],
              params.historyEntryId,
              recorded.devis.id,
            )
          : prev.mumIaHistorique,
      }));

      router.push(`/devis/${recorded.devis.id}`);
    } catch {
      setError("Impossible de créer le brouillon. Réessayez.");
      setTransforming(false);
      setTransformingHistoryId(null);
    }
  };

  const handleTransform = async () => {
    if (!result || !selectedRegion) return;

    const dept = selectedRegion.departements.find(
      (item) => item.code === departementCode,
    );
    if (!dept) return;

    await transformDevisFromAi({
      aiResult: result,
      historyEntryId: activeHistoryId,
      descriptionChantier: description.trim(),
      regionLabel: selectedRegion.label,
      departementLabel: dept.label,
      chantierType: typeChantier,
      tva: Number(tauxTVA),
    });
  };

  const handleVoirHistorique = (entry: MumIaHistoriqueEntry) => {
    setDescription(entry.descriptionChantier);
    setRegionCode(entry.regionCode);
    setDepartementCode(entry.departementCode);
    setTypeChantier(entry.typeChantier);
    setTauxTVA(String(entry.tauxTVA));
    setResult(normalizeAiDevisResult(entry.devisIa) ?? entry.devisIa);
    setActiveHistoryId(entry.id);
    setAnalysis(null);
    setError(null);
    setViewMode("interne");
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTransformerHistorique = async (entry: MumIaHistoriqueEntry) => {
    await transformDevisFromAi({
      aiResult: entry.devisIa,
      historyEntryId: entry.id,
      descriptionChantier: entry.descriptionChantier,
      regionLabel: entry.regionLabel,
      departementLabel: entry.departementLabel,
      chantierType: entry.typeChantier,
      tva: entry.tauxTVA,
    });
  };

  const handleSupprimerHistorique = (entryId: string) => {
    setData((prev) => ({
      ...prev,
      mumIaHistorique: markMumIaHistoriqueSupprime(
        prev.mumIaHistorique ?? [],
        entryId,
      ),
    }));
    if (activeHistoryId === entryId) {
      setActiveHistoryId(null);
    }
  };

  const previewTotal = previewResult ? computeAiDevisTotalHT(previewResult) : 0;
  const showInternal = isMumIaInterneMode(viewMode);
  const activeHistoryEntry = useMemo(
    () =>
      activeHistoryId
        ? (data.mumIaHistorique ?? []).find((entry) => entry.id === activeHistoryId)
        : undefined,
    [activeHistoryId, data.mumIaHistorique],
  );
  const canTransformCurrent =
    !activeHistoryEntry || activeHistoryEntry.statut === "genere";
  const showAnalysisPanel = analysis !== null;

  const conseils = useMemo(
    () =>
      showInternal
        ? buildMumIaConseils({
            result,
            entrepriseLocalisation,
            departementLabel: selectedRegion?.departements.find(
              (d) => d.code === departementCode,
            )?.label,
            tauxTVA: Number(tauxTVA),
          })
        : [],
    [
      showInternal,
      result,
      entrepriseLocalisation,
      selectedRegion,
      departementCode,
      tauxTVA,
    ],
  );

  return (
    <div className="btp-app-page space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            MUM IA
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Décrivez le chantier, générez un devis structuré, vérifiez puis
            transformez en brouillon.
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground/75">
            Prix et quantités estimatifs. Vérification professionnelle recommandée.
          </p>
        </div>
        <span
          className="shrink-0 whitespace-nowrap rounded-md border border-border/60 bg-card/50 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground"
          title="Demandes MUM IA utilisées sur la période d'abonnement en cours"
        >
          {quota.used} / {quota.limit} devis IA utilisés ce mois-ci
        </span>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="space-y-3 p-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Décrivez votre chantier
            </span>
            <textarea
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setAnalysis(null);
                setStandardDetails(EMPTY_MUM_IA_STANDARD_DETAILS);
                setOptionalDetailsExpanded(false);
                setQuestionAnswers({});
                setResult(null);
                setActiveHistoryId(null);
              }}
              rows={7}
              placeholder="Ex. : Rénovation complète salle de bain 6 m² — dépose carrelage et sanitaires, protection, nouvelle douche italienne, faïence murale, plomberie, 2 points lumineux, peinture plafond, nettoyage et évacuation gravats…"
              className="min-h-[9rem] w-full resize-y rounded-2xl border border-border/80 bg-card/90 px-4 py-3 text-sm text-foreground shadow-[var(--shadow-input)] placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Région
              </span>
              <Select
                value={regionCode}
                onChange={(event) => handleRegionChange(event.target.value)}
              >
                {FRANCE_REGIONS.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Département
              </span>
              <Select
                value={departementCode}
                onChange={(event) => setDepartementCode(event.target.value)}
              >
                {departementOptions.map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {entrepriseLocalisation ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <MapPin className="mr-1 inline h-3 w-3 text-primary" />
              {formatEntrepriseLocalisationHint(entrepriseLocalisation)} — modifiable
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Type de chantier
              </span>
              <Select
                value={typeChantier}
                onChange={(event) =>
                  setTypeChantier(event.target.value as TypeChantier)
                }
              >
                {TYPE_CHANTIER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                TVA
              </span>
              <Select
                value={tauxTVA}
                onChange={(event) => setTauxTVA(event.target.value)}
              >
                {TVA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {showInternal && conseils.length > 0 ? (
            <MumIaConseilsCard conseils={conseils} />
          ) : null}

          {showAnalysisPanel && analysis ? (
            <MumIaOptionalDetailsPanel
              analysis={analysis}
              standardDetails={standardDetails}
              onStandardDetailsChange={(patch) =>
                setStandardDetails((prev) => ({ ...prev, ...patch }))
              }
              questionAnswers={questionAnswers}
              onQuestionAnswerChange={(id, value) =>
                setQuestionAnswers((prev) => ({ ...prev, [id]: value }))
              }
              expanded={optionalDetailsExpanded}
              onExpandedChange={setOptionalDetailsExpanded}
              loading={loading}
              onGenerateWithDetails={handleGenerateWithDetails}
              onGenerateWithHypotheses={handleGenerateWithHypotheses}
            />
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {!showAnalysisPanel ? (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={analyzing || loading || !canUseAiGeneration(quota)}
              className="w-full sm:w-auto"
            >
              {analyzing || loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {analyzing ? "Analyse du chantier…" : "Génération en cours…"}
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Analyser et préparer le devis
                </>
              )}
            </Button>
          ) : null}
        </Card>

        <div ref={previewRef}>
        <Card className="flex min-h-[24rem] flex-col overflow-hidden p-0">
          <header className="border-b border-border/80 bg-card/40 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Prévisualisation</h2>
              {result ? (
                <div className="flex rounded-lg border border-border/80 p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("interne")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        showInternal
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                      Interne
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("client")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        !showInternal
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <EyeOff className="h-3 w-3" />
                      Client
                    </button>
                  </div>
              ) : null}
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {!previewResult ? (
              <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 text-center">
                <Sparkles className="h-8 w-8 text-primary/40" />
                <p className="max-w-xs text-xs text-muted-foreground">
                  Le devis généré s&apos;affichera ici pour vérification avant
                  transformation en brouillon.
                </p>
              </div>
            ) : previewResult && result ? (
              <>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {previewResult.titre}
                  </h3>
                  {previewResult.descriptionGenerale ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {previewResult.descriptionGenerale}
                    </p>
                  ) : null}
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {selectedRegion?.label} — {departementCode}
                  </p>
                </div>

                {showInternal && result.hypothesesUtilisees && result.hypothesesUtilisees.length > 0 ? (
                  <div className="rounded-xl border border-border/80 bg-card-elevated/30 p-3">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Hypothèses utilisées
                    </h4>
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                      {result.hypothesesUtilisees.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                ) : showInternal && (result.hypothèses ?? []).length > 0 ? (
                  <div className="rounded-xl border border-border/80 bg-card-elevated/30 p-3">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Hypothèses retenues
                    </h4>
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                      {(result.hypothèses ?? []).map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {previewResult.sections.map((section, sectionIndex) => {
                    const subtotal =
                      section.sousTotalHT || computeAiSectionSubtotal(section);
                    const internalSection = result.sections[sectionIndex];
                    return (
                      <section
                        key={section.titre}
                        className="rounded-xl border border-border/80 bg-card-elevated/30 p-3"
                      >
                        <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                          {section.titre}
                        </h4>
                        <ul className="mt-3 space-y-3">
                          {section.lignes.map((ligne, index) => {
                            const internalLigne = internalSection?.lignes[index];
                            return (
                            <li
                              key={`${section.titre}-${index}`}
                              className="border-b border-border/50 pb-3 last:border-0 last:pb-0"
                            >
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {ligne.designation}
                                    {showInternal && ligne.prixAVerifier ? (
                                      <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400">
                                        Prix à vérifier
                                      </span>
                                    ) : null}
                                    {showInternal && internalLigne?.quantiteEstimee ? (
                                      <span className="ml-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400">
                                        Qté estimée
                                      </span>
                                    ) : null}
                                  </p>
                                  {ligne.description ? (
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {ligne.description}
                                    </p>
                                  ) : null}
                                  {showInternal && internalLigne?.sourcePrix ? (
                                    <p className="mt-1 text-[10px] text-muted-foreground/80">
                                      Source prix : {formatPrixSourceLabel(internalLigne.sourcePrix)}
                                      {internalLigne.fiabilitePrix != null
                                        ? ` — fiabilité ${internalLigne.fiabilitePrix}%`
                                        : ""}
                                    </p>
                                  ) : null}
                                </div>
                                <p className="shrink-0 text-sm font-semibold text-foreground sm:text-right">
                                  {formatCurrency(
                                    ligne.quantite * ligne.prixUnitaireHT,
                                  )}{" "}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    HT
                                  </span>
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {ligne.quantite} {ligne.unite} ×{" "}
                                {formatCurrency(ligne.prixUnitaireHT)} HT — TVA{" "}
                                {ligne.tauxTVA} %
                              </p>
                            </li>
                          );
                          })}
                        </ul>
                        <p className="mt-3 text-right text-xs font-semibold text-foreground">
                          Sous-total {section.titre} : {formatCurrency(subtotal)} HT
                        </p>
                      </section>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-border bg-card/60 px-4 py-3">
                  <p className="text-right text-sm font-bold text-foreground">
                    Total général estimé : {formatCurrency(previewTotal)} HT
                  </p>
                </div>

                {showInternal && result.autoVerification ? (
                  <div className="rounded-2xl border border-border/80 bg-card-elevated/30 p-4">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      Auto-vérification IA
                    </h4>
                    <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <li>
                        Travaux complets :{" "}
                        {result.autoVerification.travauxComplets ? "oui" : "non"}
                      </li>
                      <li>
                        Quantités cohérentes :{" "}
                        {result.autoVerification.quantitesCoherentes ? "oui" : "non"}
                      </li>
                      <li>
                        Prix cohérents :{" "}
                        {result.autoVerification.prixCoherents ? "oui" : "non"}
                      </li>
                      <li>
                        TVA cohérentes :{" "}
                        {result.autoVerification.tvaCoherentes ? "oui" : "non"}
                      </li>
                      <li>
                        Postes globaux sans doublon :{" "}
                        {result.autoVerification.postesGlobauxCoherents !== false
                          ? "oui"
                          : "non"}
                      </li>
                    </ul>
                    {result.autoVerification.doublonsSupprimes &&
                    result.autoVerification.doublonsSupprimes.length > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Sous-postes retirés (inclus dans un forfait) :{" "}
                        {result.autoVerification.doublonsSupprimes
                          .map((item) => item.split(" (")[0])
                          .join(" · ")}
                      </p>
                    ) : null}
                    {(result.autoVerification.lotsManquants ?? []).length > 0 ? (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        Lots à vérifier :{" "}
                        {(result.autoVerification.lotsManquants ?? []).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {showInternal && result.rapportVerification ? (
                  <div className="rounded-2xl border border-border/80 bg-card-elevated/20 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Rapport de vérification interne
                      {result.rapportVerification.complet ? (
                        <span className="ml-2 normal-case text-primary">— Complet</span>
                      ) : (
                        <span className="ml-2 normal-case text-amber-600 dark:text-amber-400">
                          — À compléter
                        </span>
                      )}
                    </h4>
                    <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                      <div>
                        <p className="font-medium text-foreground">Éléments demandés</p>
                        <p className="mt-1 text-muted-foreground">
                          {(result.rapportVerification.elementsDemandes ?? []).length > 0
                            ? (result.rapportVerification.elementsDemandes ?? []).join(" · ")
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Éléments détectés</p>
                        <p className="mt-1 text-muted-foreground">
                          {(result.rapportVerification.elementsDetectes ?? []).length > 0
                            ? (result.rapportVerification.elementsDetectes ?? []).join(" · ")
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          ⚠️ Informations complémentaires nécessaires
                        </p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                          {(result.rapportVerification.informationsComplementaires ??
                            []).length > 0 ? (
                            (
                              result.rapportVerification.informationsComplementaires ??
                              []
                            ).map((item) => <li key={item}>{item}</li>)
                          ) : (result.rapportVerification.elementsManquants ?? [])
                              .length > 0 ? (
                            (result.rapportVerification.elementsManquants ?? []).map(
                              (item) => <li key={item}>{item}</li>,
                            )
                          ) : (
                            <li>Aucune</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Doublons détectés</p>
                        <p className="mt-1 text-muted-foreground">
                          {(result.rapportVerification.doublonsDetectes ?? []).length > 0
                            ? (result.rapportVerification.doublonsDetectes ?? []).join(" · ")
                            : "Aucun"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          ⚠️ Éléments inclus dans un forfait global
                        </p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                          {(result.rapportVerification.forfaitsGlobaux ?? []).length >
                          0 ? (
                            (result.rapportVerification.forfaitsGlobaux ?? []).map(
                              (item) => <li key={item}>{item}</li>,
                            )
                          ) : (result.rapportVerification.conflitsPostesGlobaux ?? [])
                              .length > 0 ? (
                            (
                              result.rapportVerification.conflitsPostesGlobaux ?? []
                            ).map((item) => <li key={item}>{item}</li>)
                          ) : (
                            <li>Aucun</li>
                          )}
                        </ul>
                      </div>
                    </div>
                    {result.rapportVerification.etapes &&
                    result.rapportVerification.etapes.length > 0 ? (
                      <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                        {result.rapportVerification.etapes.map((etape) => (
                          <li key={etape}>{etape}</li>
                        ))}
                      </ul>
                    ) : null}
                    {(result.rapportVerification.suggestionsIAIntegrees ?? []).length >
                    0 ? (
                      <div className="mt-3 text-xs text-primary">
                        <p className="font-medium">💡 Suggestions IA intégrées</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          {(
                            result.rapportVerification.suggestionsIAIntegrees ?? []
                          ).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {(result.rapportVerification.suggestionsIANonIntegrees ?? [])
                      .length > 0 ? (
                      <div className="mt-3 text-xs text-amber-700 dark:text-amber-400">
                        <p className="font-medium">
                          💡 Suggestions IA (non intégrées au devis)
                        </p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          {(
                            result.rapportVerification.suggestionsIANonIntegrees ?? []
                          ).map((item) => (
                              <li key={item}>{item}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {showInternal && (result.pointsAVerifier ?? []).length > 0 ? (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Points à vérifier
                    </h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {(result.pointsAVerifier ?? []).map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          {result ? (
            <footer className="border-t border-border/80 bg-card/40 px-5 py-4">
              {canTransformCurrent ? (
                <Button
                  type="button"
                  onClick={handleTransform}
                  disabled={transforming}
                  className="w-full"
                >
                  {transforming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Création du brouillon…
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Transformer en devis brouillon
                    </>
                  )}
                </Button>
              ) : activeHistoryEntry?.devisBrouillonId ? (
                <Link
                  href={`/devis/${activeHistoryEntry.devisBrouillonId}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card-elevated"
                >
                  <FileText className="h-4 w-4" />
                  Ouvrir le devis brouillon
                </Link>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  Cette demande a déjà été transformée en devis brouillon.
                </p>
              )}
            </footer>
          ) : null}
        </Card>
        </div>
      </div>

      <MumIaHistoriqueSection
        entries={data.mumIaHistorique ?? []}
        activeEntryId={activeHistoryId}
        transformingId={transformingHistoryId}
        onVoir={handleVoirHistorique}
        onTransformer={handleTransformerHistorique}
        onSupprimer={handleSupprimerHistorique}
      />
    </div>
  );
}
