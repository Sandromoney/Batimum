import { NextResponse } from "next/server";
import { checkUserAiQuota } from "@/lib/ai-usage-store";
import {
  getOpenAiEnvDiagnostics,
  isOpenAiConfigured,
} from "@/lib/openai-server";
import {
  getSupabaseAnonKey,
  getSupabaseAnonKeySource,
  getSupabaseUrl,
} from "@/lib/gmail-oauth-config";
import { isMumIaDevEnvironment } from "@/lib/mum-ia-server-diagnostics";
import {
  getCompanyIdForUser,
  isMumIaAuthContext,
  requireMumIaAuth,
} from "@/lib/supabase-auth-server";

export const runtime = "nodejs";

function detectRuntimeEnvironment(): "local" | "preview" | "production" {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  return "local";
}

export async function GET(request: Request) {
  if (!isMumIaDevEnvironment()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Log temporaire pour diagnostiquer le chargement réel des variables d'environnement.
  console.log("[MUM IA diagnostics env]", {
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasPublishableKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  });

  const authResult = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(authResult)) {
    return authResult;
  }

  const openAi = getOpenAiEnvDiagnostics();
  const { user: authUser } = authResult;

  let quota: Awaited<ReturnType<typeof checkUserAiQuota>> | null = null;
  quota = await checkUserAiQuota(authUser.id);

  const supabaseUrl = getSupabaseUrl();
  const supabasePublicKey = getSupabaseAnonKey();
  const supabasePublicKeySource = getSupabaseAnonKeySource();
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const hasDevQuotaBypass = process.env.MUM_IA_SKIP_QUOTA === "true";
  const openAiOk = isOpenAiConfigured();
  const environment = detectRuntimeEnvironment();

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    environment,
    serverVariables: {
      status:
        Boolean(supabaseUrl) &&
        Boolean(supabasePublicKey) &&
        (hasServiceRoleKey || (environment === "local" && hasDevQuotaBypass)) &&
        openAiOk
          ? "OK"
          : "KO",
      hasNextPublicSupabaseUrl: Boolean(supabaseUrl),
      hasNextPublicSupabasePublishableKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
      ),
      hasNextPublicSupabaseAnonKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
      ),
      hasSupabaseServiceRoleKey: hasServiceRoleKey,
      hasMumIaSkipQuota: hasDevQuotaBypass,
      hasOpenAiApiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
    },
    checks: {
      supabaseUrl: {
        ok: Boolean(supabaseUrl),
        label: "URL Supabase",
      },
      supabasePublicKey: {
        ok: Boolean(supabasePublicKey),
        label: "Clé publique Supabase",
        source: supabasePublicKeySource,
      },
      supabaseServiceRoleKey: {
        ok: hasServiceRoleKey,
        label: "Service Role Key",
      },
      openAi: {
        ok: openAiOk,
        label: "OpenAI",
      },
    },
    openai: {
      configured: openAiOk,
      model: openAi.model,
      keySource: openAi.keySource,
      modelSource: openAi.modelSource,
      hasKeyInProcessEnv: Boolean(process.env.OPENAI_API_KEY?.trim()),
    },
    auth: { userId: authUser.id, email: authUser.email },
    company: { id: getCompanyIdForUser(authUser) },
    quota: quota
      ? {
          allowed: quota.allowed,
          used: quota.used,
          limit: quota.limit,
          monthlyIncluded: quota.monthlyIncluded,
          renewalDate: quota.renewalDate,
          message: quota.message,
        }
      : null,
    supabase: {
      hasPublicUrl: Boolean(supabaseUrl),
      hasPublicKey: Boolean(supabasePublicKey),
      publicKeySource: supabasePublicKeySource,
      hasPublishableKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
      ),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
      hasServiceRoleKey,
    },
  });
}
