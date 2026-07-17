/**
 * Valide GET/PUT /api/settings avec Bearer + workspace devis/factures.
 * Usage: node scripts/e2e-workspace-settings.mjs
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
const email = process.env.E2E_DIRECTOR_EMAIL || "e2e.audit@batimum.local";
const password = process.env.E2E_DIRECTOR_PASSWORD || "E2eAuditBatimum2026!";

async function main() {
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
  if (error || !data.session) {
    console.log(JSON.stringify({ ok: false, step: "signin", error: error?.message }));
    process.exit(1);
  }
  const token = data.session.access_token;
  const userId = data.user.id;

  const get1 = await fetch(`${BASE}/api/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const getBody = await get1.json().catch(() => ({}));

  const devisId = `e2e-devis-${Date.now()}`;
  const put = await fetch(`${BASE}/api/settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parametres: {
        entreprise: "E2E Audit SARL",
        utilisateur: "Auditeur E2E",
        email,
        telephone: "0611223344",
        adresse: "1 rue Test",
        codePostal: "81000",
        ville: "Albi",
        theme: "clair",
      },
      employes: [
        {
          id: "e2e-emp-1",
          prenom: "Paul",
          nom: "Chantier",
          identifiant: "paul.e2e",
          statut: "actif",
        },
      ],
      appData: {
        parametres: {
          entreprise: "E2E Audit SARL",
          utilisateur: "Auditeur E2E",
          email,
          telephone: "0611223344",
          adresse: "1 rue Test",
          codePostal: "81000",
          ville: "Albi",
          theme: "clair",
        },
        employes: [
          {
            id: "e2e-emp-1",
            prenom: "Paul",
            nom: "Chantier",
            identifiant: "paul.e2e",
            statut: "actif",
          },
        ],
        clients: [
          {
            id: "e2e-cli-1",
            nom: "Client",
            prenom: "Cloud",
            telephone: "0611223344",
            adresse: "1 rue Test",
            codePostal: "81000",
            ville: "Albi",
            createdAt: new Date().toISOString(),
          },
        ],
        devis: [
          {
            id: devisId,
            numero: "DEV-E2E-001",
            clientId: "e2e-cli-1",
            titre: "Devis cloud E2E",
            statut: "brouillon",
            date: "2026-07-17",
            lignes: [
              {
                id: "l1",
                description: "Prestation",
                quantite: 1,
                prixUnitaire: 100,
              },
            ],
          },
        ],
        factures: [
          {
            id: "e2e-fac-1",
            numero: "FAC-E2E-001",
            clientId: "e2e-cli-1",
            statut: "envoyee",
            date: "2026-07-17",
            montantHT: 100,
            montantTTC: 120,
            devisSourceId: devisId,
          },
        ],
        commandes: [],
        chantiers: [
          {
            id: "e2e-ch-1",
            nom: "Chantier E2E Cloud",
            statut: "en_cours",
            clientId: "e2e-cli-1",
          },
        ],
        planning: [
          {
            id: "e2e-pl-1",
            titre: "Intervention E2E",
            date: "2026-07-20",
            heureDebut: "08:00",
            heureFin: "12:00",
            type: "intervention",
            employeIds: ["e2e-emp-1"],
            chantierId: "e2e-ch-1",
          },
        ],
        affectations: [],
        avoirs: [],
        notifications: [],
        deletedNotificationKeys: [],
        relances: [],
        bibliothequeEntreprise: { entries: [], apprentissageAutomatique: true, learnedDevis: {} },
        mumIaHistorique: [],
        chantierTimeEntries: [],
      },
      localImportCompletedAt: new Date().toISOString(),
    }),
  });
  const putBody = await put.json().catch(() => ({}));

  const get2 = await fetch(`${BASE}/api/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const get2Body = await get2.json().catch(() => ({}));
  const ws = get2Body.workspace;
  const devisOk = Array.isArray(ws?.devis) && ws.devis.some((d) => d.id === devisId);
  const facturesOk = Array.isArray(ws?.factures) && ws.factures.length > 0;
  const planningOk =
    Array.isArray(ws?.planning) && ws.planning.some((p) => p.id === "e2e-pl-1");

  console.log(
    JSON.stringify(
      {
        ok: get1.status === 200 && put.status === 200 && devisOk && facturesOk && planningOk,
        userId,
        getStatus: get1.status,
        putStatus: put.status,
        putError: putBody.error || putBody.code || null,
        missingColumns: putBody.missingColumns || get2Body.missingColumns || false,
        devisOk,
        facturesOk,
        planningOk,
        devisCount: ws?.devis?.length ?? null,
        facturesCount: ws?.factures?.length ?? null,
      },
      null,
      2,
    ),
  );

  process.exit(
    get1.status === 200 && put.status === 200 && devisOk && facturesOk && planningOk
      ? 0
      : 1,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
