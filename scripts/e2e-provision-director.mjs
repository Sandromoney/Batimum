/**
 * Provision a disposable E2E director account in Supabase Auth.
 * Usage: node scripts/e2e-provision-director.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split(/\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m || process.env[m[1]]) continue;
  process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

if (!url || !service) {
  console.error("Missing Supabase URL or service key");
  process.exit(1);
}

const email = process.env.E2E_DIRECTOR_EMAIL || "e2e.audit@batimum.local";
const password = process.env.E2E_DIRECTOR_PASSWORD || "E2eAuditBatimum2026!";

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const list = await admin.auth.admin.listUsers({ perPage: 200 });
if (list.error) {
  console.error("listUsers", list.error.message);
  process.exit(1);
}

let user = list.data.users.find(
  (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
);

if (!user) {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      entreprise: "E2E Audit SARL",
      utilisateur: "Auditeur E2E",
      onboarding_completed: true,
    },
  });
  if (created.error) {
    console.error("createUser", created.error.message);
    process.exit(1);
  }
  user = created.data.user;
  console.log("created", user.id);
} else {
  const updated = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...user.user_metadata,
      entreprise: user.user_metadata?.entreprise || "E2E Audit SARL",
      utilisateur: user.user_metadata?.utilisateur || "Auditeur E2E",
      onboarding_completed: true,
    },
  });
  if (updated.error) {
    console.error("updateUser", updated.error.message);
    process.exit(1);
  }
  user = updated.data.user;
  console.log("updated", user.id);
}

// Ensure user_settings row (parametres/employes always; operational if columns exist)
const baseRow = {
  user_id: user.id,
  parametres: {
    entreprise: "E2E Audit SARL",
    utilisateur: "Auditeur E2E",
    email,
    theme: "clair",
  },
  employes: [],
  updated_at: new Date().toISOString(),
};

let upsertErr = (
  await admin.from("user_settings").upsert(
    {
      ...baseRow,
      planning: [],
      chantiers: [],
      affectations: [],
      clients: [],
    },
    { onConflict: "user_id" },
  )
).error;

if (upsertErr?.code === "PGRST204" || /column/i.test(upsertErr?.message || "")) {
  console.log("operational columns missing — falling back to parametres/employes");
  upsertErr = (
    await admin.from("user_settings").upsert(baseRow, { onConflict: "user_id" })
  ).error;
}

if (upsertErr) {
  console.log("user_settings upsert:", upsertErr.code, upsertErr.message);
} else {
  console.log("user_settings ok");
}

console.log(
  JSON.stringify({
    ok: true,
    email,
    password,
    userId: user.id,
  }),
);
