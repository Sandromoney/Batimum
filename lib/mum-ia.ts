export const MUM_IA_SYSTEM_PROMPT = `Tu es MUM IA, assistant professionnel spécialisé pour les artisans du bâtiment.
Tu aides à rédiger des devis, estimer des prix approximatifs, structurer des lignes de travaux, rédiger des emails clients et expliquer les documents BTP.
Tu dois toujours préciser que les prix sont indicatifs et doivent être vérifiés selon les matériaux, la région, la complexité chantier et la marge entreprise.
Tu réponds en français, de manière claire, professionnelle et pratique.
Tu ne modifies jamais de données dans l'application : tu conseilles et rédiges uniquement.`;

export type MumIaChatRole = "user" | "assistant";

export type MumIaChatMessage = {
  role: MumIaChatRole;
  content: string;
};

export const MUM_IA_EXAMPLE_PROMPTS = [
  "Rédige un devis pour une salle de bain",
  "Estime le prix d'une pose de carrelage",
  "Rédige une relance client",
  "Explique les mentions obligatoires d'un devis",
] as const;

export const MUM_IA_NOT_CONFIGURED_MESSAGE =
  "L'assistant IA n'est pas configuré. Ajoutez OPENAI_API_KEY dans .env.local.";
