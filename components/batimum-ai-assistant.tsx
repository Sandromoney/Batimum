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
  filterAiDevisForClientView,
  isMumIaInterneMode,
  type MumIaViewMode,
} from "@/lib/mum-ia-mode";
import { MumIaConseilsCard } from "@/components/mum-ia-conseils-card";
import { MumIaOptionalDetailsPanel } from "@/components/mum-ia-optional-details-panel";
import { MumIaHistoriqueSection } from "@/components/mum-ia-historique-section";
import { MumIaQuotaBadge } from "@/components/mum-ia-quota-badge";
import {
  buildMumIaReponsesQuestions,
  buildMumIaDescriptionWithPrecisions,
  EMPTY_MUM_IA_STANDARD_DETAILS,
  type MumIaStandardDetails,
} from "@/lib/mum-ia-optional-details";
import { buildMumIaConseils } from "@/lib/mum-ia-conseils";
import { buildMumIaDevisTitre } from "@/lib/mum-ia-titre";
import {
  createMumIaHistoriqueEntry,
  createMumIaHistoriqueAnalyseEntry,
  markMumIaHistoriqueGenere,
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
import { getAccount } from "@/lib/account";
import { useStore } from "@/lib/store";
import type { MumIaHistoriqueEntry, TypeChantier } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Sparkles,
  Eye,
  EyeOff,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { mapMumIaApiError, getMumIaUserMessage, extractMumIaTechnicalError } from "@/lib/mum-ia-errors";
import { mumIaClientDebug } from "@/lib/mum-ia-debug";
import { fetchMumIaQuota } from "@/lib/mum-ia-quota-client";
import {
  broadcastMumIaQuotaRefresh,
  broadcastMumIaQuotaUpdated,
} from "@/lib/mum-ia-quota-events";
import { authenticatedFetch, MumIaAuthError } from "@/lib/mum-ia-api-client";
import { buildMumIaQuotaSnapshot, buildMumIaQuotaExceededMessage, type MumIaQuotaSnapshot } from "@/lib/mum-ia-quota";
import {
  isAnalysisClearlyUnexploitable,
  MUM_IA_EMPTY_DESCRIPTION_MESSAGE,
  MUM_IA_INSUFFICIENT_INFO_MESSAGE,
  validateMumIaDevisRequest,
} from "@/lib/mum-ia-devis-request";
import { loadMumIaContext, type MumIaContextPayload } from "@/lib/mum-ia-context";

const PRIX_SOURCE_LABELS: Record<string, string> = {
  manuel: "Saisie manuelle",
  appris: "Appris depuis devis signés",
  regional: "Tarif catalogue",
  batimum: "Bibliothèque Batimum",
  a_verifier: "À vérifier",
};

function formatPrixSourceLabel(source?: string) {
  if (!source) return "";
  return PRIX_SOURCE_LABELS[source] ?? source;
}

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
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiChantierAnalysis | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [standardDetails, setStandardDetails] = useState<MumIaStandardDetails>(
    EMPTY_MUM_IA_STANDARD_DETAILS,
  );
  const [optionalDetailsExpanded, setOptionalDetailsExpanded] = useState(false);
  const [additionalPrecisions, setAdditionalPrecisions] = useState("");
  const [result, setResult] = useState<AiDevisResult | null>(null);
  const [viewMode, setViewMode] = useState<MumIaViewMode>("interne");
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [transformingHistoryId, setTransformingHistoryId] = useState<string | null>(null);
  const [entrepriseLocalisation, setEntrepriseLocalisation] =
    useState<EntrepriseLocalisation | null>(null);
  const [serverQuota, setServerQuota] = useState<MumIaQuotaSnapshot | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [pageContext, setPageContext] = useState<MumIaContextPayload | null>(null);
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
        additionalPrecisions?: string;
      };
      if (draft.description) setDescription(draft.description);
      if (draft.regionCode) setRegionCode(draft.regionCode);
      if (draft.departementCode) setDepartementCode(draft.departementCode);
      if (draft.typeChantier) setTypeChantier(draft.typeChantier);
      if (draft.tauxTVA) setTauxTVA(draft.tauxTVA);
      if (draft.result) setResult(draft.result);
      if (draft.analysis) {
        setAnalysis(draft.analysis);
        // Infos complémentaires restent repliées par défaut pour cette création
        setOptionalDetailsExpanded(false);
      }
      if (draft.additionalPrecisions) {
        setAdditionalPrecisions(draft.additionalPrecisions);
      }
      const context = loadMumIaContext();
      if (context) {
        setPageContext(context);
        if (context.typeChantier) {
          setTypeChantier(context.typeChantier as TypeChantier);
        }
      }
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
          additionalPrecisions,
        }),
      );
    } catch {
      /* quota sessionStorage */
    }
  }, [
    description,
    regionCode,
    departementCode,
    typeChantier,
    tauxTVA,
    result,
    analysis,
    additionalPrecisions,
  ]);

  const previewResult = useMemo(() => {
    if (!result) return null;
    return isMumIaInterneMode(viewMode) ? result : filterAiDevisForClientView(result);
  }, [result, viewMode]);

  const bibliothequeNormalized = useMemo(
    () => normalizeBibliothequeEntreprise(data.bibliothequeEntreprise),
    [data.bibliothequeEntreprise],
  );

  const refreshServerQuota = useCallback(async () => {
    const snapshot = await fetchMumIaQuota();
    if (snapshot) {
      setServerQuota(snapshot);
    }
    setQuotaLoading(false);
    return snapshot;
  }, []);

  useEffect(() => {
    void refreshServerQuota();
  }, [refreshServerQuota]);

  const quotaBlocked = Boolean(serverQuota && serverQuota.remaining <= 0);
  const quotaExceededMessage = serverQuota?.renewalDate
    ? buildMumIaQuotaExceededMessage(serverQuota.renewalDate)
    : getMumIaUserMessage("quota_exceeded");

  const applyMumIaFailure = (payload: {
    code?: string;
    message?: string;
    debugMessage?: string;
  }) => {
    setError(mapMumIaApiError(payload));
    if (process.env.NODE_ENV === "development") {
      setTechnicalError(extractMumIaTechnicalError(payload));
    } else {
      setTechnicalError(null);
    }
  };

  const clearMumIaErrors = () => {
    setError(null);
    setTechnicalError(null);
  };

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

  const buildValidatedContext = (options?: {
    checkQuota?: boolean;
  }): ChantierContext | null => {
    if (options?.checkQuota && quotaBlocked) {
      setError(quotaExceededMessage);
      setTechnicalError(
        quotaBlocked && serverQuota
          ? `Quota exceeded (${serverQuota.used}/${serverQuota.monthlyIncluded} MUM IA)`
          : "Quota exceeded",
      );
      return null;
    }
    const devisRequest = validateMumIaDevisRequest(description.trim());
    if (!devisRequest.valid) {
      if (devisRequest.tone === "error") {
        setError(devisRequest.message ?? MUM_IA_INSUFFICIENT_INFO_MESSAGE);
        setAnalysis(null);
        setResult(null);
      } else {
        clearMumIaErrors();
      }
      return null;
    }
    clearMumIaErrors();
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
      descriptionOverride?: string;
      precisionsSupplementaires?: string;
    } = {},
  ) => {
    setLoading(true);
    clearMumIaErrors();
    setResult(null);

    const descriptionForApi = options.descriptionOverride ?? ctx.description;

    const generationId = crypto.randomUUID();

    const requestBody = {
      generationId,
      descriptionChantier: descriptionForApi,
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
      entreprisePriceLibrary: data.parametres.entreprisePriceLibrary,
      parametresSnapshot: {
        fournisseurs: data.parametres.fournisseurs,
        tarifsFournisseurs: data.parametres.tarifsFournisseurs,
        entreprisePriceLibrary: data.parametres.entreprisePriceLibrary,
      },
      companyId: getAccount()?.supabaseUserId ?? undefined,
      coefficientRegionalManuel:
        bibliothequeNormalized.coefficientRegionalManuel ?? null,
      departementPrincipal: bibliothequeNormalized.departementPrincipal,
      ratioEntries: bibliothequeNormalized.ratios,
    };

    mumIaClientDebug("generate_click", {
      region: ctx.regionLabel,
      departement: ctx.departementLabel,
      typeChantier: ctx.typeChantier,
      tauxTVA: ctx.tauxTVA,
      descriptionLength: ctx.description.length,
      body: requestBody,
    });

    const startedAt = Date.now();

    try {
      const response = await authenticatedFetch(
        "/api/ia/generate-devis",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        },
        "generer",
      );

      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
        code?: string;
        debugMessage?: string;
        devis?: AiDevisResult;
        durationMs?: number;
        quota?: {
          used: number;
          limit: number;
          remaining: number;
          monthlyIncluded: number;
          renewalDate: string;
          periodStart: string;
          periodEnd: string;
        };
      };

      mumIaClientDebug("generate_response", {
        status: response.status,
        durationMs: Date.now() - startedAt,
        serverDurationMs: payload.durationMs,
        success: payload.success,
        code: payload.code,
        debugMessage: payload.debugMessage,
        hasDevis: Boolean(payload.devis),
        sections: payload.devis?.sections?.length,
      });

      if (!response.ok || !payload.success || !payload.devis) {
        if (payload.debugMessage) {
          console.error("[MUM IA] generate error detail:", payload.debugMessage);
        }
        if (response.status === 429) {
          setError(payload.message ?? quotaExceededMessage);
          setTechnicalError(
            extractMumIaTechnicalError(payload) ||
              `Quota exceeded — HTTP ${response.status}`,
          );
          await refreshServerQuota();
          return;
        }
        if (response.status === 401) {
          applyMumIaFailure(payload);
          return;
        }
        if (response.status === 400) {
          applyMumIaFailure({
            ...payload,
            code: payload.code ?? "too_short",
          });
          return;
        }
        applyMumIaFailure(payload);
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

      const historyContext = {
        descriptionChantier: ctx.description,
        regionCode: ctx.regionCode,
        regionLabel: ctx.regionLabel,
        departementCode: ctx.departementCode,
        departementLabel: ctx.departementLabel,
        typeChantier: ctx.typeChantier,
        tauxTVA: ctx.tauxTVA,
        niveauPrix: NIVEAU_PRIX_AUTO,
        villeEntreprise: entrepriseLocalisation?.ville,
      };

      let nextActiveHistoryId = activeHistoryId;

      setData((prev) => {
        const isAnalyseEntry =
          activeHistoryId &&
          prev.mumIaHistorique?.some(
            (entry) => entry.id === activeHistoryId && entry.statut === "analyse",
          );

        if (isAnalyseEntry && activeHistoryId) {
          return {
            ...prev,
            mumIaHistorique: markMumIaHistoriqueGenere(
              prev.mumIaHistorique ?? [],
              activeHistoryId,
              {
                devisIa: devisResult,
                precisionsSupplementaires: options.precisionsSupplementaires,
              },
            ),
          };
        }

        const historyEntry = createMumIaHistoriqueEntry({
          devisIa: devisResult,
          context: historyContext,
          precisionsSupplementaires: options.precisionsSupplementaires,
          analysisSnapshot: options.analysisData ?? analysis ?? undefined,
        });
        nextActiveHistoryId = historyEntry.id;
        return {
          ...prev,
          mumIaHistorique: [historyEntry, ...(prev.mumIaHistorique ?? [])].slice(
            0,
            200,
          ),
        };
      });

      setActiveHistoryId(nextActiveHistoryId);

      if (payload.quota) {
        setServerQuota(
          buildMumIaQuotaSnapshot({
            used: payload.quota.used,
            monthlyIncluded: payload.quota.monthlyIncluded,
            packCredits: 0,
            renewalDate: payload.quota.renewalDate,
            periodStart: payload.quota.periodStart,
            periodEnd: payload.quota.periodEnd,
          }),
        );
        broadcastMumIaQuotaUpdated({
          used: payload.quota.used,
          limit: payload.quota.monthlyIncluded || payload.quota.limit || 100,
          remaining: payload.quota.remaining,
          resetAt: payload.quota.renewalDate,
        });
      } else {
        await refreshServerQuota();
        broadcastMumIaQuotaRefresh();
      }
    } catch (networkError) {
      if (networkError instanceof MumIaAuthError) {
        applyMumIaFailure({
          code: "unauthenticated",
          message: networkError.message,
        });
        return;
      }
      console.error("[MUM IA] generate network error", networkError);
      setError(getMumIaUserMessage("network"));
      setTechnicalError(
        networkError instanceof Error
          ? `Network error: ${networkError.message}`
          : "Network error",
      );
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async (ctx: ChantierContext) => {
    setAnalyzing(true);
    clearMumIaErrors();
    setAnalysis(null);

    const requestId = crypto.randomUUID();
    let reserved = false;

    const requestBody = {
      descriptionChantier: ctx.description,
      regionCode: ctx.regionCode,
      regionLabel: ctx.regionLabel,
      departementCode: ctx.departementCode,
      departementLabel: ctx.departementLabel,
      typeChantier: ctx.typeChantier,
      tauxTVA: ctx.tauxTVA,
      niveauPrix: NIVEAU_PRIX_AUTO,
    };

    mumIaClientDebug("analyze_click", requestBody);
    if (process.env.NODE_ENV === "development") {
      console.log("[MUM FLOW] bouton cliqué", "Analyser et préparer le devis");
      console.log("[MUM FLOW] payload envoyé", requestBody);
      console.log("[MUM FLOW] route appelée", "/api/ia/analyze-chantier");
    }
    const startedAt = Date.now();

    const releaseReservation = async () => {
      if (!reserved) return;
      try {
        const releaseResponse = await authenticatedFetch(
          "/api/ai/usage/release",
          {
            method: "POST",
            body: JSON.stringify({ requestId }),
          },
          "quota",
        );
        const releasePayload = (await releaseResponse.json()) as {
          success?: boolean;
          used?: number;
          limit?: number;
          remaining?: number;
          resetAt?: string;
        };
        if (
          releasePayload.success &&
          typeof releasePayload.used === "number" &&
          typeof releasePayload.limit === "number"
        ) {
          setServerQuota(
            buildMumIaQuotaSnapshot({
              used: releasePayload.used,
              monthlyIncluded: releasePayload.limit,
              packCredits: 0,
              renewalDate: releasePayload.resetAt ?? "",
              periodStart: "",
              periodEnd: releasePayload.resetAt ?? "",
            }),
          );
          broadcastMumIaQuotaUpdated({
            used: releasePayload.used,
            limit: releasePayload.limit,
            remaining: releasePayload.remaining,
            resetAt: releasePayload.resetAt,
          });
        } else {
          await refreshServerQuota();
          broadcastMumIaQuotaRefresh();
        }
      } catch {
        await refreshServerQuota();
        broadcastMumIaQuotaRefresh();
      } finally {
        reserved = false;
      }
    };

    try {
      try {
        const reserveResponse = await authenticatedFetch(
          "/api/ai/usage/reserve",
          {
            method: "POST",
            body: JSON.stringify({ requestId }),
          },
          "quota",
        );
        const reservePayload = (await reserveResponse.json()) as {
          success?: boolean;
          limitReached?: boolean;
          message?: string;
          used?: number;
          limit?: number;
          remaining?: number;
          resetAt?: string;
          technicalFailure?: boolean;
        };

        // Uniquement le vrai plafond 100/100 bloque MUM IA
        if (reserveResponse.status === 429 || reservePayload.limitReached) {
          setError(
            reservePayload.message ??
              (serverQuota?.renewalDate
                ? buildMumIaQuotaExceededMessage(serverQuota.renewalDate)
                : getMumIaUserMessage("quota_exceeded")),
          );
          await refreshServerQuota();
          return null;
        }

        const limit = reservePayload.limit ?? 100;
        let used = typeof reservePayload.used === "number" ? reservePayload.used : 0;

        if (reservePayload.technicalFailure) {
          console.warn("[MUM IA QUOTA] storage unavailable — continuing analysis");
          used = Math.min(limit, (serverQuota?.used ?? used) + 1);
        } else if (reservePayload.success !== false) {
          reserved = true;
        }

        const remaining =
          typeof reservePayload.remaining === "number" &&
          !reservePayload.technicalFailure
            ? reservePayload.remaining
            : Math.max(0, limit - used);

        setServerQuota(
          buildMumIaQuotaSnapshot({
            used,
            monthlyIncluded: limit,
            packCredits: 0,
            renewalDate: reservePayload.resetAt ?? serverQuota?.renewalDate ?? "",
            periodStart: serverQuota?.periodStart ?? "",
            periodEnd: reservePayload.resetAt ?? serverQuota?.periodEnd ?? "",
          }),
        );
        broadcastMumIaQuotaUpdated({
          used,
          limit,
          remaining,
          resetAt: reservePayload.resetAt ?? serverQuota?.renewalDate,
        });
      } catch (quotaError) {
        console.warn("[MUM IA QUOTA] reserve call failed — continuing analysis", quotaError);
        const limit = serverQuota?.limit ?? 100;
        const used = Math.min(limit, (serverQuota?.used ?? 0) + 1);
        setServerQuota((previous) =>
          previous
            ? {
                ...previous,
                used,
                remaining: Math.max(0, limit - used),
                limit,
                monthlyIncluded: limit,
              }
            : buildMumIaQuotaSnapshot({
                used,
                monthlyIncluded: limit,
                packCredits: 0,
                renewalDate: "",
                periodStart: "",
                periodEnd: "",
              }),
        );
        broadcastMumIaQuotaUpdated({ used, limit, remaining: Math.max(0, limit - used) });
      }

      const response = await authenticatedFetch(
        "/api/ia/analyze-chantier",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        },
        "analyser",
      );

      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
        code?: string;
        debugMessage?: string;
        analysis?: AiChantierAnalysis;
        durationMs?: number;
      };

      mumIaClientDebug("analyze_response", {
        status: response.status,
        durationMs: Date.now() - startedAt,
        serverDurationMs: payload.durationMs,
        success: payload.success,
        code: payload.code,
        debugMessage: payload.debugMessage,
        lots: payload.analysis?.lotsIdentifies?.length,
      });

      if (!response.ok || !payload.success || !payload.analysis) {
        if (payload.debugMessage) {
          console.error("[MUM IA] analyze error detail:", payload.debugMessage);
        }
        // Refus avant IA exploitable (auth / validation / config) → annuler la réservation
        if (
          response.status === 400 ||
          response.status === 401 ||
          response.status === 403 ||
          response.status === 429 ||
          response.status === 503
        ) {
          await releaseReservation();
        }
        applyMumIaFailure(payload);
        return null;
      }

      if (isAnalysisClearlyUnexploitable(payload.analysis)) {
        setError(MUM_IA_INSUFFICIENT_INFO_MESSAGE);
        setAnalysis(null);
        setResult(null);
        return null;
      }

      setAnalysis(payload.analysis);
      setQuestionAnswers({});
      setStandardDetails(EMPTY_MUM_IA_STANDARD_DETAILS);
      setAdditionalPrecisions("");
      setOptionalDetailsExpanded(false);
      setResult(null);
      clearMumIaErrors();

      const historyEntry = createMumIaHistoriqueAnalyseEntry({
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
        analysis: payload.analysis,
      });
      setActiveHistoryId(historyEntry.id);
      setData((prev) => ({
        ...prev,
        mumIaHistorique: [historyEntry, ...(prev.mumIaHistorique ?? [])].slice(
          0,
          200,
        ),
      }));

      return payload.analysis;
    } catch (networkError) {
      await releaseReservation();
      if (networkError instanceof MumIaAuthError) {
        applyMumIaFailure({
          code: "unauthenticated",
          message: networkError.message,
        });
        return null;
      }
      console.error("[MUM IA] analyze network error", networkError);
      setError(getMumIaUserMessage("network"));
      setTechnicalError(
        networkError instanceof Error
          ? `Network error: ${networkError.message}`
          : "Network error",
      );
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    const ctx = buildValidatedContext({ checkQuota: true });
    if (!ctx) return;
    if (analyzing) return;

    mumIaClientDebug("button_click", { action: "analyze_only" });
    await runAnalysis(ctx);
  };

  const handleGenerateIgnore = async () => {
    const ctx = buildValidatedContext({ checkQuota: true });
    if (!ctx || !analysis) return;

    mumIaClientDebug("button_click", { action: "generate_ignore_precisions" });
    await doGenerate(ctx, {
      analysisData: analysis,
      forceWithHypotheses: !analysis.informationsSuffisantes,
    });
  };

  const handleGenerateWithPrecisions = async () => {
    const ctx = buildValidatedContext({ checkQuota: true });
    if (!ctx || !analysis) return;

    const reponsesQuestions = buildMumIaReponsesQuestions(
      standardDetails,
      questionAnswers,
    );
    const enrichedDescription = buildMumIaDescriptionWithPrecisions(
      ctx.description,
      {
        freeText: additionalPrecisions,
        reponsesQuestions,
      },
    );

    mumIaClientDebug("button_click", {
      action: "generate_with_precisions",
      precisionsLength: additionalPrecisions.length,
      reponsesCount: Object.keys(reponsesQuestions).length,
    });

    await doGenerate(ctx, {
      analysisData: analysis,
      descriptionOverride: enrichedDescription,
      reponsesQuestions,
      precisionsSupplementaires: additionalPrecisions.trim() || undefined,
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
      setError(getMumIaUserMessage("transform_failed"));
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
    setAdditionalPrecisions(entry.precisionsSupplementaires ?? "");
    setActiveHistoryId(entry.id);
    setError(null);
    setViewMode("interne");

    if (entry.statut === "analyse" && entry.analysisSnapshot) {
      setAnalysis(entry.analysisSnapshot);
      setResult(null);
      setStandardDetails(EMPTY_MUM_IA_STANDARD_DETAILS);
      setQuestionAnswers({});
      setOptionalDetailsExpanded(false);
    } else if (entry.devisIa) {
      setResult(normalizeAiDevisResult(entry.devisIa) ?? entry.devisIa);
      setAnalysis(entry.analysisSnapshot ?? null);
      setOptionalDetailsExpanded(false);
    } else {
      setResult(null);
      setAnalysis(null);
    }

    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTransformerHistorique = async (entry: MumIaHistoriqueEntry) => {
    if (!entry.devisIa) return;

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
  const showAnalysisPanel = analysis !== null && result === null;

  const clientValidation = useMemo(
    () => validateMumIaDevisRequest(description),
    [description],
  );

  const showNeutralHint =
    !analyzing &&
    !loading &&
    !error &&
    !clientValidation.valid &&
    clientValidation.tone === "neutral";

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
        <MumIaQuotaBadge
          loading={quotaLoading}
          used={serverQuota?.used}
          monthlyIncluded={serverQuota?.monthlyIncluded ?? 100}
          remaining={serverQuota?.remaining}
          renewalDate={serverQuota?.renewalDate}
          className="shrink-0 text-right"
        />
      </header>

      {pageContext?.entityLabel ? (
        <Card className="border-primary/15 bg-primary/5 px-4 py-3">
          <p className="text-xs font-medium text-foreground">
            Contexte : {pageContext.entityLabel}
          </p>
          {pageContext.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {pageContext.description}
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="space-y-3 p-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Décrivez votre chantier
            </span>
            <textarea
              value={description}
              onChange={(event) => {
                const next = event.target.value;
                setDescription(next);
                setAnalysis(null);
                setStandardDetails(EMPTY_MUM_IA_STANDARD_DETAILS);
                setOptionalDetailsExpanded(false);
                setQuestionAnswers({});
                setAdditionalPrecisions("");
                setResult(null);
                setActiveHistoryId(null);
                const validation = validateMumIaDevisRequest(next);
                if (validation.valid) {
                  setError((prev) =>
                    prev === MUM_IA_INSUFFICIENT_INFO_MESSAGE ||
                    prev === MUM_IA_EMPTY_DESCRIPTION_MESSAGE
                      ? null
                      : prev,
                  );
                }
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
              generating={loading}
              quotaBlocked={quotaBlocked}
              quotaExceededMessage={quotaExceededMessage}
              additionalPrecisions={additionalPrecisions}
              onAdditionalPrecisionsChange={setAdditionalPrecisions}
              onGenerateIgnore={handleGenerateIgnore}
              onGenerateWithPrecisions={handleGenerateWithPrecisions}
            />
          ) : null}

          {showNeutralHint ? (
            <p className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              {clientValidation.message ?? MUM_IA_EMPTY_DESCRIPTION_MESSAGE}
            </p>
          ) : null}

          {error ? (
            <p className="whitespace-pre-line rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {!showAnalysisPanel ? (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={analyzing || quotaBlocked || quotaLoading}
              className="w-full sm:w-auto"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse en cours…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Analyser et préparer le devis
                </>
              )}
            </Button>
          ) : null}

          {quotaBlocked ? (
            <p className="whitespace-pre-line rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {quotaExceededMessage}
            </p>
          ) : null}

          {loading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Génération du devis…
            </p>
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
                {analyzing ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Analyse du chantier en cours…
                    </p>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Génération du devis…
                    </p>
                  </>
                ) : analysis ? (
                  <div className="flex max-w-sm flex-col items-center gap-3 px-2 text-center">
                    <CheckCircle2 className="h-8 w-8 text-primary/70" aria-hidden />
                    <div className="w-full space-y-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5">
                      <p className="text-sm font-semibold text-foreground">
                        Analyse terminée.
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        Veuillez maintenant cliquer sur{" "}
                        <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
                          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          Générer le devis
                        </span>{" "}
                        pour lancer la création du devis détaillé.
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground/90 sm:text-xs">
                        Vous pouvez ajouter des informations complémentaires avant
                        la génération si besoin, ou ignorer cette étape et générer
                        directement.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Sparkles className="h-8 w-8 text-primary/40" />
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Le devis généré s&apos;affichera ici pour vérification avant
                      transformation en brouillon.
                    </p>
                  </>
                )}
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
        descriptionSearch={description}
        onVoir={handleVoirHistorique}
        onTransformer={handleTransformerHistorique}
        onSupprimer={handleSupprimerHistorique}
      />
    </div>
  );
}
