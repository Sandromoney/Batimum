import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split(/\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m || process.env[m[1]]) continue;
  process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3006";
const email = process.env.E2E_DIRECTOR_EMAIL || "e2e.audit@batimum.local";
const password = process.env.E2E_DIRECTOR_PASSWORD || "E2eAuditBatimum2026!";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (error) throw error;

const get = await fetch(`${BASE}/api/settings`, {
  headers: { Authorization: `Bearer ${data.session.access_token}` },
});
const body = await get.json();
const ws = body.workspace;
if (!ws) {
  console.log("no workspace");
  process.exit(1);
}

const before = (ws.chantierTimeEntries || []).length;
ws.chantierTimeEntries = (ws.chantierTimeEntries || []).filter(
  (e) => e && typeof e.heureDebut === "string" && typeof e.heureFin === "string",
);

const put = await fetch(`${BASE}/api/settings`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${data.session.access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    parametres: ws.parametres,
    employes: ws.employes,
    appData: ws,
  }),
});

console.log(
  JSON.stringify({
    putStatus: put.status,
    before,
    after: ws.chantierTimeEntries.length,
  }),
);
