"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  applyAssistantActions,
  toggleAssistantAction,
} from "@/lib/batimum-assistant-actions";
import {
  buildConfirmationSummary,
  detectOrderedMissingFields,
  refineAssistantUnderstanding,
} from "@/lib/batimum-assistant-brain";
import { processCopilotTurn } from "@/lib/assistant-batimum/copilot-pipeline";
import {
  createEmptyMemory,
  loadAssistantMemory,
  saveAssistantMemory,
  updateMemoryAfterTurn,
} from "@/lib/assistant-batimum/assistant-memory";
import type { AssistantMemory } from "@/lib/assistant-batimum/assistant-memory";
import {
  applyCorrectionToDrafts,
  classifyContextualSignal,
  OFF_TOPIC_REPLY,
  replyCancel,
} from "@/lib/batimum-assistant-signals";
import {
  ASSISTANT_SESSION_RECONNECT_MESSAGE,
  mergeSessionAfterExecution,
  mergeSessionAfterUnderstanding,
  requestAssistantUnderstanding,
} from "@/lib/batimum-assistant-client";
import { planTurnFromLlmUnderstanding } from "@/lib/batimum-assistant-llm-bridge";
import { createDevisForClientInStore } from "@/lib/batimum-assistant-client-action";
import {
  executeAssistantIntent,
  resolveExecutionIntent,
  type AssistantFollowUpAction,
} from "@/lib/batimum-assistant-executor";
import {
  planAssistantTurn,
  type AssistantPendingAction,
} from "@/lib/batimum-assistant-orchestrator";
import type { AssistantProposedAction } from "@/lib/batimum-assistant-parser";
import type {
  AssistantAiData,
  AssistantSessionContext,
} from "@/lib/batimum-assistant-types";
import {
  getChatbotWelcomeMessage,
  processChatMessage,
  WELCOME_SUGGESTIONS,
  type ChatMessage,
  type ChatbotPendingConfirmation,
} from "@/lib/batimum-chatbot";
import { getDashboardGreetingName } from "@/lib/dashboard-today";
import {
  getAssistantRoutingDecision,
  isLocalAssistantQuery,
  LOCAL_CREDIT_LABEL,
  shouldCallAssistantUnderstandApi,
} from "@/lib/batimum-assistant-routing";
import { logAssistantDebug, logAssistantMode } from "@/lib/batimum-assistant-debug";
import { isPlanningAssignMessage } from "@/lib/batimum-assistant-planning";
import { useStore } from "@/lib/store";
import { cn, generateId } from "@/lib/utils";
import { Bot, Loader2, Mic, Paperclip, Send, User, Volume2 } from "lucide-react";
import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  listenOnce,
  speakText,
} from "@/lib/assistant-batimum/speech";
import {
  inferPreferencesFromMessage,
  loadDirectorPreferences,
  patchDirectorPreferences,
} from "@/lib/assistant-batimum/director-preferences";

export const CHAT_STORAGE_KEY = "batimum-assistant-chat-v1";
const SESSION_STORAGE_KEY = "batimum-assistant-session-v2";

function loadStoredMessages(): ChatMessage[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
}

function loadSession(): AssistantSessionContext {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AssistantSessionContext;
  } catch {
    return {};
  }
}

function saveSession(session: AssistantSessionContext) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function ChatBubble({
  message,
  creditLabel,
}: {
  message: ChatMessage;
  creditLabel?: string;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            isUser ? "bg-primary/12" : "bg-slate-100",
          )}
        >
          {isUser ? (
            <User className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
          ) : (
            <Bot className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
          )}
        </span>
        <div
          className={cn(
            "max-w-[min(100%,18rem)] rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-primary text-primary-foreground"
              : "border border-[#E5E7EB] bg-white text-foreground/90",
          )}
        >
          {message.content}
        </div>
      </div>
      {creditLabel && !isUser ? (
        <span className="pl-9 text-[10px] text-slate-400">{creditLabel}</span>
      ) : null}
    </div>
  );
}

export type BatimumAssistantChatProps = {
  className?: string;
  compact?: boolean;
};

