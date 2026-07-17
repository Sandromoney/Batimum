/**
 * E2E functional smoke across modules (HTTP + business transforms).
 * Does not replace browser QA for Google OAuth / UI forms.
 * Usage: node scripts/e2e-functional-audit.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { pathToFileURL } from "url";

for (const line of readFileSync(".env.local", "utf8").split(/\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m || process.env[m[1]]) continue;
  process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3006";
const email = process.env.E2E_DIRECTOR_EMAIL || "e2e.audit@batimum.local";
const password = process.env.E2E_DIRECTOR_PASSWORD || "E2eAuditBatimum2026!";

const results = [];
function record(area, status, detail) {
  results.push({ area, status, detail });
  const icon = status === "pass" ? "✅" : status === "warn" ? "⚠️" : "❌";
  console.log(`${icon} ${area} — ${detail}`);
}

async function getBearer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) throw new Error(error?.message || "no session");
  return { token: data.session.access_token, userId: data.user.id, supabase };
}

async function page(path) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: { Accept: "text/html" },
  });
  return { status: res.status, location: res.headers.get("location") };
}

async function api(path, token, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  // --- Pages marketing / auth ---
  for (const p of [
    "/login",
    "/signup",
    "/login-employe",
    "/mot-de-passe-oublie",
    "/landing",
  ]) {
    const r = await page(p);
    record(
      `Page ${p}`,
      r.status === 200 ? "pass" : "fail",
      `HTTP ${r.status}`,
    );
  }

  // --- App pages (SSR may 200 with client redirect) ---
  for (const p of [
    "/dashboard",
    "/clients",
    "/devis",
    "/factures",
    "/chantiers",
    "/planning",
    "/pilotage",
    "/parametres",
    "/ia",
  ]) {
    const r = await page(p);
    record(
      `Route ${p}`,
      r.status === 200 || r.status === 307 || r.status === 302
        ? "pass"
        : "fail",
      `HTTP ${r.status}${r.location ? ` → ${r.location}` : ""}`,
    );
  }

  // --- Auth + settings ---
  let token;
  let userId;
  try {
    ({ token, userId } = await getBearer());
    record("Connexion dirigeant (Supabase password)", "pass", userId);
  } catch (e) {
    record("Connexion dirigeant (Supabase password)", "fail", String(e.message || e));
    printSummary();
    process.exit(1);
  }

  const getSettings = await api("/api/settings", token);
  record(
    "GET /api/settings",
    getSettings.status === 200 ? "pass" : "fail",
    `HTTP ${getSettings.status} err=${getSettings.body.error || "—"}`,
  );

  const putMinimal = await api("/api/settings", token, {
    method: "PUT",
    body: JSON.stringify({
      parametres: {
        entreprise: "E2E Audit SARL",
        utilisateur: "Auditeur E2E",
        email,
        telephone: "0600000000",
        adresse: "1 rue Test",
        codePostal: "81000",
        ville: "Albi",
        siret: "12345678900011",
        theme: "clair",
      },
      employes: [],
      operational: {
        planning: [
          {
            id: "e2e-plan-1",
            titre: "E2E Planning Sync",
            dateDebut: "2026-07-20",
            dateFin: "2026-07-20",
            employeIds: ["e2e-emp-1"],
          },
        ],
        chantiers: [
          {
            id: "e2e-ch-1",
            nom: "Chantier E2E",
            statut: "en_cours",
          },
        ],
        affectations: [],
        clients: [
          {
            id: "e2e-cli-1",
            nom: "Client E2E Audit",
            email: "client.e2e@example.com",
          },
        ],
      },
    }),
  });

  if (putMinimal.status === 200) {
    const again = await api("/api/settings", token);
    const ops = again.body.operational;
    const hasPlanning = Array.isArray(ops?.planning) && ops.planning.length > 0;
    const hasClients = Array.isArray(ops?.clients) && ops.clients.length > 0;
    if (hasPlanning && hasClients) {
      record(
        "Sync opérationnelle Supabase (planning/clients)",
        "pass",
        "colonnes opérationnelles OK",
      );
    } else {
      record(
        "Sync opérationnelle Supabase (planning/clients)",
        "fail",
        `PUT ok mais operational absente/vide (colonnes manquantes?) planning=${ops?.planning?.length ?? "null"} clients=${ops?.clients?.length ?? "null"}`,
      );
    }
  } else {
    record(
      "Sync opérationnelle Supabase (planning/clients)",
      "fail",
      `PUT HTTP ${putMinimal.status} ${putMinimal.body.error || putMinimal.body.code || ""}`,
    );
  }

  // --- Employee auth health ---
  const empHealth = await fetch(`${BASE}/api/health/employee-db`).then((r) =>
    r.json().catch(() => ({})),
  );
  record(
    "Santé BDD employés",
    empHealth.ok ? "pass" : "warn",
    `ok=${empHealth.ok} table=${empHealth.table?.ok} rpc=${empHealth.rpc?.ok}`,
  );

  // --- Business transforms (dynamic import of compiled TS via next? skip — use fetch pages only) ---
  // Import lib via ts-node not available; validate with static existence via fs.
  const mustExist = [
    "lib/factures.ts",
    "lib/chantier-devis-link.ts",
    "lib/devis.ts",
    "lib/devis-signature.ts",
    "lib/employee-auth-bootstrap.ts",
    "app/auth/callback/route.ts",
    "app/auth/complete/page.tsx",
  ];
  for (const f of mustExist) {
    try {
      readFileSync(f);
      record(`Code path ${f}`, "pass", "présent");
    } catch {
      record(`Code path ${f}`, "fail", "absent");
    }
  }

  // LocalStorage-critical architecture warnings (static knowledge encoded)
  record(
    "Persistance devis/factures",
    "fail",
    "uniquement localStorage (btp-gestion-data) — pas de sync multi-appareil",
  );
  record(
    "Reset MDP dirigeant",
    "fail",
    "mot-de-passe-oublie utilise localStorage credentials, pas Supabase Auth",
  );

  printSummary();
}

function printSummary() {
  const fail = results.filter((r) => r.status === "fail").length;
  const warn = results.filter((r) => r.status === "warn").length;
  const pass = results.filter((r) => r.status === "pass").length;
  console.log("\n--- SUMMARY ---");
  console.log(`pass=${pass} warn=${warn} fail=${fail}`);
  console.log(
    fail === 0
      ? "GITHUB_READY=false (architecture gaps remain even if HTTP green)"
      : "GITHUB_READY=NO — blockers présent",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
