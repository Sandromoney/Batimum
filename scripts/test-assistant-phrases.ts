/**
 * Tests briefing strict — règles 1 à 14.
 * Usage: npx tsx scripts/test-assistant-phrases.ts
 */
import { processAssistantBrainTurn } from "@/lib/assistant-batimum/assistant-brain";
import { analyzeAssistantMessage } from "@/lib/assistant-batimum/assistant-router";
import { classifyMessageCategory } from "@/lib/assistant-batimum/assistant-rules";
import {
  cleanClientName,
  extractClientName,
} from "@/lib/assistant-batimum/assistant-cleaners";
import type { AssistantSessionContext } from "@/lib/batimum-assistant-types";
import type { AppData } from "@/lib/types";

const mockData = {
  clients: [
    {
      id: "c1",
      nom: "Martin",
      prenom: "Jean",
      typeClient: "particulier",
      telephone: "",
      adresse: "",
      codePostal: "",
      ville: "",
      createdAt: "2026-01-01",
    },
  ],
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

function assert(condition: boolean, label: string) {
  if (!condition) {
    failed++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`OK   ${label}`);
  }
}

function assertNoPreciser(reply: string, label: string) {
  assert(!/préciser|preciser/i.test(reply), `${label} — pas de « préciser »`);
}

function assertNoInventedAction(reply: string, label: string) {
  const bad = /je peux créer|voici ce que je propose|préparer une relance/i.test(reply);
  assert(!bad, `${label} — pas d'action inventée`);
}

console.log("=== Règle 14 — 15 phrases obligatoires ===\n");

// 1. bonjour
const t1 = processAssistantBrainTurn("bonjour", mockData);
assert(t1.analysis?.messageCategory === "politesse" || t1.analysis?.intent === "greeting", "1. bonjour => conversation");
assertNoInventedAction(t1.reply, "1. bonjour");

// 2. ça va ?
const t2 = processAssistantBrainTurn("ça va ?", mockData);
assert(t2.analysis?.intent === "small_talk", "2. ça va => small_talk");
assertNoInventedAction(t2.reply, "2. ça va");

// 3. t'es prêt
const t3 = processAssistantBrainTurn("t'es prêt à travailler avec moi ?", mockData);
assert(t3.analysis?.intent === "ready", "3. prêt => ready");
assert(t3.reply.includes("prêt"), "3. prêt reply");

// 4. combien clients
const t4 = processAssistantBrainTurn("j'ai combien de clients", mockData);
assert(t4.analysis?.intent === "count_clients", "4. count_clients");
assert(t4.reply.includes("client"), "4. count reply");

// 5. créer client
const t5 = processAssistantBrainTurn("je veux créer un client", mockData);
assert(t5.analysis?.intent === "create_client", "5. create_client");
assert(t5.reply.includes("nom"), "5. demande nom");
assert(!t5.reply.includes("Vous avez"), "5. pas de stats");

// 6. Sandro après question
const sessionAsk: AssistantSessionContext = {
  pending_intent: "create_client",
  pending_data: {},
  missing_fields: ["nom"],
  awaiting_answer: true,
};
const t6 = processAssistantBrainTurn("Sandro", mockData, {
  session: sessionAsk,
  hasPendingIntent: true,
});
assert(t6.reply.includes("Sandro") && /confirmez/i.test(t6.reply), "6. Sandro => confirmation");
assertNoPreciser(t6.reply, "6. Sandro");

// 7. nom complet direct
const t7 = processAssistantBrainTurn(
  "je veux créer un client qui s'appelle Sandro Ciocchetti",
  mockData,
);
assert(
  t7.reply.includes("Sandro Ciocchetti") || t7.analysis?.data?.nom === "Sandro Ciocchetti",
  "7. Sandro Ciocchetti",
);

// 8. correction
const t8 = analyzeAssistantMessage("non pas Sandro Sandro juste Sandro");
assert(t8.intent === "correction" && t8.data.nom === "Sandro", "8. correction Sandro");

// 9. devis relancer
const t9 = processAssistantBrainTurn("quels devis relancer", mockData);
assert(t9.analysis?.intent === "show_quotes_to_follow_up", "9. devis relancer");

// 10. best chantier type
const t10 = processAssistantBrainTurn(
  "sur quel type de chantier mon entreprise se porte le mieux",
  mockData,
);
assert(t10.analysis?.intent === "best_chantier_type", "10. best_chantier_type");

// 11. employé
const t11 = processAssistantBrainTurn("crée nouvel employé", mockData);
assert(t11.analysis?.intent === "create_employe", "11. create_employe");
assert(
  t11.reply.toLowerCase().includes("nom") || t11.reply.includes("employé"),
  "11. demande nom employé",
);

// 12. devis salle de bain
const t12 = processAssistantBrainTurn("prépare un devis salle de bain", mockData);
assert(t12.analysis?.intent === "create_devis", "12. create_devis");
assert(t12.reply.toLowerCase().includes("client"), "12. demande client");

// 13. pour Martin
const sessionDevis: AssistantSessionContext = {
  pending_intent: "create_quote",
  pending_data: { type_chantier: "salle de bain" },
  missing_fields: ["client"],
  awaiting_answer: true,
};
const t13 = processAssistantBrainTurn("pour Martin", mockData, {
  session: sessionDevis,
  hasPendingIntent: true,
});
assert(
  t13.reply.includes("Martin") && t13.reply.toLowerCase().includes("mum ia"),
  `13. Martin + MUM IA => ${t13.reply.slice(0, 80)}`,
);

// 14. avec l'IA
const t14 = processAssistantBrainTurn("ou avec l'IA", mockData, {
  session: { last_topic: "devis", pending_intent: "create_quote" },
});
assert(t14.reply.toLowerCase().includes("mum ia"), "14. avec l'IA");

// 15. hors sujet
const t15 = processAssistantBrainTurn("raconte une blague", mockData);
assert(t15.analysis?.intent === "out_of_scope", "15. hors sujet");
assert(t15.reply.includes("Batimum"), "15. refus poli");

console.log("\n=== Règle 1 — pas d'action sur politesse ===");
for (const msg of ["merci", "ok", "parfait"]) {
  const r = processAssistantBrainTurn(msg, mockData);
  assertNoInventedAction(r.reply, `politesse: ${msg}`);
}

console.log("\n=== Règle 8 — extraction noms ===");
assert(
  extractClientName("tu peux créer un nouveau client qui s'appelle Sandro Ciocchetti") ===
    "Sandro Ciocchetti",
  "extraction Sandro Ciocchetti",
);
assert(extractClientName("nouveau client SCI Les Terrasses") === "SCI Les Terrasses", "SCI");

console.log("\n=== Classification ===");
assert(classifyMessageCategory("merci") === "politesse", "cat merci");
assert(classifyMessageCategory("j'ai combien de client") === "question_logiciel", "cat logiciel");
assert(classifyMessageCategory("crée un client") === "action", "cat action");

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests briefing passent.");
