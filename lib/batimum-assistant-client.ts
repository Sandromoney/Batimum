import { buildAssistantUnderstandPayload } from "@/lib/batimum-assistant-context";

import { tryLocalAssistantUnderstanding } from "@/lib/batimum-assistant-local-bridge";

import type {

  AssistantAiUnderstanding,

  AssistantSessionContext,

  AssistantUnderstandResponse,

} from "@/lib/batimum-assistant-types";

import {

  AI_CREDIT_LABEL,

  LOCAL_CREDIT_LABEL,

} from "@/lib/batimum-assistant-routing";

import { MumIaAuthError, authenticatedFetch } from "@/lib/mum-ia-api-client";

import type { AppData } from "@/lib/types";



export const ASSISTANT_SESSION_RECONNECT_MESSAGE =

  "Votre session doit être reconnectée pour utiliser l'assistant.";



export async function requestAssistantUnderstanding(params: {

  message: string;

  data: AppData;

  session: AssistantSessionContext;

  currentPage?: string;

}): Promise<AssistantUnderstandResponse> {

  const understandPayload = buildAssistantUnderstandPayload(

    params.data,

    params.session,

    {

      message: params.message,

      currentPage: params.currentPage,

      conversationHistory: params.session.recent_messages,

    },

  );



  try {

    const response = await authenticatedFetch(

      "/api/assistant/understand",

      {

        method: "POST",

        body: JSON.stringify({
          session: params.session,
          app_context: understandPayload,
          ...understandPayload,
        }),

      },

      "comprendre",

    );



    const payload = (await response.json()) as AssistantUnderstandResponse & {

      code?: string;

    };



    if (response.ok) {

      return payload;

    }



    if (response.status === 401 || payload.code === "unauthenticated") {

      return {

        success: false,

        used_ai: false,

        auth_required: true,

        error: ASSISTANT_SESSION_RECONNECT_MESSAGE,

      };

    }

  } catch (error) {

    if (error instanceof MumIaAuthError) {

      return {

        success: false,

        used_ai: false,

        auth_required: true,

        error: ASSISTANT_SESSION_RECONNECT_MESSAGE,

      };

    }

  }



  return fallbackLocal(params.message, params.session, params.data);

}



function fallbackLocal(

  message: string,

  session: AssistantSessionContext,

  data: AppData,

): AssistantUnderstandResponse {

  const local = tryLocalAssistantUnderstanding(message, session, data);

  if (local) {

    return {

      success: true,

      understanding: local,

      used_ai: false,

      credit_label: LOCAL_CREDIT_LABEL,

    };

  }

  return {

    success: false,

    used_ai: false,

  };

}



export function mergeSessionAfterUnderstanding(

  session: AssistantSessionContext,

  understanding: AssistantAiUnderstanding,

): AssistantSessionContext {

  const clientName =

    understanding.data.client ?? understanding.data.nom ?? session.last_client_name;



  const hasPending = understanding.missing_fields.length > 0;



  return {

    ...session,

    pending_intent: hasPending ? understanding.intent : undefined,

    pending_data: hasPending ? understanding.data : undefined,

    missing_fields: hasPending ? understanding.missing_fields : undefined,

    disambiguation_candidates: hasPending

      ? session.disambiguation_candidates

      : undefined,

    last_client_name: clientName ?? session.last_client_name,

  };

}



export function mergeSessionAfterExecution(

  session: AssistantSessionContext,

  data: AssistantAiUnderstanding["data"],

  clientId?: string,

  clientName?: string,

): AssistantSessionContext {

  return {

    ...session,

    pending_intent: undefined,

    pending_data: undefined,

    missing_fields: undefined,

    last_client_id: clientId ?? session.last_client_id,

    last_client_name: clientName ?? data.client ?? data.nom ?? session.last_client_name,

  };

}



export { AI_CREDIT_LABEL, LOCAL_CREDIT_LABEL };


