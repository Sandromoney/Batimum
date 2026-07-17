import type { AppData } from "@/lib/types";
import { tryLocalAssistantUnderstanding } from "@/lib/batimum-assistant-local-bridge";
import type { AssistantSessionContext } from "@/lib/batimum-assistant-types";

/** Compatibilité — délègue au pont local. */
export function routeLocalCommand(
  text: string,
  _data: AppData,
  session?: AssistantSessionContext,
) {
  const understanding = tryLocalAssistantUnderstanding(text, session);
  if (!understanding) return null;
  return { understanding };
}

export { splitClientName } from "@/lib/batimum-nlu";
