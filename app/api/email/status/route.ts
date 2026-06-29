import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getEmailConnectionStatusFromSupabase } from "@/lib/email-connection-store";
import { emailProviderService } from "@/lib/email-provider";
import { EMAIL_OAUTH_COOKIE } from "@/lib/email-provider/token-cookie";
import {
  EMAIL_CONNECTIONS_TABLE,
  formatGmailConfigMissingMessage,
  getEmailConnectionsTableMissingMessage,
  isEmailConnectionsTableMissingError,
  logGmailConfigMissing,
  validateGmailOAuthConfig,
} from "@/lib/gmail-oauth-config";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-auth-server";

export async function GET() {
  console.log("[gmail-status] start");

  const config = validateGmailOAuthConfig();
  if (!config.ok) {
    logGmailConfigMissing(config.missing);
    const message = formatGmailConfigMissingMessage(config.missing);
    console.error("[gmail-status] supabase query error", {
      reason: "config-incomplete",
      missing: config.missing,
    });
    return NextResponse.json(
      {
        connected: false,
        expired: false,
        provider: null,
        configError: true,
        message,
      },
      { status: 200 },
    );
  }

  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (authUser) {
      console.log("[gmail-status] user session found", { userId: authUser.id });

      const { status: supabaseStatus, error: supabaseError } =
        await getEmailConnectionStatusFromSupabase(authUser.id);

      if (supabaseError) {
        console.error("[gmail-status] supabase query error", supabaseError);
        if (isEmailConnectionsTableMissingError(supabaseError)) {
          console.log(`[gmail-config] missing: ${EMAIL_CONNECTIONS_TABLE}`);
          return NextResponse.json(
            {
              connected: false,
              expired: false,
              provider: null,
              configError: true,
              message: getEmailConnectionsTableMissingMessage(),
            },
            { status: 200 },
          );
        }
      } else if (supabaseStatus) {
        console.log("[gmail-status] supabase query success", {
          userId: authUser.id,
          email: supabaseStatus.email,
          connected: supabaseStatus.connected,
        });
        return NextResponse.json(supabaseStatus);
      } else {
        console.log("[gmail-status] supabase query success", {
          userId: authUser.id,
          connected: false,
        });
      }
    } else {
      console.log("[gmail-status] user session missing");
    }

    const cookieStore = await cookies();
    const sealed = cookieStore.get(EMAIL_OAUTH_COOKIE)?.value;
    const status = emailProviderService.getConnectionStatus(sealed);

    console.log("[gmail-status] fetch success", {
      source: "cookie",
      email: status.email,
      connected: status.connected,
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error("[gmail-status] fetch error", error);
    return NextResponse.json(
      {
        connected: false,
        expired: false,
        provider: null,
        statusError: true,
      },
      { status: 200 },
    );
  }
}
