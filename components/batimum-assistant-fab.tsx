"use client";

import { useEffect, useMemo, useState } from "react";
import { BatimumAssistantV1Chat } from "@/components/batimum-assistant-v1-chat";
import { useMumIaQuota } from "@/lib/use-mum-ia-quota";
import { buildMumIaQuotaExceededMessage } from "@/lib/mum-ia-quota";
import { buildPilotageDashboard } from "@/lib/pilotage";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Bot, Minimize2, X } from "lucide-react";

const UI_STORAGE_KEY = "batimum-assistant-ui-v1";
const OPEN_EVENT = "batimum-assistant-open";

type AssistantUiState = "open" | "minimized" | "stashed";

function loadUiState(): AssistantUiState {
  if (typeof sessionStorage === "undefined") return "minimized";
  try {
    const raw = sessionStorage.getItem(UI_STORAGE_KEY);
    if (raw === "open" || raw === "minimized" || raw === "stashed") return raw;
  } catch {
    /* ignore */
  }
  return "minimized";
}

function saveUiState(state: AssistantUiState) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(UI_STORAGE_KEY, state);
}

/** Ouvre la bulle depuis Pilotage ou ailleurs. */
export function openBatimumAssistant(prompt?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_EVENT, { detail: { prompt: prompt ?? "" } }),
  );
}

/**
 * Point d'accès flottant Assistant Batimum (OpenAI V1).
 * Monté uniquement dans AppShell (espace dirigeant authentifié).
 */
export function BatimumAssistantFab() {
  const { data } = useStore();
  const { quota } = useMumIaQuota();
  const [uiState, setUiState] = useState<AssistantUiState>("minimized");
  const [mounted, setMounted] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState<string | undefined>();
  const [badgePulse, setBadgePulse] = useState(false);
  const [quotaBlockedNotice, setQuotaBlockedNotice] = useState<string | null>(
    null,
  );

  const quotaExhausted =
    Boolean(quota) && quota!.limit > 0 && quota!.used >= quota!.limit;

  const alertCount = useMemo(() => {
    try {
      return buildPilotageDashboard(data).importantAlertCount;
    } catch {
      return 0;
    }
  }, [data]);

  useEffect(() => {
    setUiState(loadUiState());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    saveUiState(uiState);
  }, [uiState, mounted]);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      handleOpen(detail?.prompt || undefined);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [quotaExhausted, quota]);

  useEffect(() => {
    if (alertCount <= 0) return;
    setBadgePulse(true);
    const timer = window.setTimeout(() => setBadgePulse(false), 900);
    return () => window.clearTimeout(timer);
  }, [alertCount]);

  useEffect(() => {
    if (uiState !== "open") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Ne pas fermer si un champ native dialog / confirmation est prioritaire
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-assistant-confirm]")) return;
      setUiState("minimized");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [uiState]);

  function handleOpen(prompt?: string) {
    if (quotaExhausted) {
      setQuotaBlockedNotice(
        buildMumIaQuotaExceededMessage(
          quota?.renewalDate || quota?.periodEnd || "",
          quota?.limit ?? 200,
        ),
      );
      setSeedPrompt(undefined);
      setUiState("open");
      return;
    }
    setQuotaBlockedNotice(null);
    setSeedPrompt(prompt?.trim() || undefined);
    setUiState("open");
  }

  if (!mounted) return null;

  const bubbleVisible = uiState === "minimized" || uiState === "stashed";
  const panelOpen = uiState === "open";

  return (
    <>
      {bubbleVisible ? (
        <button
          type="button"
          onClick={() => handleOpen()}
          title="Assistant Batimum"
          aria-label="Ouvrir l'Assistant Batimum"
          className={cn(
            "group assistant-fab-breathe fixed z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] outline-none transition-all duration-200",
            "bottom-[max(1.375rem,env(safe-area-inset-bottom))] right-[max(1.375rem,env(safe-area-inset-right))]",
            "hover:scale-[1.04] hover:bg-emerald-700 hover:shadow-[0_14px_34px_rgba(16,185,129,0.36)]",
            "focus-visible:ring-4 focus-visible:ring-emerald-500/25",
            "sm:h-[58px] sm:w-[58px]",
            quotaExhausted && "bg-emerald-600/55 hover:bg-emerald-600/65",
          )}
        >
          <Bot className="h-6 w-6" strokeWidth={1.75} />
          {alertCount > 0 && !quotaExhausted ? (
            <span
              className={cn(
                "absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-emerald-300 ring-2 ring-white",
                badgePulse && "assistant-fab-badge-pulse",
              )}
            />
          ) : null}
          <span className="pointer-events-none absolute bottom-[calc(100%+0.55rem)] right-0 whitespace-nowrap rounded-lg border border-border/70 bg-white px-2.5 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
            Assistant Batimum
          </span>
        </button>
      ) : null}

      {/* Panneau conservé monté pour garder historique + brouillon */}
      <div
        className={cn(
          "fixed z-[70] flex flex-col overflow-hidden border border-emerald-100/80 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)]",
          "bottom-0 right-0 h-[100dvh] w-full rounded-none",
          "sm:bottom-5 sm:right-5 sm:h-auto sm:max-h-[min(640px,calc(100vh-5.5rem))] sm:w-[min(460px,calc(100vw-1.5rem))] sm:rounded-[28px]",
          panelOpen
            ? "pointer-events-auto origin-bottom-right animate-in fade-in zoom-in-95 duration-200"
            : "pointer-events-none invisible opacity-0",
        )}
        role="dialog"
        aria-label="Assistant Batimum"
        aria-hidden={!panelOpen}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/60 bg-[linear-gradient(135deg,#ffffff_0%,#ecfdf5_100%)] px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Bot className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Assistant Batimum
              </p>
              <p className="text-xs text-muted-foreground">
                Votre copilote de gestion BTP
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => setUiState("minimized")}
              className="rounded-lg p-1.5 text-slate-400 outline-none transition-colors hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              aria-label="Réduire l'Assistant Batimum"
            >
              <Minimize2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setUiState("stashed")}
              className="rounded-lg p-1.5 text-slate-400 outline-none transition-colors hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              aria-label="Fermer l'Assistant Batimum"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {quotaBlockedNotice ? (
          <div className="whitespace-pre-line border-b border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
            {quotaBlockedNotice}
          </div>
        ) : null}

        <BatimumAssistantV1Chat
          compact
          className="min-h-0 flex-1"
          initialPrompt={quotaBlockedNotice ? undefined : seedPrompt}
          inputDisabled={Boolean(quotaBlockedNotice)}
        />
      </div>
    </>
  );
}
