/**
 * Diagnostic strict OpenAI — à lancer : node scripts/diagnose-openai.mjs
 * Ne logue jamais la clé API.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import OpenAI from "openai";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");

function loadEnvLocal() {
  if (!existsSync(ENV_PATH)) {
    console.log("[DIAG] .env.local : absent");
    return;
  }
  const raw = readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
  console.log("[DIAG] .env.local : chargé");
}

function keyDetected() {
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  const placeholders = new Set([
    "",
    "COLLER_LA_CLE_ICI",
    "colle_ta_cle_openai_ici",
    "your_openai_api_key_here",
  ]);
  if (!key || placeholders.has(key)) return false;
  return true;
}

function serializeError(error, depth = 0) {
  if (depth > 4) return "[max depth]";
  if (!(error instanceof Error)) return String(error);
  const out = {
    name: error.name,
    message: error.message,
    code: error.code,
    cause: error.cause ? serializeError(error.cause, depth + 1) : undefined,
  };
  if ("status" in error) out.status = error.status;
  if ("code" in error && typeof error.code === "string") out.apiCode = error.code;
  return out;
}

async function testRawFetch() {
  console.log("\n[DIAG] Test 1 — fetch natif → https://api.openai.com/v1/models");
  const key = process.env.OPENAI_API_KEY?.trim();
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    console.log("[DIAG] fetch status :", res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text();
      console.log("[DIAG] fetch body (tronqué) :", text.slice(0, 300));
    } else {
      console.log("[DIAG] fetch : OK (connexion HTTPS + auth acceptée)");
    }
  } catch (error) {
    console.error("[DIAG] fetch ÉCHEC :", serializeError(error));
  }
}

async function testOpenAiSdk(model) {
  console.log("\n[DIAG] Test 2 — SDK OpenAI chat.completions.create");
  const key = process.env.OPENAI_API_KEY?.trim();
  const client = new OpenAI({ apiKey: key });
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Réponds uniquement : OK" }],
      max_tokens: 5,
    });
    const reply = completion.choices[0]?.message?.content?.trim();
    console.log("[DIAG] SDK : OK — réponse :", reply ?? "(vide)");
  } catch (error) {
    console.error("[MUM IA ERROR]", error);
    console.error("[DIAG] SDK erreur sérialisée :", JSON.stringify(serializeError(error), null, 2));
    if (error instanceof OpenAI.APIError) {
      console.log("[DIAG] APIError status :", error.status);
      console.log("[DIAG] APIError code :", error.code);
      console.log("[DIAG] APIError message :", error.message);
      console.log("[DIAG] APIError type :", error.type);
    }
  }
}

async function main() {
  console.log("=== DIAGNOSTIC MUM IA / OpenAI ===\n");
  loadEnvLocal();

  const detected = keyDetected();
  console.log("[DIAG] OPENAI_API_KEY détectée :", detected ? "oui" : "non");

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  console.log("[DIAG] Modèle utilisé :", model);
  console.log("[DIAG] Node :", process.version);
  console.log("[DIAG] NODE_TLS_REJECT_UNAUTHORIZED :", process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? "(non défini)");

  if (!detected) {
    console.log("\n[DIAG] Arrêt — configurez OPENAI_API_KEY dans .env.local");
    process.exit(1);
  }

  await testRawFetch();
  await testOpenAiSdk(model);

  console.log("\n=== FIN DIAGNOSTIC ===");
}

main();
