import { NextResponse } from "next/server";

export const runtime = "nodejs";

function detectRuntimeEnvironment(): "local" | "preview" | "production" {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  return "local";
}

export async function GET() {
  const nodeEnv = process.env.NODE_ENV?.trim() || "unknown";
  const vercelEnv = process.env.VERCEL_ENV?.trim() || "local";

  return NextResponse.json({
    environment: detectRuntimeEnvironment(),
    NODE_ENV: nodeEnv,
    VERCEL_ENV: vercelEnv,
    has_NEXT_PUBLIC_SUPABASE_URL: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    ),
    has_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
    ),
    has_SUPABASE_SERVICE_ROLE_KEY: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    ),
    has_OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
}
