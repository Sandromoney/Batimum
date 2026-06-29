import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import {
  buildGoogleAuthorizeUrl,
  buildMicrosoftAuthorizeUrl,
  getOAuthRedirectUri,
} from "@/lib/email-provider/oauth";
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
  logGmailConfigMissing,
  logGmailRedirectUriDiagnostics,
  validateGmailOAuthConfig,
} from "@/lib/gmail-oauth-config";

type Provider = "google" | "microsoft";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  const provider = rawProvider as Provider;
  const requestUrl = new URL(request.url);
  const flow = parseGoogleOAuthFlow(requestUrl.searchParams.get("flow"));
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3006").replace(
    /\/$/,
    "",
  );

  if (provider === "google") {
    console.log("[gmail-oauth-start] start", { flow });

    const config = validateGmailOAuthConfig();
    if (!config.ok) {
      logGmailConfigMissing(config.missing);
      return NextResponse.redirect(
        `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, formatGmailConfigMissingMessage(config.missing))}`,
      );
    }

    console.log("[gmail-oauth-start] start", {
      flow,
      redirectUri: config.redirectUri,
    });

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
    const state = randomBytes(24).toString("hex");
    const cookieStore = await cookies();
    cookieStore.set(EMAIL_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    cookieStore.set(EMAIL_OAUTH_FLOW_COOKIE, flow, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    const url =
      provider === "google"
        ? buildGoogleAuthorizeUrl(state)
        : buildMicrosoftAuthorizeUrl(state);

    return NextResponse.redirect(url);
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
