"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildAssistantEnterpriseContext } from "@/lib/assistant-batimum/assistant-context-builder";
import type { AssistantStructuredReply } from "@/lib/assistant-batimum/assistant-structured-reply";
import {
  isSpeechRecognitionSupported,
  listenOnce,
} from "@/lib/assistant-batimum/speech";
import { getDashboardGreetingName } from "@/lib/dashboard-today";
import { authenticatedFetch } from "@/lib/mum-ia-api-client";
import { broadcastMumIaQuotaRefresh } from "@/lib/mum-ia-quota-events";
import { useStore } from "@/lib/store";
import { cn, generateId } from "@/lib/utils";
import { Bot, Loader2, Mic, Send, User } from "lucide-react";
import { useRouter } from "next/navigation";

const CHAT_STORAGE_KEY = "batimum-assistant-v1-chat";
const DRAFT_STORAGE_KEY = "batimum-assistant-v1-draft";

export type AssistantV1Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  creditLabel?: string;
  reliability?: string;
  pendingAction?: AssistantStructuredReply["action"];
};

const WELCOME_SUGGESTIONS = [
  "Que dois-je traiter aujourd'hui ?",
  "Quels devis dois-je relancer ?",
  "Quel chantier est le plus rentable ?",
];

function loadMessages(): AssistantV1Message[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AssistantV1Message[];
  } catch {
    return [];
  }
}

function saveMessages(messages: AssistantV1Message[]) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
}

