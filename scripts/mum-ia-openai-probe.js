/* eslint-disable no-console */
const fs = require("fs");
const OpenAI = require("openai");

function getEnv(key) {
  const env = fs.readFileSync(".env.local", "utf8");
  const m = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

async function main() {
  const key = getEnv("OPENAI_API_KEY");
  const model = getEnv("OPENAI_MUM_MODEL") || getEnv("OPENAI_MODEL") || "gpt-4o-mini";
  console.log("[TEST] model=", model, "keyLen=", key.length);

  const client = new OpenAI({ apiKey: key });
  const schema = {
    type: "object",
    properties: {
      lotsIdentifies: { type: "array", items: { type: "string" } },
      informationsSuffisantes: { type: "boolean" },
      questions: { type: "array", items: { type: "object", additionalProperties: true } },
      hypothesesSuggerees: { type: "array", items: { type: "string" } },
      messageAnalyse: { type: "string" },
    },
    required: [
      "lotsIdentifies",
      "informationsSuffisantes",
      "questions",
      "hypothesesSuggerees",
      "messageAnalyse",
    ],
    additionalProperties: false,
  };

  try {
    const r = await client.responses.create({
      model,
      instructions: "Tu reponds uniquement en JSON valide.",
      input:
        "Analyse: renovation salle de bain 6m2 Albi. Retourne lotsIdentifies, informationsSuffisantes, questions, hypothesesSuggerees, messageAnalyse.",
      max_output_tokens: 4000,
      text: {
        format: {
          type: "json_schema",
          name: "analyse_test",
          schema,
          strict: true,
        },
      },
    });
    console.log("[TEST] status=", r.status);
    console.log("[TEST] incomplete=", JSON.stringify(r.incomplete_details));
    console.log("[TEST] output_text_len=", (r.output_text || "").length);
    console.log("[TEST] output_text=", (r.output_text || "").slice(0, 500));
    console.log(
      "[TEST] output_types=",
      (r.output || []).map((o) => o.type + ":" + (o.status || "")),
    );
    console.log("[TEST] usage=", JSON.stringify(r.usage));
    for (const item of r.output || []) {
      if (item.type === "message") {
        console.log("[TEST] message content=", JSON.stringify(item.content).slice(0, 800));
      }
      if (item.type === "reasoning") {
        console.log("[TEST] reasoning present, keys=", Object.keys(item));
      }
    }
  } catch (e) {
    console.error("[TEST] ERR", e.status, e.message);
    if (e.error) console.error(JSON.stringify(e.error).slice(0, 1000));
  }
}

main();
