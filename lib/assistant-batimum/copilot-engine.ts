import type { AssistantAnalysis, AssistantBrainContext } from "@/lib/assistant-batimum/assistant-types";
import type { AppData } from "@/lib/types";

export type CopilotPriority = "critical" | "important" | "normal" | "info";

export type CopilotRecommendation = {
  id: string;
  priority: CopilotPriority;
  message: string;
  actionLabel?: string;
  actionPath?: string;
  reason: string;
};

/** V1 : pas de recommandations proactives non demandées. */
export function buildCopilotRecommendation(
  _data: AppData,
  _context: AssistantBrainContext,
  _analysis?: AssistantAnalysis,
): CopilotRecommendation | null {
  return null;
}
