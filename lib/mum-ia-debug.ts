const CLIENT_DEBUG =
  typeof window !== "undefined" &&
  (process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_MUM_IA_DEBUG === "true");

const SERVER_DEBUG =
  process.env.NODE_ENV === "development" ||
  process.env.MUM_IA_DEBUG === "true";

export function isMumIaDebugEnabled(): boolean {
  if (typeof window !== "undefined") return CLIENT_DEBUG;
  return SERVER_DEBUG;
}

export function mumIaClientDebug(step: string, data?: Record<string, unknown>) {
  if (!CLIENT_DEBUG) return;
  console.groupCollapsed(`[MUM IA debug] ${step}`);
  if (data) console.log(data);
  console.groupEnd();
}

export function mumIaServerDebug(
  step: string,
  data?: Record<string, unknown>,
) {
  if (!SERVER_DEBUG) return;
  console.info("[MUM IA debug]", step, data ?? "");
}
