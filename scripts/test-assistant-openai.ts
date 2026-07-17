/**
 * Vérifie que l'Assistant Batimum utilise OPENAI_ASSISTANT_API_KEY.
 * Usage : npx tsx scripts/test-assistant-openai.ts
 */
import { aiService } from "../lib/ai/ai-service";
import { understandWithOpenAi } from "../lib/batimum-assistant-ai-server";
import {
  getOpenAiKeyEnvNameForMode,
  getOpenAiModelForMode,
  isAssistantOpenAiKeyFallback,
} from "../lib/openai-server";

process.env.ASSISTANT_DEBUG = "1";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function main() {
  aiService.resetClient();

  const assistantKeyName = getOpenAiKeyEnvNameForMode("assistant");
  const mumKeyName = getOpenAiKeyEnvNameForMode("mum_devis");
  const assistantModel = getOpenAiModelForMode("assistant");
  const mumModel = getOpenAiModelForMode("mum_devis");

  console.log("\n=== VÉRIFICATION CLÉS / CLIENTS ===");
  console.log("Assistant key env :", assistantKeyName);
  console.log("MUM IA key env    :", mumKeyName);
  console.log("Assistant model   :", assistantModel);
  console.log("MUM IA model      :", mumModel);
  console.log("Assistant fallback:", isAssistantOpenAiKeyFallback());
  console.log(
    "Clé assistant dédiée :",
    assistantKeyName === "OPENAI_ASSISTANT_API_KEY",
  );

  console.log("\n=== TEST MESSAGE : J'aimerais créer un client ===\n");

  const result = await understandWithOpenAi({
    message: "J'aimerais créer un client",
    appContext: { currentPage: "/clients" },
  });

  console.log("\n=== RÉSULTAT ===");
  console.log("OpenAI appelé     :", Boolean(result.llm || result.understanding));
  console.log("Clé utilisée      :", assistantKeyName);
  console.log("Modèle utilisé    :", assistantModel);
  console.log("Intent            :", result.understanding?.intent ?? result.llm?.intent);
  console.log(
    "Missing fields    :",
    result.understanding?.missing_fields ?? result.llm?.missingFields,
  );
  if (result.error) console.log("Erreur            :", result.error);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
