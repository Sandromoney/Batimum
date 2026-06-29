import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveEmailConnectionForUser } from "@/lib/email-connection-store";
import { emailProviderService } from "@/lib/email-provider";
import { toFriendlyGmailOAuthError } from "@/lib/email-provider/oauth-errors";
import {
  getEmailOAuthTokenCookieOptions,
  getOAuthStateCookieOptions,
  OAUTH_STATE_EXPIRED_MESSAGE,
  OAUTH_STATE_INVALID_MESSAGE,
  readCookieFromRequest,
} from "@/lib/email-provider/oauth-cookies";
import { verifyOAuthState } from "@/lib/email-provider/oauth-state";
import {
  EMAIL_OAUTH_COOKIE,
  EMAIL_OAUTH_FLOW_COOKIE,
  EMAIL_OAUTH_STATE_COOKIE,
} from "@/lib/email-provider/token-cookie";
import {
  isGoogleLoginFlow,
  isGoogleSignupFlow,
  oauthFlowErrorQuery,
  oauthFlowRedirectBase,
  parseGoogleOAuthFlow,
} from "@/lib/email-provider/oauth-flow";
import {
  formatGmailConfigMissingMessage,
  getAppBaseUrl,
  logGmailConfigMissing,
  logGmailRedirectUriDiagnostics,
  validateGmailOAuthConfig,
} from "@/lib/gmail-oauth-config";
import { isPrivateBetaEnabled } from "@/lib/private-beta";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";

type Provider = "google" | "microsoft";

function redirectOAuthError(
  appUrl: string,
  flow: ReturnType<typeof parseGoogleOAuthFlow>,
  message: string,
): NextResponse {
  const response = NextResponse.redirect(
    `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, message)}`,
  );
  const clearOptions = { ...getOAuthStateCookieOptions(), maxAge: 0 };
  response.cookies.set(EMAIL_OAUTH_STATE_COOKIE, "", clearOptions);
  response.cookies.set(EMAIL_OAUTH_FLOW_COOKIE, "", clearOptions);
  return response;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const appUrl = getAppBaseUrl();
  const { provider: rawProvider } = await context.params;
  const provider = rawProvider as Provider;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const receivedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const callbackHost = url.host;

  const cookieStore = await cookies();
  const flow = parseGoogleOAuthFlow(
    cookieStore.get(EMAIL_OAUTH_FLOW_COOKIE)?.value ??
      readCookieFromRequest(request, EMAIL_OAUTH_FLOW_COOKIE),
  );
  const isSignup = isGoogleSignupFlow(flow);
  const isLogin = isGoogleLoginFlow(flow);

  if (provider === "google") {
    console.log("[gmail-oauth-callback] code received", {
      hasCode: Boolean(code),
      hasError: Boolean(error),
      callbackHost,
    });
    console.log("[gmail-oauth-callback] state received", {
      hasState: Boolean(receivedState),
      stateLength: receivedState?.length ?? 0,
    });
    logGmailRedirectUriDiagnostics("[gmail-oauth-callback]");
  }

  if (isPrivateBetaEnabled() && (isSignup || isLogin)) {
    return NextResponse.redirect(
      `${appUrl}/login?${oauthFlowErrorQuery("login", "Connexion Google indisponible pendant la bêta privée.")}`,
    );
  }

  if (error) {
    const message = toFriendlyGmailOAuthError(new Error(error));
    return redirectOAuthError(appUrl, flow, message);
  }

  const cookieNonce =
    cookieStore.get(EMAIL_OAUTH_STATE_COOKIE)?.value ??
    readCookieFromRequest(request, EMAIL_OAUTH_STATE_COOKIE);

  console.log(
    `[gmail-oauth-callback] state cookie ${cookieNonce ? "found" : "missing"}`,
    { callbackHost },
  );

  if (!code) {
    console.log("[gmail-oauth-callback] state invalid", {
      reason: "missing-code",
    });
    return redirectOAuthError(appUrl, flow, OAUTH_STATE_INVALID_MESSAGE);
  }

  const verification = verifyOAuthState(receivedState, cookieNonce);

  if (!verification.ok) {
    if (verification.reason === "missing" && !cookieNonce) {
      console.log("[gmail-oauth-callback] state invalid", {
        reason: "cookie-missing",
      });
      return redirectOAuthError(appUrl, flow, OAUTH_STATE_EXPIRED_MESSAGE);
    }

    console.log("[gmail-oauth-callback] state invalid", {
      reason: verification.reason,
      hasCookie: Boolean(cookieNonce),
    });
    return redirectOAuthError(appUrl, flow, OAUTH_STATE_INVALID_MESSAGE);
  }

  console.log("[gmail-oauth-callback] state valid", {
    method: verification.method,
  });

  if (provider !== "google" && provider !== "microsoft") {
    return NextResponse.redirect(
      `${appUrl}/parametres?email_oauth=error&message=${encodeURIComponent("Fournisseur inconnu.")}`,
    );
  }

  if (provider === "google") {
    const config = validateGmailOAuthConfig();
    if (!config.ok) {
      logGmailConfigMissing(config.missing);
      return redirectOAuthError(
        appUrl,
        flow,
        formatGmailConfigMissingMessage(config.missing),
      );
    }
  }

  try {
    const tokens = await emailProviderService.exchangeOAuthCode(provider, code);
    const sealed = emailProviderService.sealTokens(tokens);

    const authUser = await getAuthenticatedSupabaseUser();
    if (authUser && flow === "connect") {
      try {
        await saveEmailConnectionForUser(authUser.id, tokens);
        console.log("[gmail-oauth-callback] token saved", {
          userId: authUser.id,
          email: tokens.email,
        });
      } catch (saveError) {
        console.error("[gmail-oauth-callback] token saved error", saveError);
        const saveMessage =
          saveError instanceof Error
            ? saveError.message
            : "Erreur lors de l'enregistrement du token Gmail.";
        return redirectOAuthError(appUrl, flow, saveMessage);
      }
    } else if (flow === "connect" && provider === "google") {
      console.log("[gmail-oauth-callback] token saved skipped", {
        reason: authUser ? "not-connect-flow" : "user session missing",
      });
    }

    let successUrl = `${appUrl}/parametres?email_oauth=success&provider=${provider}&email=${encodeURIComponent(tokens.email)}`;

    if (isSignup && provider === "google") {
      const params = new URLSearchParams();
      if (tokens.displayName) {
        params.set("name", tokens.displayName);
      }
      const query = params.toString();
      successUrl = `${appUrl}/signup/google-complete${query ? `?${query}` : ""}`;
    } else if (isLogin && provider === "google") {
      const params = new URLSearchParams();
      if (tokens.displayName) {
        params.set("name", tokens.displayName);
      }
      const query = params.toString();
      successUrl = `${appUrl}/login/google-complete${query ? `?${query}` : ""}`;
    }

    const response = NextResponse.redirect(successUrl);
    const clearOptions = { ...getOAuthStateCookieOptions(), maxAge: 0 };

    response.cookies.set(EMAIL_OAUTH_STATE_COOKIE, "", clearOptions);
    response.cookies.set(EMAIL_OAUTH_FLOW_COOKIE, "", clearOptions);
    response.cookies.set(
      EMAIL_OAUTH_COOKIE,
      sealed,
      getEmailOAuthTokenCookieOptions(60 * 60 * 24 * 90),
    );

    return response;
  } catch (callbackError) {
    console.error("[gmail-oauth-callback] token exchange error", callbackError);
    const message = toFriendlyGmailOAuthError(callbackError);
    return redirectOAuthError(appUrl, flow, message);
  }
}
