import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveEmailConnectionForUser } from "@/lib/email-connection-store";
import { emailProviderService } from "@/lib/email-provider";
import { toFriendlyGmailOAuthError } from "@/lib/email-provider/oauth-errors";
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
  isEmailConnectionsTableMissingError,
  logGmailConfigMissing,
  logGmailRedirectUriDiagnostics,
  validateGmailOAuthConfig,
} from "@/lib/gmail-oauth-config";
import { isPrivateBetaEnabled } from "@/lib/private-beta";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-auth-server";

type Provider = "google" | "microsoft";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3006").replace(
    /\/$/,
    "",
  );
  const { provider: rawProvider } = await context.params;
  const provider = rawProvider as Provider;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (provider === "google") {
    console.log("[gmail-oauth-callback] code received", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasError: Boolean(error),
    });
    logGmailRedirectUriDiagnostics("[gmail-oauth-callback]");
  }

  const cookieStore = await cookies();
  const flow = parseGoogleOAuthFlow(
    cookieStore.get(EMAIL_OAUTH_FLOW_COOKIE)?.value,
  );
  const isSignup = isGoogleSignupFlow(flow);
  const isLogin = isGoogleLoginFlow(flow);

  if (isPrivateBetaEnabled() && (isSignup || isLogin)) {
    return NextResponse.redirect(
      `${appUrl}/login?${oauthFlowErrorQuery("login", "Connexion Google indisponible pendant la bêta privée.")}`,
    );
  }

  if (error) {
    const message = toFriendlyGmailOAuthError(new Error(error));
    return NextResponse.redirect(
      `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, message)}`,
    );
  }

  const expectedState = cookieStore.get(EMAIL_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(EMAIL_OAUTH_STATE_COOKIE);
  cookieStore.delete(EMAIL_OAUTH_FLOW_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    const message = "État OAuth invalide.";
    return NextResponse.redirect(
      `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, message)}`,
    );
  }

  if (provider !== "google" && provider !== "microsoft") {
    return NextResponse.redirect(
      `${appUrl}/parametres?email_oauth=error&message=${encodeURIComponent("Fournisseur inconnu.")}`,
    );
  }

  if (provider === "google") {
    const config = validateGmailOAuthConfig();
    if (!config.ok) {
      logGmailConfigMissing(config.missing);
      return NextResponse.redirect(
        `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, formatGmailConfigMissingMessage(config.missing))}`,
      );
    }
  }

  try {
    const tokens = await emailProviderService.exchangeOAuthCode(provider, code);
    const sealed = emailProviderService.sealTokens(tokens);

    cookieStore.set(EMAIL_OAUTH_COOKIE, sealed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });

    const authUser = await getAuthenticatedSupabaseUser();
    if (authUser && flow === "connect") {
      try {
        await saveEmailConnectionForUser(authUser.id, tokens, {
          useServiceRole: true,
        });
        console.log("[gmail-oauth-callback] token saved", {
          userId: authUser.id,
          email: tokens.email,
        });
      } catch (saveError) {
        console.error("[gmail-oauth-callback] token saved error", saveError);
        const saveMessage =
          saveError instanceof Error
            ? toFriendlyGmailOAuthError(saveError)
            : "table email_connections manquante";
        const isBlockingSaveError =
          saveMessage.toLowerCase().includes("manquante") ||
          (typeof saveError === "object" &&
            saveError !== null &&
            "message" in saveError &&
            isEmailConnectionsTableMissingError(
              saveError as { message?: string; code?: string },
            ));

        if (isBlockingSaveError) {
          return NextResponse.redirect(
            `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, saveMessage)}`,
          );
        }
      }
    } else if (flow === "connect" && provider === "google") {
      console.log("[gmail-oauth-callback] token saved skipped", {
        reason: authUser ? "not-connect-flow" : "user session missing",
      });
    }

    if (isSignup && provider === "google") {
      const params = new URLSearchParams();
      if (tokens.displayName) {
        params.set("name", tokens.displayName);
      }
      const query = params.toString();
      return NextResponse.redirect(
        `${appUrl}/signup/google-complete${query ? `?${query}` : ""}`,
      );
    }

    if (isLogin && provider === "google") {
      const params = new URLSearchParams();
      if (tokens.displayName) {
        params.set("name", tokens.displayName);
      }
      const query = params.toString();
      return NextResponse.redirect(
        `${appUrl}/login/google-complete${query ? `?${query}` : ""}`,
      );
    }

    return NextResponse.redirect(
      `${appUrl}/parametres?email_oauth=success&provider=${provider}&email=${encodeURIComponent(tokens.email)}`,
    );
  } catch (callbackError) {
    console.error("[gmail-oauth-callback] token exchange error", callbackError);
    const message = toFriendlyGmailOAuthError(callbackError);
    return NextResponse.redirect(
      `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, message)}`,
    );
  }
}