export function BatimumAssistantChat({
  className,
  compact = false,
}: BatimumAssistantChatProps) {
  const router = useRouter();
  const { data, setData } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(WELCOME_SUGGESTIONS);
  const [pending, setPending] = useState<ChatbotPendingConfirmation | null>(null);
  const [confirmActions, setConfirmActions] = useState<AssistantProposedAction[]>([]);
  const [actionPending, setActionPending] = useState<AssistantPendingAction | null>(null);
  const [entityDrafts, setEntityDrafts] = useState<AssistantAiData>({});
  const [editingField, setEditingField] = useState<keyof AssistantAiData | null>(null);
  const [session, setSession] = useState<AssistantSessionContext>({});
  const [memory, setMemory] = useState<AssistantMemory>(() => createEmptyMemory());
  const [lastCreditLabel, setLastCreditLabel] = useState<string | undefined>();
  const [followUps, setFollowUps] = useState<AssistantFollowUpAction[]>([]);
  const [disambiguationCandidates, setDisambiguationCandidates] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceReply, setVoiceReply] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const greetingName = getDashboardGreetingName(data.parametres.utilisateur);

  useEffect(() => {
    const stored = loadStoredMessages();
    const storedSession = loadSession();
    const storedMemory = loadAssistantMemory();
    setSession(storedSession);
    setMemory(storedMemory);
    if (stored.length > 0) {
      setMessages(stored);
    } else {
      const welcome = getChatbotWelcomeMessage(greetingName);
      setMessages([
        {
          id: generateId(),
          role: "assistant",
          content: welcome.reply,
          timestamp: Date.now(),
        },
      ]);
      setSuggestions(welcome.suggestions ?? WELCOME_SUGGESTIONS);
    }
    setHydrated(true);
  }, [greetingName]);

  useEffect(() => {
    if (!hydrated || messages.length === 0) return;
    saveMessages(messages);
  }, [messages, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveSession(session);
  }, [session, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveAssistantMemory(memory);
  }, [memory, hydrated]);

  function syncMemoryAfterTurn(
    userMessage: string,
    assistantReply: string,
    patch?: Partial<AssistantSessionContext>,
    analysisIntent?: string,
    analysisModule?: string,
    analysisData?: Record<string, unknown>,
  ) {
    setMemory((prev) =>
      updateMemoryAfterTurn(prev, userMessage, assistantReply, {
        lastIntent: analysisIntent as AssistantMemory["lastIntent"],
        pendingAction: patch?.pending_intent ?? (patch?.awaiting_answer === false ? undefined : prev.pendingAction),
        pendingMissingField: patch?.missing_fields?.[0] ?? (patch?.awaiting_answer === false ? undefined : prev.pendingMissingField),
        pendingEntityData: patch?.pending_data ?? prev.pendingEntityData,
        awaitingAnswer: patch?.awaiting_answer ?? false,
        lastQuestionAsked: patch?.awaiting_answer ? assistantReply : prev.lastQuestionAsked,
        lastTopic: patch?.last_topic ?? prev.lastTopic,
        currentClient: patch?.last_client_name ?? prev.currentClient,
      }, {
        analysisIntent,
        analysisModule,
        analysisData,
        currentPath: typeof window !== "undefined" ? window.location.pathname : undefined,
        appData: data,
      }),
    );
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending, actionPending, thinking, followUps, disambiguationCandidates]);

  const appendMessage = useCallback((role: ChatMessage["role"], content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role, content, timestamp: Date.now() },
    ]);
    if (role === "assistant" && voiceReply && content.trim()) {
      // Réponse vocale courte — architecture TTS prête (Web Speech / futur cloud)
      speakText({ text: content.slice(0, 280) });
    }
  }, [voiceReply]);

  async function handleMic() {
    if (listening || thinking) return;
    if (!isSpeechRecognitionSupported()) {
      appendMessage(
        "assistant",
        "La dictée n'est pas dispo sur ce navigateur. Tape ton message.",
      );
      return;
    }
    setListening(true);
    const result = await listenOnce({ lang: "fr-FR" });
    setListening(false);
    if (!result?.transcript) {
      appendMessage("assistant", "J'ai rien capté. Réessaie.");
      return;
    }
    setInput(result.transcript);
    void sendMessage(result.transcript);
  }

  function handleFileAttach(file: File | null) {
    if (!file) return;
    appendMessage(
      "assistant",
      `Fichier « ${file.name} » prêt. Dis-moi ce que tu veux en faire (devis, achat, facture…).`,
    );
    // Architecture : le fichier sera branché sur OCR / import plus tard.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetConfirmationStates() {
    setPending(null);
    setConfirmActions([]);
    setActionPending(null);
    setEntityDrafts({});
    setEditingField(null);
    setFollowUps([]);
    setDisambiguationCandidates([]);
  }

  function applyActionPending(pendingAction: AssistantPendingAction) {
    setActionPending(pendingAction);
    setEntityDrafts({ ...pendingAction.data });
    setEditingField(null);
  }

  function replyWithLocalChatbot(trimmed: string) {
    const result = processChatMessage(trimmed, data);
    setLastCreditLabel(LOCAL_CREDIT_LABEL);
    appendMessage("assistant", result.reply);
    if (result.suggestions?.length) setSuggestions(result.suggestions);
    if (result.pendingConfirmation) {
      setPending(result.pendingConfirmation);
      setConfirmActions(result.pendingConfirmation.actions);
    }
    if (result.navigateTo) {
      window.setTimeout(() => router.push(result.navigateTo!), 800);
    }
  }

  function clearSessionPending() {
    setSession((prev) => ({
      ...prev,
      pending_intent: undefined,
      pending_data: undefined,
      missing_fields: undefined,
      disambiguation_candidates: undefined,
    }));
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    const inferred = inferPreferencesFromMessage(
      trimmed,
      loadDirectorPreferences(),
    );
    if (inferred) {
      patchDirectorPreferences(inferred);
      setMemory((prev) => ({
        ...prev,
        habits: {
          ...(prev.habits ?? {}),
          pricesHt: inferred.pricesHt ? "ht" : "ttc",
          margins: inferred.marginsInEuros ? "euros" : "percent",
          ...(inferred.preferredSupplier
            ? { preferredSupplier: inferred.preferredSupplier }
            : {}),
          ...(inferred.preferredCompareSupplier
            ? { preferredCompareSupplier: inferred.preferredCompareSupplier }
            : {}),
        },
      }));
    }

    appendMessage("user", trimmed);
    setInput("");
    setThinking(true);

    const signal = classifyContextualSignal(trimmed, {
      hasActionPending: Boolean(actionPending),
      hasLegacyPending: Boolean(pending),
      hasDisambiguation: disambiguationCandidates.length > 0,
      hasClarificationSession: Boolean(
        session.pending_intent && session.missing_fields?.length,
      ),
      actionPending,
      entityDrafts,
      session,
    });

    if (signal.kind === "off_topic") {
      setLastCreditLabel(LOCAL_CREDIT_LABEL);
      appendMessage("assistant", signal.reply ?? OFF_TOPIC_REPLY);
      setThinking(false);
      return;
    }

    if (signal.kind === "confirm" && actionPending) {
      setThinking(false);
      handleActionConfirm();
      return;
    }

    if (signal.kind === "confirm" && pending) {
      setThinking(false);
      handleLegacyConfirm();
      return;
    }

    if (signal.kind === "cancel") {
      resetConfirmationStates();
      clearSessionPending();
      setLastCreditLabel(undefined);
      appendMessage("assistant", signal.reply ?? replyCancel());
      setThinking(false);
      return;
    }

    if (signal.kind === "deny") {
      resetConfirmationStates();
      clearSessionPending();
      appendMessage("assistant", replyCancel());
      setThinking(false);
      return;
    }

    if (signal.kind === "correction" && signal.correction) {
      if (actionPending) {
        const updated = applyCorrectionToDrafts(entityDrafts, signal.correction);
        setEntityDrafts(updated);
        setActionPending({ ...actionPending, data: updated });
        appendMessage(
          "assistant",
          `${buildConfirmationSummary(actionPending.intent, updated)}\n\n(J'ai pris en compte votre correction.)`,
        );
        setThinking(false);
        return;
      }
      if (session.pending_intent) {
        const updated = applyCorrectionToDrafts(
          session.pending_data ?? {},
          signal.correction,
        );
        const missing = detectOrderedMissingFields(session.pending_intent, updated);
        const refined = refineAssistantUnderstanding(
          {
            intent: session.pending_intent,
            confidence: 0.9,
            data: updated,
            missing_fields: missing,
          },
          data,
        );
        const plan = planAssistantTurn(
          refined.understanding,
          { ...session, pending_data: updated },
          LOCAL_CREDIT_LABEL,
          refined.disambiguation,
        );
        if (plan.kind === "clarify" || plan.kind === "disambiguate") {
          setSession(plan.session);
          if (plan.kind === "disambiguate") setDisambiguationCandidates(plan.candidates);
          appendMessage("assistant", plan.reply);
        } else if (plan.kind === "pending") {
          applyActionPending(plan.pending);
          appendMessage("assistant", plan.reply);
        }
        setLastCreditLabel(LOCAL_CREDIT_LABEL);
        setThinking(false);
        return;
      }
      const correctedName = signal.correction.nom ?? signal.correction.client;
      if (correctedName) {
        setSession((prev) => ({
          ...prev,
          pending_intent: "create_client",
          pending_data: { nom: correctedName },
          missing_fields: ["nom_complet"],
        }));
        setLastCreditLabel(LOCAL_CREDIT_LABEL);
        appendMessage(
          "assistant",
          `Très bien, j'ai bien noté le nom : ${correctedName}.\n\nSouhaitez-vous créer un client avec ce nom ?`,
        );
        setThinking(false);
        return;
      }
    }

    if (signal.kind === "thanks" || signal.kind === "ack" || signal.kind === "ambiguous_yes") {
      setLastCreditLabel(LOCAL_CREDIT_LABEL);
      appendMessage("assistant", signal.reply ?? "D'accord.");
      setThinking(false);
      return;
    }

    const hasPending =
      Boolean(actionPending) ||
      Boolean(pending) ||
      Boolean(session.pending_intent && session.missing_fields?.length);

    const hasPendingIntent = Boolean(session.pending_intent);
    const routingDecision = getAssistantRoutingDecision(trimmed, {
      hasPendingAction: hasPending,
      hasPendingIntent,
    });
    if (routingDecision.forceOpenAi) {
      console.log(`[ASSISTANT ROUTING] message="${trimmed}"`);
      console.log(
        `[ASSISTANT ROUTING] category=${routingDecision.category ?? "business_action"}`,
      );
      console.log(
        `[ASSISTANT ROUTING] source=${routingDecision.source ?? "OPENAI"}`,
      );
      console.log(
        `[ASSISTANT ROUTING] reason=${routingDecision.reason ?? "create_client_without_name"}`,
      );
    }
    const routeToOpenAi = shouldCallAssistantUnderstandApi(trimmed, {
      hasPendingAction: hasPending,
      hasPendingIntent,
    });
    if (!routingDecision.forceOpenAi) {
      const category = routeToOpenAi ? "business_or_analysis" : "politeness";
      const source = routeToOpenAi ? "OPENAI" : "LOCAL";
      const reason = routeToOpenAi
        ? "v1_openai_default"
        : "strict_politeness_only";
      const credits = routeToOpenAi ? 1 : 0;
      console.log(`[ASSISTANT ROUTING] message="${trimmed}"`);
      console.log(`[ASSISTANT ROUTING] category=${category}`);
      console.log(`[ASSISTANT ROUTING] source=${source}`);
      console.log(`[ASSISTANT ROUTING] reason=${reason}`);
      console.log(`[ASSISTANT ROUTING] credits=${credits}`);
    } else {
      console.log("[ASSISTANT ROUTING] credits=1");
    }

    const isSlotFilling =
      Boolean(session.pending_intent && session.missing_fields?.length) ||
      disambiguationCandidates.length > 0;

    const brain = processCopilotTurn(trimmed, data, {
      hasPendingAction: hasPending,
      hasLegacyPending: Boolean(pending),
      hasPendingIntent,
      session,
      memory,
      currentPath: typeof window !== "undefined" ? window.location.pathname : undefined,
    });

    logAssistantDebug("chat_brain_result", {
      message: trimmed,
      mode: "local",
      intent: brain.analysis?.intent,
      operation: (brain.analysis?.data as Record<string, unknown> | undefined)?.operation,
      entities: brain.analysis?.data,
      handled: brain.handled,
      needsApi: brain.needsApi,
      fallback: false,
      isPlanningAssign: isPlanningAssignMessage(trimmed),
    });

    if (brain.confirmAction) {
      setThinking(false);
      if (actionPending) handleActionConfirm();
      else if (pending) handleLegacyConfirm();
      return;
    }

    if (brain.cancelAction) {
      resetConfirmationStates();
      clearSessionPending();
      setLastCreditLabel(LOCAL_CREDIT_LABEL);
      appendMessage("assistant", brain.reply);
      setThinking(false);
      return;
    }

    if (brain.handled && brain.reply && !routingDecision.forceOpenAi) {
      logAssistantMode("local", "LOCAL", {
        intent: brain.analysis?.intent,
        operation: (brain.analysis?.data as Record<string, unknown> | undefined)?.operation,
      });
      const genericNoData =
        brain.reply.includes("information n'est pas encore renseignée") ||
        brain.reply.includes("information n’est pas encore renseignée");
      if (genericNoData) {
        logAssistantDebug("chat_generic_fallback_blocked", {
          message: trimmed,
          mode: "local",
          intent: brain.analysis?.intent,
          fallback: true,
          reason: "generic_no_data_reply",
        });
      } else {
        logAssistantDebug("chat_local_reply", {
          message: trimmed,
          mode: "local",
          intent: brain.analysis?.intent,
          entities: brain.analysis?.data,
          fallback: false,
          replyPreview: brain.reply.slice(0, 160),
        });
      }
      const resetWorkflow = Boolean(
        (brain.analysis?.data as Record<string, unknown> | undefined)?.reset_previous_workflow,
      );
      if (resetWorkflow) {
        resetConfirmationStates();
      }
      setLastCreditLabel(brain.creditLabel ?? LOCAL_CREDIT_LABEL);
      appendMessage("assistant", brain.reply);
      if (brain.suggestions?.length) setSuggestions(brain.suggestions);
      if (brain.pendingConfirmation) {
        setPending(brain.pendingConfirmation);
        setConfirmActions(brain.pendingConfirmation.actions);
      }
      if (brain.pendingAction) {
        applyActionPending(brain.pendingAction);
      }
      if (brain.navigateTo) {
        window.setTimeout(() => router.push(brain.navigateTo!), 800);
      }
      const sessionPatch = brain.sessionPatch ?? {};
      setSession((prev) => ({
        ...prev,
        ...sessionPatch,
        recent_messages: [
          ...(prev.recent_messages ?? []),
          { role: "user" as const, content: trimmed },
          { role: "assistant" as const, content: brain.reply },
        ].slice(-8),
      }));
      syncMemoryAfterTurn(
        trimmed,
        brain.reply,
        sessionPatch,
        brain.analysis?.intent,
        brain.analysis?.module,
        brain.analysis?.data as Record<string, unknown> | undefined,
      );
      setThinking(false);
      return;
    }

    if (!isSlotFilling) {
      resetConfirmationStates();
    }

    if (!brain.needsApi && !shouldCallAssistantUnderstandApi(trimmed, {
      hasPendingAction: hasPending,
      hasPendingIntent,
    })) {
      logAssistantMode("local", "LOCAL", { reason: "chatbot_fallback" });
      logAssistantDebug("chat_local_chatbot_fallback", {
        message: trimmed,
        mode: "local",
        fallback: true,
        reason: "no_api_needed",
      });
      replyWithLocalChatbot(trimmed);
      setThinking(false);
      return;
    }

    logAssistantMode("assistant_openai", "OPENAI", {
      reason: brain.needsApi ? "brain_needs_api" : "routing_force_api",
      message: trimmed,
    });
    logAssistantDebug("chat_api_request", {
      message: trimmed,
      mode: "assistant_openai",
      reason: brain.needsApi ? "brain_needs_api" : "routing_force_api",
    });

    const recentMessages = [
      ...(session.recent_messages ?? []),
      { role: "user" as const, content: trimmed },
    ].slice(-8);

    const sessionWithHistory: AssistantSessionContext = {
      ...session,
      recent_messages: recentMessages,
    };

    const apiResult = await requestAssistantUnderstanding({
      message: trimmed,
      data,
      session: sessionWithHistory,
      currentPage: typeof window !== "undefined" ? window.location.pathname : undefined,
    });

    logAssistantMode(
      apiResult.used_ai ? "assistant_openai" : "assistant_openai_fallback_local",
      apiResult.used_ai ? "OPENAI" : "LOCAL",
      {
        intent: apiResult.llm?.intent ?? apiResult.understanding?.intent,
        success: apiResult.success,
      },
    );
    logAssistantDebug("chat_api_response", {
      message: trimmed,
      mode: apiResult.used_ai ? "assistant_openai" : "local",
      success: apiResult.success,
      intent: apiResult.llm?.intent ?? apiResult.understanding?.intent,
      entities: apiResult.llm?.entities ?? apiResult.understanding?.data,
      usedAi: apiResult.used_ai,
      fallback: !apiResult.success,
      reason: apiResult.error,
    });

    if (apiResult.success && apiResult.llm) {
      setLastCreditLabel(apiResult.credit_label);
      const llmPlan = planTurnFromLlmUnderstanding(
        apiResult.llm,
        trimmed,
        data,
        sessionWithHistory,
        {
          hasPendingAction: hasPending,
          hasPendingIntent,
          session: sessionWithHistory,
          memory,
          currentPath: typeof window !== "undefined" ? window.location.pathname : undefined,
        },
        apiResult.credit_label,
      );

      if (llmPlan.kind === "clarify") {
        setSession({
          ...llmPlan.session,
          recent_messages: [
            ...recentMessages,
            { role: "assistant", content: llmPlan.reply },
          ],
        });
        appendMessage("assistant", llmPlan.reply);
        setThinking(false);
        return;
      }

      if (llmPlan.kind === "answer") {
        appendMessage("assistant", llmPlan.reply);
        if (llmPlan.navigateTo) {
          window.setTimeout(() => router.push(llmPlan.navigateTo!), 800);
        }
        setThinking(false);
        return;
      }

      if (llmPlan.kind === "confirm") {
        setSession({
          ...llmPlan.session,
          recent_messages: [
            ...recentMessages,
            { role: "assistant", content: llmPlan.reply },
          ],
        });
        appendMessage("assistant", llmPlan.reply);
        if (llmPlan.pendingAction) {
          applyActionPending(llmPlan.pendingAction);
        }
        setThinking(false);
        return;
      }

      if (llmPlan.kind === "reject") {
        appendMessage("assistant", llmPlan.reply);
        setThinking(false);
        return;
      }
    }

    if (apiResult.success && apiResult.understanding) {
      setLastCreditLabel(apiResult.credit_label);
      const refined = refineAssistantUnderstanding(apiResult.understanding, data);
      const updatedSession = mergeSessionAfterUnderstanding(
        sessionWithHistory,
        refined.understanding,
      );
      const plan = planAssistantTurn(
        refined.understanding,
        updatedSession,
        apiResult.credit_label,
        refined.disambiguation,
      );

      if (plan.kind === "clarify") {
        setSession({
          ...plan.session,
          recent_messages: [
            ...recentMessages,
            { role: "assistant", content: plan.reply },
          ],
        });
        appendMessage("assistant", plan.reply);
        setThinking(false);
        return;
      }

      if (plan.kind === "disambiguate") {
        setSession({
          ...plan.session,
          recent_messages: [
            ...recentMessages,
            { role: "assistant", content: plan.reply },
          ],
        });
        setDisambiguationCandidates(plan.candidates);
        appendMessage("assistant", plan.reply);
        setThinking(false);
        return;
      }

      if (plan.kind === "pending") {
        setSession({
          ...updatedSession,
          recent_messages: [
            ...recentMessages,
            { role: "assistant", content: plan.reply },
          ],
        });
        appendMessage("assistant", plan.reply);
        applyActionPending(plan.pending);
        setThinking(false);
        return;
      }

      if (plan.kind === "not_available" || plan.kind === "conversation") {
        setSession(updatedSession);
        appendMessage("assistant", plan.reply);
        setThinking(false);
        return;
      }

      if (plan.kind === "fallback") {
        const fallbackBrain = processCopilotTurn(trimmed, data, {
          hasPendingAction: hasPending,
          hasPendingIntent,
          session,
        });
        setLastCreditLabel(LOCAL_CREDIT_LABEL);
        appendMessage(
          "assistant",
          fallbackBrain.reply ||
            "Je n'ai pas suffisamment compris votre demande pour agir.",
        );
        setThinking(false);
        return;
      }
    }

    if (apiResult.auth_required) {
      if (isLocalAssistantQuery(trimmed, {
        hasPendingAction: hasPending,
        hasPendingIntent,
      })) {
        replyWithLocalChatbot(trimmed);
      } else {
        appendMessage("assistant", ASSISTANT_SESSION_RECONNECT_MESSAGE);
      }
      setThinking(false);
      return;
    }

    if (apiResult.quota_exceeded) {
      replyWithLocalChatbot(trimmed);
      setThinking(false);
      return;
    }

    if (!apiResult.success && apiResult.error) {
      const isReconnect =
        apiResult.error === ASSISTANT_SESSION_RECONNECT_MESSAGE ||
        apiResult.auth_required;
      if (isReconnect) {
        appendMessage("assistant", ASSISTANT_SESSION_RECONNECT_MESSAGE);
        setThinking(false);
        return;
      }
    }

    replyWithLocalChatbot(trimmed);
    setThinking(false);
  }

  function handleActionConfirm() {
    if (!actionPending) return;

    setSubmitting(true);

    const executionIntent = resolveExecutionIntent(
      actionPending.intent,
      entityDrafts,
    );

    const { nextData, outcome } = executeAssistantIntent(
      executionIntent,
      entityDrafts,
      data,
      {
        preferredClientId: session.last_client_id,
        preferredClientName: session.last_client_name,
        securityGuard: {
          approved: true,
          confidence: Math.max(actionPending.securityGuard?.confidence ?? 0.95, 0.95),
          source: actionPending.securityGuard?.source ?? "orchestrator",
        },
      },
    );

    if (outcome.success) {
      setData(nextData);
    }

    setSubmitting(false);
    setActionPending(null);
    setEntityDrafts({});
    setEditingField(null);
    appendMessage("assistant", outcome.message);
    setLastCreditLabel(undefined);

    if (outcome.success) {
      setSession((prev) =>
        mergeSessionAfterExecution(
          prev,
          entityDrafts,
          outcome.clientId,
          outcome.clientName,
        ),
      );
      clearSessionPending();
    }

    if (outcome.navigateTo && outcome.success) {
      window.setTimeout(() => router.push(outcome.navigateTo!), 600);
    }
  }

  function handleFollowUp(action: AssistantFollowUpAction) {
    if (action.kind === "navigate" && action.href) {
      router.push(action.href);
      setFollowUps([]);
      return;
    }
    if (action.kind === "create_devis" && session.last_client_id) {
      const { nextData, devisId } = createDevisForClientInStore(
        data,
        session.last_client_id,
      );
      setData(nextData);
      setFollowUps([]);
      appendMessage("assistant", "Devis brouillon créé pour ce client.");
      router.push(`/devis/${devisId}`);
      return;
    }
    if (action.kind === "create_appointment" && session.last_client_name) {
      setFollowUps([]);
      void sendMessage(
        `Planifie un rendez-vous demain à 9h pour ${session.last_client_name}`,
      );
    }
  }

  function handleLegacyConfirm() {
    if (!pending) return;
    setSubmitting(true);
    const selectedIds = confirmActions
      .filter((action) => action.enabled)
      .map((action) => action.id);
    const { nextData, result } = applyAssistantActions(
      data,
      pending.parseResult,
      selectedIds,
    );
    setData(nextData);
    setSubmitting(false);
    setPending(null);
    setConfirmActions([]);
    appendMessage("assistant", "C'est fait. Les actions sélectionnées ont été appliquées.");

    if (result.devisId) router.push(`/devis/${result.devisId}`);
    else if (result.chantierId) router.push(`/chantiers/${result.chantierId}`);
    else if (result.navigateTo) router.push(result.navigateTo);
    else if (result.planningId) router.push("/planning");
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        ref={scrollRef}
        className={cn(
          "flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4",
          compact ? "min-h-0" : "min-h-[14rem] max-h-[min(28rem,50vh)]",
        )}
      >
        {messages.map((message, index) => (
          <ChatBubble
            key={message.id}
            message={message}
            creditLabel={
              index === messages.length - 1 &&
              message.role === "assistant" &&
              lastCreditLabel
                ? lastCreditLabel
                : undefined
            }
          />
        ))}

        {thinking ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Batimum analyse votre demande…
          </div>
        ) : null}

        {actionPending ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-slate-50/80 p-3">
            <p className="text-xs font-medium text-foreground">
              {actionPending.intent === "create_client"
                ? "Je vais créer le client suivant :"
                : "Confirmation"}
            </p>
            {actionPending.editableFields.map((field) => (
              <div key={field.key} className="mt-2">
                {editingField === field.key ? (
                  <input
                    value={entityDrafts[field.key] ?? ""}
                    onChange={(event) =>
                      setEntityDrafts((prev) => ({
                        ...prev,
                        [field.key]: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    autoFocus
                  />
                ) : (
                  <p className="text-sm text-foreground/90">
                    {field.label} :{" "}
                    <span className="font-medium">{entityDrafts[field.key]}</span>
                  </p>
                )}
              </div>
            ))}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleActionConfirm}
                disabled={submitting}
              >
                Confirmer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setEditingField((current) =>
                    current
                      ? null
                      : (actionPending.editableFields[0]?.key ?? null),
                  )
                }
              >
                Modifier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setActionPending(null);
                  setEntityDrafts({});
                  setEditingField(null);
                  appendMessage("assistant", "Action annulée.");
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : null}

        {pending ? (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {pending.title}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
              {pending.summary}
            </p>
            <ul className="mt-3 space-y-2">
              {confirmActions.map((action) => (
                <li key={action.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 hover:bg-white/60">
                    <input
                      type="checkbox"
                      checked={action.enabled}
                      onChange={(event) =>
                        setConfirmActions(
                          toggleAssistantAction(
                            confirmActions,
                            action.id,
                            event.target.checked,
                          ),
                        )
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm text-foreground">{action.label}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleLegacyConfirm}
                disabled={
                  submitting || confirmActions.filter((a) => a.enabled).length === 0
                }
              >
                Confirmer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setPending(null);
                  setConfirmActions([]);
                  appendMessage("assistant", "Action annulée.");
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : null}

        {disambiguationCandidates.length > 0 ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-slate-50/80 p-3">
            <p className="text-xs font-medium text-foreground">Choisir un client</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {disambiguationCandidates.map((candidate, index) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => void sendMessage(String(index + 1))}
                  className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  {index + 1}. {candidate.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {followUps.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {followUps.map((action) => (
              <Button
                key={action.id}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => handleFollowUp(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {suggestions.length > 0 && !pending && !actionPending && disambiguationCandidates.length === 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-[#E5E7EB] px-3 py-2">
          {suggestions.slice(0, 3).map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] text-slate-500 transition-colors hover:border-slate-300 hover:text-foreground"
              onClick={() => void sendMessage(item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      <footer className="border-t border-[#E5E7EB] p-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.doc,.docx"
          onChange={(event) =>
            handleFileAttach(event.target.files?.[0] ?? null)
          }
        />
        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mb-0.5 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-foreground"
            aria-label="Joindre un fichier"
            title="Joindre un fichier"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleMic()}
            disabled={thinking}
            className={cn(
              "mb-0.5 rounded-xl p-2 transition-colors",
              listening
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-400 hover:bg-slate-50 hover:text-foreground",
            )}
            aria-label="Dicter"
            title={
              isSpeechRecognitionSupported()
                ? "Parler à l'assistant"
                : "Dictée non supportée"
            }
          >
            <Mic className={cn("h-4 w-4", listening && "animate-pulse")} />
          </button>
          {isSpeechSynthesisSupported() ? (
            <button
              type="button"
              onClick={() => setVoiceReply((v) => !v)}
              className={cn(
                "mb-0.5 rounded-xl p-2 transition-colors",
                voiceReply
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-400 hover:bg-slate-50 hover:text-foreground",
              )}
              aria-label="Réponse vocale"
              title="Réponse vocale"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          ) : null}
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
            placeholder={listening ? "Écoute…" : "Écrivez ou dictez…"}
            className="min-h-[2.5rem] flex-1 resize-none rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || thinking}
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
