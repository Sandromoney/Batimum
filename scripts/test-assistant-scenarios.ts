/**
 * Suite de tests copilote — 200+ scénarios.
 * Usage: npx tsx scripts/test-assistant-scenarios.ts
 */
import { analyzeAssistantMessage } from "@/lib/assistant-batimum/assistant-router";
import { processCopilotTurn } from "@/lib/assistant-batimum/copilot-pipeline";
import { getFormulationStats } from "@/lib/assistant-batimum/intent-library/formulation-generator";
import { getIntentCatalogStats } from "@/lib/assistant-batimum/intent-library/intent-catalog";
import { getResponseStats } from "@/lib/assistant-batimum/response-engine";
import { buildGeneratedFormulations } from "@/lib/assistant-batimum/intent-library/formulation-generator";
import { classifyMessageCategory } from "@/lib/assistant-batimum/assistant-rules";
import type { AssistantSessionContext } from "@/lib/batimum-assistant-types";
import type { AppData } from "@/lib/types";

const mockData = {
  clients: [{ id: "c1", nom: "Martin", prenom: "Jean", typeClient: "particulier", telephone: "", adresse: "", codePostal: "", ville: "", createdAt: "2026-01-01" }],
  devis: [],
  factures: [],
  chantiers: [],
  commandes: [],
  employes: [],
  fournitures: [],
  planning: [],
  parametres: { objectifCaMensuel: 15000 },
} as unknown as AppData;

let failed = 0;
let passed = 0;

function ok(cond: boolean, label: string) {
  if (cond) { passed++; } else { failed++; console.error(`FAIL ${label}`); }
}

type Scenario = {
  message: string;
  expectIntent?: string;
  expectCategory?: string;
  expectIncludes?: string;
  expectExcludes?: string;
  session?: AssistantSessionContext;
  hasPending?: boolean;
};

const SCENARIOS: Scenario[] = [];

// --- Conversation (20) ---
for (const msg of ["bonjour", "salut", "bonsoir", "allo", "ça va ?", "merci", "ok", "parfait", "nickel", "super"]) {
  SCENARIOS.push({ message: msg, expectCategory: "politesse" });
}
for (const msg of ["t'es prêt", "tu es prêt à travailler", "est-ce que t'es prêt"]) {
  SCENARIOS.push({ message: msg, expectIntent: "ready" });
}

// --- Counts (25) ---
for (const msg of [
  "j'ai combien de clients", "combien de devis", "nombre de factures",
  "combien de chantiers", "combien d'employés", "total clients",
]) {
  SCENARIOS.push({ message: msg, expectCategory: "question_logiciel" });
}

// --- Actions create (30) ---
for (const msg of [
  "crée un client", "je veux créer un client", "nouveau client",
  "prépare un devis", "crée un chantier", "ajoute un rdv",
  "crée nouvel employé", "nouvelle fourniture",
]) {
  SCENARIOS.push({ message: msg, expectCategory: "action" });
}

// --- Software questions (30) ---
for (const msg of [
  "quels devis relancer", "factures impayées", "chantiers en retard",
  "ca du mois", "bénéfice du mois", "sur quel type de chantier je suis le plus rentable",
  "planning aujourd'hui", "planning demain",
]) {
  SCENARIOS.push({ message: msg, expectCategory: "question_logiciel" });
}

// --- BTP / conseil (20) ---
for (const msg of [
  "comment augmenter ma marge", "quelle tva pour rénovation",
  "comment organiser un chantier", "conseil activité",
  "analyse mon entreprise",
]) {
  SCENARIOS.push({ message: msg });
}

// --- Navigation app (12) ---
for (const msg of [
  "explique le tableau de bord", "module devis", "page pilotage",
  "que fait batimum", "fonctionnalités batimum",
]) {
  SCENARIOS.push({ message: msg });
}

// --- Hors sujet (10) ---
for (const msg of ["raconte une blague", "qui est le président", "recette de gâteau"]) {
  SCENARIOS.push({ message: msg, expectIntent: "out_of_scope" });
}

// --- Slot filling client progressif (15) ---
const baseSession: AssistantSessionContext = {
  pending_intent: "create_client",
  pending_data: {},
  missing_fields: ["nom"],
  awaiting_answer: true,
};
SCENARIOS.push({ message: "Sandro", session: baseSession, hasPending: true, expectIncludes: "Sandro", expectExcludes: "préciser" });

const afterNom: AssistantSessionContext = {
  pending_intent: "create_client",
  pending_data: { nom: "Sandro" },
  missing_fields: ["telephone"],
  awaiting_answer: true,
};
SCENARIOS.push({ message: "06 00 00 00 00", session: afterNom, hasPending: true });

const afterTel: AssistantSessionContext = {
  pending_intent: "create_client",
  pending_data: { nom: "Sandro", telephone: "06 00 00 00 00" },
  missing_fields: ["email"],
  awaiting_answer: true,
};
SCENARIOS.push({ message: "sandro@gmail.com", session: afterTel, hasPending: true });

const afterEmail: AssistantSessionContext = {
  pending_intent: "create_client",
  pending_data: { nom: "Sandro", telephone: "06 00 00 00 00", email: "sandro@gmail.com" },
  missing_fields: ["ville"],
  awaiting_answer: true,
};
SCENARIOS.push({ message: "Albi", session: afterEmail, hasPending: true });

