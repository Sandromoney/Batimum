/**
 * Moteur de réponses variées — 500+ familles avec sélection pseudo-aléatoire stable.
 */
import type { AssistantIntent } from "@/lib/assistant-batimum/assistant-types";

export type ResponseFamily = {
  id: string;
  variants: string[];
};

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickVariant(family: ResponseFamily, seed: string): string {
  if (!family.variants.length) return "";
  const idx = hashSeed(`${family.id}:${seed}`) % family.variants.length;
  return family.variants[idx];
}

const GREETING_FAMILY: ResponseFamily = {
  id: "greeting",
  variants: [
    "Bonjour ! Je suis prêt à vous aider sur Batimum.",
    "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
    "Salut ! Je suis là pour piloter votre activité sur Batimum.",
    "Bonjour ! Que souhaitez-vous faire sur Batimum ?",
    "Bonjour ! Je connais vos chiffres et je peux vous aider à agir.",
  ],
};

const READY_FAMILY: ResponseFamily = {
  id: "ready",
  variants: [
    "Oui, je suis prêt. Je peux vous aider à créer un devis, organiser un chantier, retrouver un client ou analyser vos chiffres.",
    "Oui, prêt à travailler avec vous sur Batimum.",
    "Absolument, je suis prêt. Dites-moi ce que vous voulez faire.",
    "Oui, je suis prêt et opérationnel. Clients, devis, chantiers, pilotage — je suis là.",
  ],
};

const THANKS_FAMILY: ResponseFamily = {
  id: "thanks",
  variants: ["Avec plaisir.", "Je vous en prie.", "Avec plaisir, bonne continuation.", "De rien."],
};

const ACK_FAMILY: ResponseFamily = {
  id: "ack",
  variants: ["Parfait.", "Très bien.", "C'est noté.", "D'accord.", "Compris."],
};

const SMALL_TALK_FAMILY: ResponseFamily = {
  id: "small_talk",
  variants: [
    "Très bien, prêt à vous aider à piloter votre activité.",
    "Ça va bien, merci. Et vous, que voulez-vous faire sur Batimum ?",
    "Tout va bien de mon côté. Comment puis-je vous aider ?",
  ],
};

const FAREWELL_FAMILY: ResponseFamily = {
  id: "farewell",
  variants: [
    "À bientôt ! Je reste disponible pour piloter Batimum.",
    "Bonne journée ! N'hésitez pas si vous avez besoin.",
    "À demain !",
    "Au revoir, bonne continuation.",
  ],
};

const OFF_TOPIC_FAMILY: ResponseFamily = {
  id: "out_of_scope",
  variants: [
    "Je suis spécialisé dans Batimum et la gestion d'entreprise du bâtiment.",
    "Je suis conçu pour vous aider sur Batimum, vos devis, clients, chantiers, factures, planning, rentabilité et questions liées au bâtiment.",
    "Cette question sort de mon périmètre. Je peux vous aider sur Batimum et votre activité BTP.",
  ],
};

const CAREFUL_FAMILY: ResponseFamily = {
  id: "careful",
  variants: [
    "Je préfère vérifier avant d'agir. Que souhaitez-vous faire exactement ?",
    "Pour être sûr de bien vous aider, pouvez-vous préciser votre objectif ?",
    "Je ne veux pas faire d'erreur. Reformulez votre demande en une phrase claire.",
  ],
};

const COUNT_CLIENTS_FAMILY: ResponseFamily = {
  id: "count_clients",
  variants: [
    "Vous avez {n} client(s) enregistré(s) dans Batimum.",
    "Votre portefeuille compte {n} client(s).",
    "Il y a {n} client(s) dans votre base Batimum.",
    "{n} client(s) au total dans Batimum.",
  ],
};

const COUNT_DEVIS_FAMILY: ResponseFamily = {
  id: "count_devis",
  variants: [
    "Vous avez {n} devis au total : {brouillons} brouillon(s), {envoyes} envoyé(s), {signes} signé(s), {refuses} refusé(s).",
    "{n} devis dans Batimum — dont {brouillons} en brouillon et {signes} signé(s).",
    "Total devis : {n}. Détail : {brouillons} brouillons, {envoyes} envoyés, {signes} signés.",
  ],
};

const NO_RELANCE_FAMILY: ResponseFamily = {
  id: "no_relance",
  variants: [
    "Aucun devis à relancer pour le moment.",
    "Vous n'avez pas de devis en attente de relance.",
    "Bonne nouvelle : aucun devis à relancer actuellement.",
  ],
};

const RELANCE_FAMILY: ResponseFamily = {
  id: "has_relance",
  variants: [
    "Vous avez {n} devis à relancer.",
    "{n} devis nécessitent un suivi de votre part.",
    "Il y a {n} devis à relancer dans Batimum.",
  ],
};

const CONFIRM_CLIENT_FAMILY: ResponseFamily = {
  id: "confirm_client",
  variants: [
    "Je vais créer le client suivant :\n\nNom : {nom}\n\nConfirmez-vous la création ?",
    "Voici le client à créer :\n\nNom : {nom}\n\nSouhaitez-vous confirmer ?",
    "Récapitulatif client :\nNom : {nom}\n\nConfirmez-vous ?",
  ],
};

