import { NextResponse } from "next/server";
import {
  classifyOpenAiError,
  createOpenAiClient,
  getOpenAiEnvDiagnostics,
  getOpenAiModel,
  isOpenAiConfigured,
  logMumIa,
  openAiNotConfiguredResponse,
} from "@/lib/openai-server";

const TEST_MESSAGE = "Bonjour";

export async function POST(request: Request) {
  if (!isOpenAiConfigured()) {
    return NextResponse.json(openAiNotConfiguredResponse(), { status: 503 });
  }

  let message = TEST_MESSAGE;
  try {
    const body = await request.json();
    if (body && typeof body === "object" && typeof body.message === "string") {
      const trimmed = body.message.trim();
      if (trimmed) message = trimmed;
    }
  } catch {
    /* corps vide → message par défaut */
  }

  const client = createOpenAiClient();
  if (!client) {
    return NextResponse.json(openAiNotConfiguredResponse(), { status: 503 });
  }

  const model = getOpenAiModel();
  const diagnostics = getOpenAiEnvDiagnostics();

  try {
    logMumIa("info", "Test connexion OpenAI", {
      model,
      message,
      keySource: diagnostics.keySource,
    });

    const response = await client.responses.create({
      model,
      instructions:
        "Tu es l'assistant Batimum. Réponds brièvement en français, de manière professionnelle et amicale.",
      input: message,
    });

    const reply = response.output_text?.trim();
    if (!reply) {
      return NextResponse.json(
        { success: false, message: "Réponse OpenAI vide." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message,
      reply,
      model,
      configured: true,
      keySource: diagnostics.keySource,
    });
  } catch (error) {
    const classified = classifyOpenAiError(error, model);
    return NextResponse.json(
      {
        success: false,
        code: classified.code,
        message: classified.message,
        model,
      },
      { status: classified.httpStatus },
    );
  }
}
