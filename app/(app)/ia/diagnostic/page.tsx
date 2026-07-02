"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/mum-ia-api-client";

type Check = { ok?: boolean; error?: string | null };

type DiagnosticResponse = {
  success: boolean;
  checks?: {
    authSupabase?: Check;
    company?: Check;
    openAiKey?: Check;
    openAiConnection?: Check;
    generationTest?: Check;
  };
  details?: {
    hasBearerToken?: boolean;
  };
  debugMessage?: string;
  message?: string;
};

function renderStatus(label: string, check?: Check) {
  const ok = Boolean(check?.ok);
  return (
    <p className={ok ? "text-emerald-600" : "text-red-600"}>
      {label} : {ok ? "OK" : `Erreur${check?.error ? ` — ${check.error}` : ""}`}
    </p>
  );
}

export default function IaDiagnosticPage() {
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const response = await authenticatedFetch(
          "/api/ia/test",
          {
            method: "POST",
            body: JSON.stringify({ message: "Diagnostic page check" }),
          },
          "test-connexion-ia",
        );
        const body = (await response.json()) as DiagnosticResponse;
        if (!cancelled) {
          setDiagnostic(body);
          if (!response.ok) {
            setError(body.debugMessage ?? body.message ?? `HTTP ${response.status}`);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Diagnostic impossible");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="btp-app-page space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Diagnostic Auth & IA</h1>
        <p className="text-sm text-muted-foreground">
          Vérification en temps réel de l&apos;accès MUM IA.
        </p>
      </header>

      <div className="rounded-xl border border-border/70 bg-card p-4 text-sm">
        {loading ? <p>Diagnostic en cours…</p> : null}
        {!loading && diagnostic ? (
          <div className="space-y-1">
            {renderStatus("AUTH", diagnostic.checks?.authSupabase)}
            {renderStatus("COMPANY", diagnostic.checks?.company)}
            {renderStatus("OPENAI_API_KEY", diagnostic.checks?.openAiKey)}
            {renderStatus("OPENAI", diagnostic.checks?.openAiConnection)}
            {renderStatus("GENERATION", diagnostic.checks?.generationTest)}
          </div>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-md border border-red-400/40 bg-red-500/10 p-2 font-mono text-xs text-red-500">
            Erreur exacte : {error}
          </p>
        ) : null}
      </div>

      <Link href="/ia" className="text-sm text-primary hover:underline">
        Retour à MUM IA
      </Link>
    </div>
  );
}