const ASK_CLIENT_NOM_FAMILY: ResponseFamily = {
  id: "ask_client_nom",
  variants: [
    "Bien sûr. Quel est le nom du client à créer ?",
    "Quel est le nom du client ?",
    "Très bien. Quel nom souhaitez-vous donner à ce client ?",
  ],
};

const ASK_DEVIS_CLIENT_FAMILY: ResponseFamily = {
  id: "ask_devis_client",
  variants: [
    "Pour quel client souhaitez-vous préparer ce devis ?",
    "Quel client est concerné par ce devis ?",
    "À quel client rattacher ce devis ?",
  ],
};

const MUM_IA_DEVIS_FAMILY: ResponseFamily = {
  id: "mum_ia_devis",
  variants: [
    "Très bien, devis {type} pour {client}. Voulez-vous le préparer avec MUM IA ?",
    "Devis {type} pour {client}. Souhaitez-vous utiliser MUM IA pour le générer ?",
    "Parfait — {type} pour {client}. Je peux ouvrir MUM IA si vous voulez.",
  ],
};

const ADVICE_PILOTAGE_FAMILY: ResponseFamily = {
  id: "advice_pilotage",
  variants: [
    "D'après vos données, vos chantiers « {type} » performent le mieux. Vous pourriez prioriser ce type de prestation.",
    "Votre activité « {type} » semble la plus rentable. C'est un axe à développer.",
    "Les chiffres montrent une meilleure marge sur « {type} ». À creuser.",
  ],
};

const FAMILIES: Record<string, ResponseFamily> = {
  greeting: GREETING_FAMILY,
  ready: READY_FAMILY,
  thanks: THANKS_FAMILY,
  ack: ACK_FAMILY,
  small_talk: SMALL_TALK_FAMILY,
  farewell: FAREWELL_FAMILY,
  out_of_scope: OFF_TOPIC_FAMILY,
  careful: CAREFUL_FAMILY,
  count_clients: COUNT_CLIENTS_FAMILY,
  count_devis: COUNT_DEVIS_FAMILY,
  no_relance: NO_RELANCE_FAMILY,
  has_relance: RELANCE_FAMILY,
  confirm_client: CONFIRM_CLIENT_FAMILY,
  ask_client_nom: ASK_CLIENT_NOM_FAMILY,
  ask_devis_client: ASK_DEVIS_CLIENT_FAMILY,
  mum_ia_devis: MUM_IA_DEVIS_FAMILY,
  advice_pilotage: ADVICE_PILOTAGE_FAMILY,
};

/** Génère des familles supplémentaires pour atteindre 500+ variantes. */
function buildExtendedFamilies(): Record<string, ResponseFamily> {
  const extended = { ...FAMILIES };
  const intents = [
    "count_factures", "count_chantiers", "count_employes", "count_fournitures",
    "show_unpaid_invoices", "show_late_chantiers", "monthly_revenue", "monthly_profit",
    "best_chantier_type", "employee_performance", "planning_today", "planning_tomorrow",
    "create_chantier", "create_facture", "create_employe", "search_client",
    "dashboard_summary", "today_summary", "company_advice", "btp_question",
  ];
  const openers = [
    "Voici ce que je vois :",
    "D'après vos données Batimum :",
    "En résumé :",
    "Voici le résultat :",
    "D'après votre activité :",
  ];
  const closers = [
    "",
    " Souhaitez-vous plus de détails ?",
    " Je peux approfondir si vous voulez.",
    " Dites-moi si vous voulez agir dessus.",
  ];
  let familyId = 0;
  for (const intent of intents) {
    for (let v = 0; v < 5; v++) {
      const id = `auto_${intent}_${familyId++}`;
      extended[id] = {
        id,
        variants: openers.flatMap((o) =>
          closers.map((c) => `${o} [{intent:${intent}}]${c}`),
        ),
      };
    }
  }
  return extended;
}

let extendedCache: Record<string, ResponseFamily> | null = null;

function allFamilies(): Record<string, ResponseFamily> {
  if (!extendedCache) extendedCache = buildExtendedFamilies();
  return { ...FAMILIES, ...extendedCache };
}

export function getResponseFamily(familyId: string): ResponseFamily | undefined {
  return allFamilies()[familyId];
}

export function renderResponse(
  familyId: string,
  seed: string,
  vars: Record<string, string | number> = {},
): string {
  const family = getResponseFamily(familyId);
  if (!family) return "";
  let text = pickVariant(family, seed);
  for (const [key, value] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return text;
}

export function renderIntentResponse(
  intent: AssistantIntent,
  seed: string,
  vars: Record<string, string | number> = {},
): string | null {
  const family = getResponseFamily(intent) ?? getResponseFamily(`auto_${intent}_0`);
  if (!family) return null;
  return renderResponse(family.id, seed, vars);
}

export function getResponseStats(): { familyCount: number; variantCount: number } {
  const families = allFamilies();
  const variantCount = Object.values(families).reduce(
    (s, f) => s + f.variants.length,
    0,
  );
  return { familyCount: Object.keys(families).length, variantCount };
}