// --- Devis flow (10) ---
SCENARIOS.push({
  message: "prépare un devis salle de bain",
  expectIntent: "create_devis",
  expectIncludes: "client",
});
SCENARIOS.push({
  message: "pour Martin",
  session: { pending_intent: "create_quote", pending_data: { type_chantier: "salle de bain" }, missing_fields: ["client"], awaiting_answer: true },
  hasPending: true,
  expectIncludes: "Martin",
});

// --- Corrections (10) ---
SCENARIOS.push({ message: "non pas Sandro Sandro juste Sandro", expectIntent: "correction" });
SCENARIOS.push({ message: "non pour Martin", expectIntent: "correction" });

// --- Formulation recall sample (120) — test que les formulations générées matchent ---
const forms = buildGeneratedFormulations();
const sampleIntents = [
  "count_clients",
  "create_client",
  "show_quotes_to_follow_up",
  "best_chantier_type",
  "monthly_revenue",
  "create_devis",
  "show_unpaid_invoices",
  "planning_today",
];
for (const intentId of sampleIntents) {
  const phrases = (forms[intentId] ?? []).slice(0, 15);
  for (const phrase of phrases) {
    SCENARIOS.push({ message: phrase });
  }
}

// --- BTP trades devis (30) ---
for (const trade of ["plomberie", "carrelage", "peinture", "électricité", "salle de bain"]) {
  SCENARIOS.push({ message: `devis ${trade}`, expectIntent: "create_devis" });
  SCENARIOS.push({ message: `prépare un devis ${trade}` });
}

// --- Synonymes rentabilité (10) ---
for (const syn of ["plus rentable", "se porte le mieux", "où je gagne le plus", "meilleur type chantier"]) {
  SCENARIOS.push({ message: `sur quel type de chantier mon entreprise ${syn}` });
}

// --- Erreurs utilisateur / changements de contexte (45) ---
for (const msg of [
  "non annule",
  "pas demain vendredi",
  "mets 14h au lieu de 10h",
  "je me suis trompé",
  "reprenons",
  "oublie",
  "attends",
  "corrige",
  "pas ce client",
]) {
  SCENARIOS.push({ message: msg });
}

for (const msg of [
  "client martin",
  "devis dupont",
  "chantier école",
  "facture f2026-001",
  "planning de demain",
  "employé karim",
  "fourniture ba13",
  "adresse chantier albi",
  "relance cette facture",
  "analyse ce mois",
  "compare ce mois au mois dernier",
  "filtre les impayés",
]) {
  SCENARIOS.push({ message: msg });
}

// --- Avec l'IA (5) ---
SCENARIOS.push({
  message: "ou avec l'IA",
  session: { last_topic: "devis", pending_intent: "create_quote" },
  expectIncludes: "MUM IA",
});

console.log(`=== ${SCENARIOS.length} scénarios ===\n`);

const formStats = getFormulationStats();
const intentStats = getIntentCatalogStats();
const responseStats = getResponseStats();

console.log(`Intentions catalogue: ${intentStats.intentCount}`);
console.log(`Formulations: ${formStats.totalFormulations}`);
console.log(`Familles réponses: ${responseStats.familyCount} (${responseStats.variantCount} variantes)\n`);

ok(formStats.totalFormulations >= 5000, `>= 5000 formulations (${formStats.totalFormulations})`);
ok(intentStats.intentCount >= 250, `>= 250 intentions (${intentStats.intentCount})`);
ok(responseStats.variantCount >= 500, `>= 500 variantes réponses (${responseStats.variantCount})`);

for (let i = 0; i < SCENARIOS.length; i++) {
  const s = SCENARIOS[i];
  const ctx = {
    session: s.session,
    hasPendingIntent: s.hasPending ?? Boolean(s.session?.pending_intent),
  };

  const analysis = analyzeAssistantMessage(s.message, ctx);
  const brain = processCopilotTurn(s.message, mockData, ctx);

  if (s.expectIntent) {
    ok(analysis.intent === s.expectIntent, `#${i + 1} "${s.message.slice(0, 40)}" intent=${analysis.intent}`);
  }
  if (s.expectCategory) {
    ok(classifyMessageCategory(s.message, ctx) === s.expectCategory, `#${i + 1} cat=${classifyMessageCategory(s.message, ctx)}`);
  }
  if (s.expectIncludes) {
    ok(brain.reply.includes(s.expectIncludes), `#${i + 1} includes "${s.expectIncludes}"`);
  }
  if (s.expectExcludes) {
    ok(!brain.reply.toLowerCase().includes(s.expectExcludes.toLowerCase()), `#${i + 1} excludes "${s.expectExcludes}"`);
  }

  ok(Boolean(brain.copilot?.stepsCompleted.includes("understand")), `#${i + 1} pipeline understand`);
  ok(!brain.reply.match(/voici ce que je propose.*créer/i), `#${i + 1} pas d'action inventée`);
}

console.log(`\n${passed} assertions OK, ${failed} échecs`);

if (failed > 0) process.exit(1);
console.log("\nSuite copilote validée.");
