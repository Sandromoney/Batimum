/**
 * Smoke: sign in as E2E director via Supabase JS and hit /api/settings with Bearer.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split(/\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m || process.env[m[1]]) continue;
  process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.E2E_DIRECTOR_EMAIL || "e2e.audit@batimum.local";
const password = process.env.E2E_DIRECTOR_PASSWORD || "E2eAuditBatimum2026!";
const base = process.env.TEST_BASE_URL || "http://localhost:3006";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error || !data.session) {
  console.log(JSON.stringify({ ok: false, step: "signin", error: error?.message }));
  process.exit(1);
}

const token = data.session.access_token;
const settings = await fetch(`${base}/api/settings`, {
  headers: { Authorization: `Bearer ${token}` },
});
const body = await settings.json().catch(() => ({}));

console.log(
  JSON.stringify({
    ok: settings.status === 200,
    signIn: true,
    userId: data.user.id,
    settingsStatus: settings.status,
    settingsError: body.error || body.code || null,
    hasParametres: Boolean(body.parametres),
    hasOperational: Boolean(body.operational),
  }),
);
