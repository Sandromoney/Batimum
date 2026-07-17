import {
  V1_OUT_OF_SCOPE_REPLY,
  V1_NO_PENDING_CONFIRM_REPLY,
  V1_CANCEL_REPLY,
} from "@/lib/assistant-batimum/v1-charter";

export const GREETING_REPLY =
  "Bonjour. Comment puis-je vous aider sur Batimum ?";

export const READY_REPLY = "Oui, je suis prêt.";

export const THANKS_REPLY = "Avec plaisir.";

export const SMALL_TALK_REPLY =
  "Très bien, merci. Que souhaitez-vous faire sur Batimum ?";

export const ACK_REPLY = "D'accord.";

export const CANCEL_NO_PENDING_REPLY = V1_CANCEL_REPLY;

export const CONFIRM_NO_PENDING_REPLY = V1_NO_PENDING_CONFIRM_REPLY;

export const OFF_TOPIC_REPLY = V1_OUT_OF_SCOPE_REPLY;
