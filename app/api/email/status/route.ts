import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getEmailConnectionStatusFromSupabase } from "@/lib/email-connection-store";
import { emailProviderService } from "@/lib/email-provider";
import { EMAIL_OAUTH_COOKIE } from "@/lib/email-provider/token-cookie";
import type { EmailConnectionStatus } from "@/lib/email-provider/types";
import {
  formatGmailConfigMissingMessage,
  formatGmailDbErrorForUser,
  logGmailConfigMissing,
  logGmailDbSupabaseError,
  logGmailEnvDiagnostics,
  validateGmailOAuthConfig,
} from "@/lib/gmail-oauth-config";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";

function logEmailStatusResponse(status: EmailConnectionStatus): void {
  console.log("[email-status] connected:", status.connected);
  console.log("[email-status] email:", status.email ?? null);
}

export async function GET() {
  console.log("[email-status] start");
  logGmailEnvDiagnostics("[email-status]");

  const config = validateGmailOAuthConfig();
  if (!config.ok) {
    logGmailConfigMissing(config.missing);
    const message = formatGmailConfigMissingMessage(config.missing);
    console.error("[email-status] supabase query error", {
      reason: "config-incomplete",
      missing: config.missing,
    });
    const payload: EmailConnectionStatus = {
      connected: false,
      expired: false,
      provider: null,
      configError: true,
      message,
    };
    logEmailStatusResponse(payload);
    return NextResponse.json(payload, { status: 200 });
  }

  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (authUser) {
      console.log("[email-status] user session found", { userId: authUser.id });

      const { status: supabaseStatus, error: supabaseError } =
        await getEmailConnectionStatusFromSupabase(authUser.id);

      if (supabaseError) {
        logGmailDbSupabaseError(supabaseError);
        console.error("[email-status] supabase query error", supabaseError);
        const payload: EmailConnectionStatus = {
          connected: false,
          expired: false,
          provider: null,
          configError: true,
          message: formatGmailDbErrorForUser(supabaseError),
        };
        logEmailStatusResponse(payload);
        return NextResponse.json(payload, { status: 200 });
      }

      if (supabaseStatus) {
        console.log("[email-status] supabase query success", {
          userId: authUser.id,
          email: supabaseStatus.email,
          connected: supabaseStatus.connected,
        });
        logEmailStatusResponse(supabaseStatus);
        return NextResponse.json(supabaseStatus);
      }

      console.log("[email-status] supabase query success", {
        userId: authUser.id,
        connected: false,
      });
      const disconnected: EmailConnectionStatus = {
        connected: false,
        expired: false,
        provider: null,
      };
      logEmailStatusResponse(disconnected);
      return NextResponse.json(disconnected);
    }

    console.log("[email-status] user session missing");

    const cookieStore = await cookies();
    const sealed = cookieStore.get(EMAIL_OAUTH_COOKIE)?.value;
    const status = emailProviderService.getConnectionStatus(sealed);

    console.log("[email-status] fetch success", {
      source: "cookie",
      email: status.email,
      connected: status.connected,
    });
    logEmailStatusResponse(status);

    return NextResponse.json(status);
  } catch (error) {
    console.error("[email-status] fetch error", error);
    const payload: EmailConnectionStatus = {
      connected: false,
      expired: false,
      provider: null,
      statusError: true,
    };
    logEmailStatusResponse(payload);
    return NextResponse.json(payload, { status: 200 });
  }
}
