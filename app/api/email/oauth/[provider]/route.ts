import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildGoogleAuthorizeUrl,
  buildMicrosoftAuthorizeUrl,
} from "@/lib/email-provider/oauth";
import { getOAuthStateCookieOptions } from "@/lib/email-provider/oauth-cookies";
import { createSignedOAuthState } from "@/lib/email-provider/oauth-state";
import {
  EMAIL_OAUTH_FLOW_COOKIE,
  EMAIL_OAUTH_STATE_COOKIE,
} from "@/lib/email-provider/token-cookie";
import {
  oauthFlowErrorQuery,
  oauthFlowRedirectBase,
  parseGoogleOAuthFlow,
} from "@/lib/email-provider/oauth-flow";
import {
  formatGmailConfigMissingMessage,
  GMAIL_CONFIG_INCOMPLETE_MESSAGE,
  getAppBaseUrl,
  logGmailConfigMissing,
  logGmailRedirectUriDiagnostics,
  validateGmailOAuthConfig,
} from "@/lib/gmail-oauth-config";

export const runtime = "nodejs";

type Provider = "google" | "microsoft";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  const provider = rawProvider as Provider;
  const requestUrl = new URL(request.url);
  const flow = parseGoogleOAuthFlow(requestUrl.searchParams.get("flow"));
  const appUrl = getAppBaseUrl();
  const requestHost = requestUrl.host;

  if (provider === "google") {
    console.log("[gmail-oauth-start] start", { flow, requestHost });

    const config = validateGmailOAuthConfig();
    if (!config.ok) {
      logGmailConfigMissing(config.missing);
      return NextResponse.redirect(
        `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, formatGmailConfigMissingMessage(config.missing))}`,
      );
    }

    logGmailRedirectUriDiagnostics("[gmail-oauth-start]");
  }

  if (provider !== "google" && provider !== "microsoft") {
    return NextResponse.json({ error: "Fournisseur inconnu." }, { status: 400 });
  }

  if ((flow === "signup" || flow === "login") && provider !== "google") {
    return NextResponse.redirect(
      `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, "L'authentification Google est requise pour cette action.")}`,
    );
  }

  try {
    const { state, nonce } = createSignedOAuthState();
    console.log("[gmail-oauth-state] generated", {
      nonceLength: nonce.length,
      stateLength: state.length,
      flow,
      provider,
      requestHost,
    });

    const authorizeUrl =
      provider === "google"
        ? buildGoogleAuthorizeUrl(state)
        : buildMicrosoftAuthorizeUrl(state);

    const response = NextResponse.redirect(authorizeUrl);
    const cookieOptions = getOAuthStateCookieOptions();

    response.cookies.set(EMAIL_OAUTH_STATE_COOKIE, nonce, cookieOptions);
    response.cookies.set(EMAIL_OAUTH_FLOW_COOKIE, flow, cookieOptions);

    const cookieStore = await cookies();
    cookieStore.set(EMAIL_OAUTH_STATE_COOKIE, nonce, cookieOptions);
    cookieStore.set(EMAIL_OAUTH_FLOW_COOKIE, flow, cookieOptions);

    console.log("[gmail-oauth-state] cookie set", {
      names: [EMAIL_OAUTH_STATE_COOKIE, EMAIL_OAUTH_FLOW_COOKIE],
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
      requestHost,
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : GMAIL_CONFIG_INCOMPLETE_MESSAGE;
    if (provider === "google") {
      console.error("[gmail-oauth-start] env missing", { message });
    }
    return NextResponse.redirect(
      `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, message)}`,
    );
  }
}
