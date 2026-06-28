import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { emailProviderService } from "@/lib/email-provider";
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
import { isPrivateBetaEnabled } from "@/lib/private-beta";

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
    return NextResponse.redirect(
      `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, error)}`,
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
    const message =
      callbackError instanceof Error
        ? callbackError.message
        : "Connexion OAuth échouée.";
    return NextResponse.redirect(
      `${oauthFlowRedirectBase(appUrl, flow)}?${oauthFlowErrorQuery(flow, message)}`,
    );
  }
}
