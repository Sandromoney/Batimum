import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import {
  buildGoogleAuthorizeUrl,
  buildMicrosoftAuthorizeUrl,
} from "@/lib/email-provider/oauth";
import {
  EMAIL_OAUTH_FLOW_COOKIE,
  EMAIL_OAUTH_STATE_COOKIE,
} from "@/lib/email-provider/token-cookie";
import { logEmailOAuthEnvPresence } from "@/lib/email-provider/env-config";
import {
  oauthFlowErrorQuery,
  oauthFlowRedirectBase,
  parseGoogleOAuthFlow,
} from "@/lib/email-provider/oauth-flow";

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

  if (provider !== "google" && provider !== "microsoft") {
    return NextResponse.json({ error: "Fournisseur inconnu." }, { status: 400 });
  }

  if ((flow === "signup" || flow === "login") && provider !== "google") {
    return NextResponse.redirect(
      `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, "L'authentification Google est requise pour cette action.")}`,
    );
  }

  try {
    logEmailOAuthEnvPresence(`authorize:${provider}:${flow}`);
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
      error instanceof Error ? error.message : "Configuration OAuth incomplète.";
    return NextResponse.redirect(
      `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, message)}`,
    );
  }
}