function loadDraft(): string {
  if (typeof sessionStorage === "undefined") return "";
  try {
    return sessionStorage.getItem(DRAFT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveDraft(value: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(DRAFT_STORAGE_KEY, value);
}

function resolveActionHref(
  action: NonNullable<AssistantStructuredReply["action"]>,
): string | null {
  const id = String(action.payload?.id ?? action.payload?.quoteId ?? action.payload?.devisId ?? action.payload?.factureId ?? action.payload?.chantierId ?? action.payload?.clientId ?? action.payload?.employeId ?? "");
  switch (action.name) {
    case "open_devis":
      return id ? `/devis/${id}` : "/devis";
    case "open_facture":
      return id ? `/factures/${id}` : "/factures";
    case "open_chantier":
      return id ? `/chantiers/${id}` : "/chantiers";
    case "open_client":
      return id ? `/clients/${id}` : "/clients";
    case "open_employe":
      return id ? `/pilotage/employes/${id}` : "/pilotage";
    case "prepare_supplier_compare":
      return "/parametres/bibliotheque?tab=comparatif";
    case "prepare_pilotage_summary":
      return "/pilotage";
    case "prepare_quote_reminder":
      return id ? `/devis/${id}` : "/devis";
    case "prepare_invoice_reminder":
      return id ? `/factures/${id}` : "/factures";
    case "propose_create_client":
      return "/clients";
    case "propose_create_devis":
      return "/devis";
    case "propose_assign_employe":
      return "/planning";
    default:
      return null;
  }
}

export function BatimumAssistantV1Chat({
  className,
  compact = false,
  initialPrompt,
  inputDisabled = false,
}: {
  className?: string;
  compact?: boolean;
  initialPrompt?: string;
  inputDisabled?: boolean;
}) {
  const router = useRouter();
  const { data } = useStore();
  const [messages, setMessages] = useState<AssistantV1Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    AssistantStructuredReply["action"] | null
  >(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialPromptConsumed = useRef<string | null>(null);
  const greetingName = getDashboardGreetingName(data.parametres.utilisateur);

  useEffect(() => {
    const stored = loadMessages();
    if (stored.length === 0) {
      setMessages([
        {
          id: generateId(),
          role: "assistant",
          content: `Bonjour ${greetingName}. Je suis l'Assistant Batimum. Je peux vous aider à comprendre vos devis, factures, chantiers, équipes, fournisseurs et indicateurs de rentabilité.`,
          creditLabel: "0 crédit",
        },
      ]);
    } else {
      setMessages(stored);
    }
    setInput(loadDraft());
    setHydrated(true);
  }, [greetingName]);

  useEffect(() => {
    if (!hydrated) return;
    saveMessages(messages);
  }, [messages, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft(input);
  }, [input, hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking, pendingAction]);

  useEffect(() => {
    if (!initialPrompt?.trim() || !hydrated || inputDisabled) return;
    if (initialPromptConsumed.current === initialPrompt.trim()) return;
    initialPromptConsumed.current = initialPrompt.trim();
    void sendMessage(initialPrompt.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, initialPrompt, inputDisabled]);

  const append = useCallback((msg: Omit<AssistantV1Message, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: generateId() }]);
  }, []);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking || inputDisabled) return;

    setPendingAction(null);
    append({ role: "user", content: trimmed });
    setInput("");
    setThinking(true);

    const context = buildAssistantEnterpriseContext(data, trimmed);
    const history = messages
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await authenticatedFetch(
        "/api/assistant/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            contextText: context.contextText,
            sourcesUsed: context.sourcesUsed,
            intentHint: context.intentHint,
            history,
            greetingName,
          }),
        },
        "assistant-chat",
      );

      const body = (await response.json()) as {
        success?: boolean;
        error?: string;
        creditConsumed?: number;
        local?: boolean;
        reply?: AssistantStructuredReply;
      };

      if (!response.ok || !body.success || !body.reply?.message) {
        append({
          role: "assistant",
          content:
            body.error ||
            "L'Assistant Batimum est temporairement indisponible. Aucun crédit n'a été consommé.",
          creditLabel: "0 crédit",
        });
        setThinking(false);
        return;
      }

      append({
        role: "assistant",
        content: body.reply.message,
        creditLabel:
          body.local || body.creditConsumed === 0 ? "0 crédit" : "1 crédit",
        reliability: body.reply.dataReliability,
        pendingAction: body.reply.action ?? undefined,
      });

      if (!body.local && body.creditConsumed !== 0) {
        broadcastMumIaQuotaRefresh();
      }

      if (
        body.reply.type === "action_proposal" &&
        body.reply.action?.requiresConfirmation
      ) {
        setPendingAction(body.reply.action);
      }

      if (body.reply.suggestedActions?.length) {
        // suggestions already in welcome; optional follow-ups ignored for density
      }
    } catch {
      append({
        role: "assistant",
        content:
          "L'Assistant Batimum est temporairement indisponible. Aucun crédit n'a été consommé.",
        creditLabel: "0 crédit",
      });
    }

    setThinking(false);
  }

  async function handleMic() {
    if (listening || thinking) return;
    if (!isSpeechRecognitionSupported()) {
      append({
        role: "assistant",
        content: "La dictée vocale n'est pas disponible sur ce navigateur.",
        creditLabel: "0 crédit",
      });
      return;
    }
    setListening(true);
    const result = await listenOnce({ lang: "fr-FR" });
    setListening(false);
    if (!result?.transcript) {
      append({
        role: "assistant",
        content: "Je n'ai rien capté. Réessaie.",
        creditLabel: "0 crédit",
      });
      return;
    }
    // Remplit le champ — l'utilisateur vérifie avant envoi (pas d'envoi auto)
    setInput(result.transcript);
  }

  function confirmPendingAction() {
    if (!pendingAction) return;
    const href = resolveActionHref(pendingAction);
    const label = pendingAction.label || pendingAction.name;
    setPendingAction(null);
    if (href) {
      append({
        role: "assistant",
        content: `C'est préparé. Je t'ouvre ${label}. Vérifie puis valide dans Batimum.`,
        creditLabel: "0 crédit",
      });
      router.push(href);
      return;
    }
    append({
      role: "assistant",
      content: `Action « ${label} » prête à être finalisée dans Batimum.`,
      creditLabel: "0 crédit",
    });
  }

  function startNewConversation() {
    setPendingAction(null);
    setInput("");
    saveDraft("");
    setMessages([
      {
        id: generateId(),
        role: "assistant",
        content: `Bonjour ${greetingName}. Je suis l'Assistant Batimum. Nouvelle conversation — que regardons-nous ?`,
        creditLabel: "0 crédit",
      },
    ]);
  }

  if (!hydrated) {
    return (
      <div className={cn("flex items-center justify-center p-6", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-white",
        compact ? "h-[min(520px,calc(100vh-9rem))]" : "h-[min(640px,70vh)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <button
          type="button"
          onClick={startNewConversation}
          className="text-[11px] font-medium text-emerald-700 hover:underline"
        >
          Nouvelle conversation
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-2",
              message.role === "user" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                message.role === "user" ? "bg-emerald-50" : "bg-slate-100",
              )}
            >
              {message.role === "user" ? (
                <User className="h-3.5 w-3.5 text-emerald-700" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-slate-500" />
              )}
            </span>
            <div className="max-w-[85%]">
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "border border-border/70 bg-white text-foreground",
                )}
              >
                {message.content}
              </div>
              {message.creditLabel && message.role === "assistant" ? (
                <p className="mt-0.5 pl-1 text-[10px] text-slate-400">
                  {message.creditLabel}
                  {message.reliability === "estimated" ||
                  message.reliability === "incomplete"
                    ? ` · ${message.reliability === "estimated" ? "Estimation" : "Données incomplètes"}`
                    : ""}
                </p>
              ) : null}
            </div>
          </div>
        ))}

        {thinking ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Réflexion en cours…
          </div>
        ) : null}

        {pendingAction ? (
          <div
            data-assistant-confirm
            className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3"
          >
            <p className="text-xs font-semibold text-emerald-900">
              Confirmation requise
            </p>
            <p className="mt-1 text-sm text-foreground">
              {pendingAction.label ||
                "Confirmez-vous cette action dans Batimum ?"}
            </p>
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" onClick={confirmPendingAction}>
                Confirmer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPendingAction(null);
                  append({
                    role: "assistant",
                    content: "Action annulée. Aucune modification.",
                    creditLabel: "0 crédit",
                  });
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {messages.length <= 2 && !thinking && !pendingAction && !inputDisabled ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-3 py-2">
          {WELCOME_SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-full border border-border/70 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
              onClick={() => void sendMessage(item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      <footer className="border-t border-border/60 p-3">
        {listening ? (
          <p className="mb-1.5 text-[11px] font-medium text-emerald-700">
            Écoute en cours…
          </p>
        ) : null}
        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => void handleMic()}
            disabled={thinking || inputDisabled}
            className={cn(
              "mb-0.5 rounded-xl p-2 transition-colors",
              listening
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-400 hover:bg-slate-50 hover:text-foreground",
            )}
            aria-label="Dicter"
            title={
              isSpeechRecognitionSupported()
                ? "Dicter (vérifier avant envoi)"
                : "Dictée non disponible"
            }
          >
            <Mic className={cn("h-4 w-4", listening && "animate-pulse")} />
          </button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(input);
              }
            }}
            rows={2}
            disabled={inputDisabled}
            placeholder={
              inputDisabled
                ? "Quota IA atteint — saisie désactivée"
                : "Posez votre question…"
            }
            className="min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border/70 bg-white px-3 py-2 text-[13px] outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-muted-foreground"
          />
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            disabled={!input.trim() || thinking || inputDisabled}
            onClick={() => void sendMessage(input)}
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
