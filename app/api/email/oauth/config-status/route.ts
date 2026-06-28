import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";
import { logEmailOAuthEnvPresence } from "@/lib/email-provider/env-config";

export async function GET() {
  const presence = logEmailOAuthEnvPresence("config-status");
  const envLocalExists = existsSync(join(process.cwd(), ".env.local"));

  return NextResponse.json({
    envLocalExists,
    GOOGLE_CLIENT_ID: presence.googleClientId ? "present" : "absent",
    GOOGLE_CLIENT_SECRET: presence.googleClientSecret ? "present" : "absent",
    EMAIL_OAUTH_SECRET: presence.emailOauthSecret ? "present" : "absent",
    MICROSOFT_CLIENT_ID: presence.microsoftClientId ? "present" : "absent",
    MICROSOFT_CLIENT_SECRET: presence.microsoftClientSecret ? "present" : "absent",
    note: "Redémarrez npm run dev après modification de .env.local",
  });
}
