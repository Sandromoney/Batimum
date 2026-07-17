/**
 * E2E final — API + logique métier cloud (complément navigateur).
 * Usage: node scripts/e2e-final-audit.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split(/\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m || process.env[m[1]]) continue;
  process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3006";
const emailA = process.env.E2E_DIRECTOR_EMAIL || "e2e.audit@batimum.local";
const passA = process.env.E2E_DIRECTOR_PASSWORD || "E2eAuditBatimum2026!";
const emailB = process.env.E2E_DIRECTOR_B_EMAIL || "e2e.audit.b@batimum.local";
const passB = process.env.E2E_DIRECTOR_B_PASSWORD || "E2eAuditBatimumB2026!";

const results = [];
function record(area, status, detail) {
  results.push({ area, status, detail });
  const icon = status === "pass" ? "✅" : status === "warn" ? "⚠️" : "❌";
  console.log(`${icon} ${area} — ${detail}`);
}

function loadEnvClient(service = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = service
    ? process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email, password) {
  const supabase = loadEnvClient(false);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) throw new Error(error?.message || "signin fail");
  return { token: data.session.access_token, userId: data.user.id, supabase };
}

async function ensureUser(email, password) {
  const admin = loadEnvClient(true);
  const list = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = list.data?.users?.find(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
  );
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { onboarding_completed: true, utilisateur: "Compte B" },
    });
    if (created.error) throw new Error(created.error.message);
    user = created.data.user;
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
  }
  return user.id;
}

async function api(path, token, init = {}) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, ms: Date.now() - t0 };
}

async function putWorkspace(token, appData) {
  return api("/api/settings", token, {
    method: "PUT",
    body: JSON.stringify({
      parametres: appData.parametres,
      employes: appData.employes,
      appData,
      localImportCompletedAt: new Date().toISOString(),
    }),
  });
}

async function getWorkspace(token) {
  return api("/api/settings", token);
}

function baseParametres(email, entreprise) {
  return {
    entreprise,
    utilisateur: entreprise,
    email,
    telephone: "0611223344",
    adresse: "1 rue E2E",
    codePostal: "81000",
    ville: "Albi",
    theme: "clair",
  };
}

async function main() {
  const stamp = Date.now();
  const clientId = `cli-${stamp}`;
  const devisId = `dev-${stamp}`;
  const factureId = `fac-${stamp}`;
  const chantierId = `cha-${stamp}`;
  const empId = `emp-${stamp}`;
  const planId = `pln-${stamp}`;

  // --- Auth A ---
  let tokenA;
  let userIdA;
  try {
    ({ token: tokenA, userId: userIdA } = await signIn(emailA, passA));
    record("Auth dirigeant A", "pass", userIdA);
  } catch (e) {
    record("Auth dirigeant A", "fail", String(e.message || e));
    process.exit(1);
  }

  // --- Cycle chantier cloud ---
  const appA = {
    parametres: baseParametres(emailA, "E2E Audit SARL"),
    employes: [
      {
        id: empId,
        prenom: "Lucas",
        nom: "Terrain",
        identifiant: `lucas.e2e.${stamp}`,
        statut: "actif",
        coutHoraireInterne: 25,
      },
    ],
    clients: [
      {
        id: clientId,
        nom: "Dupont",
        prenom: "Marie",
        telephone: "0611223344",
        email: `marie.${stamp}@example.com`,
        adresse: "10 rue des Lilas",
        codePostal: "81000",
        ville: "Albi",
        createdAt: new Date().toISOString(),
      },
    ],
    devis: [
      {
        id: devisId,
        numero: `DEV-E2E-${stamp}`,
        clientId,
        titre: "Rénovation SDB E2E",
        statut: "signe",
        date: "2026-07-18",
        dateSignature: "2026-07-18",
        validiteJours: 30,
        lignes: [
          {
            id: "l1",
            description: "Dépose",
            quantite: 10,
            prixUnitaire: 40,
          },
          {
            id: "l2",
            description: "Pose carrelage",
            quantite: 10,
            prixUnitaire: 55,
          },
        ],
      },
    ],
    factures: [
      {
        id: factureId,
        numero: `FAC-E2E-${stamp}`,
        clientId,
        devisSourceId: devisId,
        devisLieId: devisId,
        chantierLieId: chantierId,
        statut: "envoyee",
        date: "2026-07-18",
        montantHT: 950,
        montantTTC: 1140,
        typeFacture: "classique",
      },
    ],
    commandes: [],
    chantiers: [
      {
        id: chantierId,
        nom: "Chantier SDB E2E",
        clientId,
        devisId,
        statut: "en_cours",
        typeChantier: "salle_de_bain",
        dateDebut: "2026-07-20",
        dateFin: "2026-07-30",
        achats: [],
      },
    ],
    planning: [
      {
        id: planId,
        titre: "Pose carrelage",
        date: "2026-07-21",
        heureDebut: "08:00",
        heureFin: "12:00",
        type: "intervention",
        chantierId,
        employeIds: [empId],
      },
      {
        id: `${planId}-2`,
        titre: "Finitions",
        date: "2026-07-22",
        heureDebut: "13:00",
        heureFin: "17:00",
        type: "intervention",
        chantierId,
        employeIds: [empId],
      },
    ],
    affectations: [
      {
        id: `aff-${stamp}`,
        chantierId,
        employeIds: [empId],
        dateDebut: "2026-07-20",
        dateFin: "2026-07-30",
        joursSemaine: [1, 2, 3, 4, 5],
        heureDebut: "08:00",
        heureFin: "17:00",
      },
    ],
    avoirs: [],
    notifications: [],
    deletedNotificationKeys: [],
    relances: [],
    bibliothequeEntreprise: {
      entries: [],
      apprentissageAutomatique: true,
      learnedDevis: {},
    },
    mumIaHistorique: [],
    chantierTimeEntries: [
      {
        id: `te-${stamp}`,
        chantierId,
        employeId: empId,
        date: "2026-07-21",
        heureDebut: "08:00",
        heureFin: "12:00",
        pauseMinutes: 0,
        typeTache: "pose",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const putA = await putWorkspace(tokenA, appA);
  record(
    "Parcours1 PUT workspace A",
    putA.status === 200 ? "pass" : "fail",
    `HTTP ${putA.status} ${putA.ms}ms ${putA.body.error || ""}`,
  );

  const getA = await getWorkspace(tokenA);
  const wsA = getA.body.workspace;
  const linksOk =
    wsA?.devis?.[0]?.clientId === clientId &&
    wsA?.factures?.[0]?.devisSourceId === devisId &&
    wsA?.chantiers?.[0]?.devisId === devisId &&
    wsA?.planning?.length >= 2;
  record(
    "Parcours1 liaisons client/devis/facture/chantier/planning",
    linksOk ? "pass" : "fail",
    `devis=${wsA?.devis?.length} fac=${wsA?.factures?.length} cha=${wsA?.chantiers?.length} plan=${wsA?.planning?.length}`,
  );

  // --- Employé credentials ---
  const empLogin = `lucas.e2e.${stamp}`;
  const empPass = "EmployeE2e2026!";
  const cred = await api("/api/employee-credentials", tokenA, {
    method: "POST",
    body: JSON.stringify({
      employeId: empId,
      login: empLogin,
      password: empPass,
      active: true,
    }),
  });
  record(
    "Parcours2 création credentials employé",
    cred.status === 200 && cred.body.success !== false ? "pass" : "fail",
    `HTTP ${cred.status} ${cred.body.error || "ok"}`,
  );

  let empLoginRes;
  let empBody = {};
  let bootstrapPlan = false;
  let bootstrapChantier = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    empLoginRes = await fetch(`${BASE}/api/employee-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: empLogin, password: empPass }),
    });
    empBody = await empLoginRes.json().catch(() => ({}));
    bootstrapPlan =
      Array.isArray(empBody.bootstrap?.planning) &&
      empBody.bootstrap.planning.some((p) => p.employeIds?.includes(empId));
    bootstrapChantier =
      Array.isArray(empBody.bootstrap?.chantiers) &&
      empBody.bootstrap.chantiers.some((c) => c.id === chantierId);
    if (empLoginRes.status === 200 && bootstrapPlan && bootstrapChantier) break;
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  const empCookie =
    empLoginRes.headers.getSetCookie?.()?.find((c) =>
      c.startsWith("batimum_employee_session="),
    )?.split(";")[0] || null;

  record(
    "Parcours2 login employé + bootstrap planning/chantier",
    empLoginRes.status === 200 && bootstrapPlan && bootstrapChantier
      ? "pass"
      : "fail",
    `HTTP ${empLoginRes.status} plan=${bootstrapPlan} cha=${bootstrapChantier} plans=${empBody.bootstrap?.planning?.length ?? 0} chas=${empBody.bootstrap?.chantiers?.length ?? 0}`,
  );

  // Modification planning dirigeant → session employé
  appA.planning.push({
    id: `${planId}-3`,
    titre: "Créneau ajouté après login",
    date: "2026-07-23",
    heureDebut: "09:00",
    heureFin: "11:00",
    type: "intervention",
    chantierId,
    employeIds: [empId],
  });
  await putWorkspace(tokenA, appA);

  const empSession = await fetch(`${BASE}/api/employee-auth/session`, {
    headers: empCookie ? { Cookie: empCookie } : {},
  });
  const empSessionBody = await empSession.json().catch(() => ({}));
  const seesNewSlot =
    Array.isArray(empSessionBody.bootstrap?.planning) &&
    empSessionBody.bootstrap.planning.some((p) => p.id === `${planId}-3`);
  record(
    "Parcours2 sync planning après modif dirigeant",
    empSession.status === 200 && seesNewSlot ? "pass" : "fail",
    `HTTP ${empSession.status} newSlot=${seesNewSlot}`,
  );

  // --- Isolation compte B ---
  let tokenB;
  let userIdB;
  try {
    await ensureUser(emailB, passB);
    ({ token: tokenB, userId: userIdB } = await signIn(emailB, passB));
    record("Auth dirigeant B", "pass", userIdB);
  } catch (e) {
    record("Auth dirigeant B", "fail", String(e.message || e));
  }

  if (tokenB) {
    const appB = {
      parametres: baseParametres(emailB, "Compte B Isolation"),
      employes: [],
      clients: [
        {
          id: `cli-b-${stamp}`,
          nom: "ClientB",
          prenom: "Seul",
          telephone: "0699887766",
          adresse: "2 av B",
          codePostal: "31000",
          ville: "Toulouse",
          createdAt: new Date().toISOString(),
        },
      ],
      devis: [],
      factures: [],
      commandes: [],
      chantiers: [],
      planning: [],
      affectations: [],
      avoirs: [],
      notifications: [],
      deletedNotificationKeys: [],
      relances: [],
      bibliothequeEntreprise: {
        entries: [],
        apprentissageAutomatique: true,
        learnedDevis: {},
      },
      mumIaHistorique: [],
      chantierTimeEntries: [],
    };
    const putB = await putWorkspace(tokenB, appB);
    const getB = await getWorkspace(tokenB);
    const getA2 = await getWorkspace(tokenA);
    const leakAtoB =
      JSON.stringify(getB.body.workspace || {}).includes(clientId) ||
      JSON.stringify(getB.body.workspace || {}).includes(devisId);
    const leakBtoA =
      JSON.stringify(getA2.body.workspace || {}).includes(`cli-b-${stamp}`);
    record(
      "Parcours3 isolation A≠B",
      putB.status === 200 && !leakAtoB && !leakBtoA ? "pass" : "fail",
      `putB=${putB.status} leakA→B=${leakAtoB} leakB→A=${leakBtoA}`,
    );
  }

  // --- Pages navigation timing ---
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
    "/login",
    "/login-employe",
  ]) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}${p}`, { redirect: "manual" });
    const ms = Date.now() - t0;
    record(
      `Nav ${p}`,
      res.status === 200 || res.status === 307 || res.status === 302
        ? ms > 3000
          ? "warn"
          : "pass"
        : "fail",
      `HTTP ${res.status} ${ms}ms`,
    );
  }

  // Password update with session (API-level) — change puis restore
  try {
    const tempPass = `${passA}-tmp`;
    const first = await signIn(emailA, passA);
    const { error: e1 } = await first.supabase.auth.updateUser({
      password: tempPass,
    });
    if (e1) throw e1;
    const second = await signIn(emailA, tempPass);
    const { error: e2 } = await second.supabase.auth.updateUser({
      password: passA,
    });
    if (e2) throw e2;
    // ancien mot de passe doit échouer
    const bad = await loadEnvClient(false).auth.signInWithPassword({
      email: emailA,
      password: tempPass,
    });
    record(
      "Parcours4 updateUser password",
      !bad.data.session ? "pass" : "fail",
      bad.data.session
        ? "ancien mdp encore accepté"
        : "change+restore OK, ancien refusé",
    );
  } catch (e) {
    record("Parcours4 updateUser password", "fail", String(e.message || e));
  }

  const fail = results.filter((r) => r.status === "fail").length;
  const warn = results.filter((r) => r.status === "warn").length;
  const pass = results.filter((r) => r.status === "pass").length;
  console.log("\n=== SUMMARY ===");
  console.log(`pass=${pass} warn=${warn} fail=${fail}`);
  console.log(fail === 0 ? "API_CLOUD_READY=YES" : "API_CLOUD_READY=NO");
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
