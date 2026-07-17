export {
  aiService,
  AI_MODELS,
  type AiServiceCallParams,
  type AiServiceCallResult,
  type AiServiceCredits,
  type AiServiceMessage,
  type AiServiceMode,
  type AiJsonSchemaConfig,
} from "@/lib/ai/ai-service";

export {
  ASSISTANT_SYSTEM_PROMPT,
  DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
  MUM_DEVIS_SYSTEM_PROMPT,
  getAiModeSystemPrompt,
} from "@/lib/ai/ai-prompts";

export {
  getAiUsage,
  checkAiCreditAvailable,
  consumeAiCreditAfterSuccess,
  getAiUsagePercentage,
  type AiCreditCategory,
  type AiUsageView,
} from "@/lib/ai/ai-credits";
