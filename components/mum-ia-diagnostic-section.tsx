"use client";

import { authenticatedFetch, MumIaAuthError } from "@/lib/mum-ia-api-client";
import { ParametresSection } from "@/components/parametres-section";
import { Button } from "@/components/ui/button";
import { Loader2, Plug } from "lucide-react";
import { useState } from "react";

export function MumIaDiagnosticSection() {
  const [testing, setTesting] = useState(false);
  const [testReply, setTestReply] = useState<string | null>(null);
  const [testModel, setTestModel] = useState<string | null>(null);
  const [testKeySource, setTestKeySource] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  async function handleTestConnection() {
    setTesting(true);
    setTestError(null);
    setTestReply(null);
    setTestModel(null);
    setTestKeySource(null);

    try {
      const response = await authenticatedFetch(
        "/api/ia/test",
        {
          method: "POST",
          body: JSON.stringify({ message: "Bonjour" }),
        },
        "test-connexion-ia",
      );

      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
        reply?: string;
        model?: string;
        keySource?: string;
      };

      if (!response.ok || !payload.success) {
        setTestError(payload.message ?? "Échec du test de connexion.");
        return;
      }

      setTestReply(payload.reply ?? null);
      setTestModel(payload.model ?? null);
      setTestKeySource(payload.keySource ?? null);
    } catch (error) {
      setTestError(
        error instanceof MumIaAuthError
          ? error.message
          : "Connexion impossible. Vérifiez le serveur et .env.local.",
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <ParametresSection
      title="Diagnostic IA"
      description="Réservé au dirigeant — vérifie la connexion MUM IA sans exposer cette option sur la page MUM IA."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Teste la clé API, le modèle et la disponibilité du service avant une
          génération importante.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={handleTestConnection}
          disabled={testing}
          className="shrink-0"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Test en cours…
            </>
          ) : (
            <>
              <Plug className="h-4 w-4" />
              Tester la connexion
            </>
          )}
        </Button>
      </div>

      {testError ? (
        <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {testError}
        </p>
      ) : null}

      {testReply ? (
        <div className="mt-3 rounded-xl border border-border/80 bg-card-elevated/40 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Réponse
            {testModel ? (
              <span className="ml-1 font-normal normal-case text-foreground">
                ({testModel}
                {testKeySource ? ` — ${testKeySource}` : ""})
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">{testReply}</p>
        </div>
      ) : null}
    </ParametresSection>
  );
}
