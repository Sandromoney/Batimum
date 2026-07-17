export type GoogleOAuthFlow = "connect" | "signup" | "login";

export const EMAIL_OAUTH_FLOW_COOKIE = "btp_oauth_flow";

export function getGoogleOAuthAuthorizePath(
  flow: GoogleOAuthFlow = "connect",
): string {
  if (flow === "signup") {
    return "/api/email/oauth/google?flow=signup";
  }
  if (flow === "login") {
    return "/api/email/oauth/google?flow=login";
  }
  return "/api/email/oauth/google";
}

export function parseGoogleOAuthFlow(
  value: string | null | undefined,
): GoogleOAuthFlow {
  if (value === "signup" || value === "login") return value;
  return "connect";
}

export function isGoogleSignupFlow(flow: string | null | undefined): boolean {
  return flow === "signup";
}

export function isGoogleLoginFlow(flow: string | null | undefined): boolean {
  return flow === "login";
}

export function oauthFlowRedirectBase(
  appUrl: string,
  flow: GoogleOAuthFlow,
): string {
  switch (flow) {
    case "signup":
      return `${appUrl}/signup`;
    case "login":
      return `${appUrl}/login`;
    default:
      return `${appUrl}/parametres`;
  }
}

export function oauthFlowErrorQuery(
  flow: GoogleOAuthFlow,
  message: string,
): string {
  if (flow === "connect") {
    return `section=connexion-email&email_oauth=error&message=${encodeURIComponent(message)}`;
  }
  return `error=${encodeURIComponent(message)}`;
}
