"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAccount } from "@/lib/account";
import { IS_MUM_IA_CLIENT_DEV } from "@/lib/mum-ia-errors";
import { authenticatedFetch, MumIaAuthError } from "@/lib/mum-ia-api-client";
import { useSupabaseSession } from "@/components/supabase-provider";
import { Loader2, Stethoscope } from "lucide-react";
import { useState } from "react";

type MumIaDevPanelProps = {
  technicalError?: string | null;
};

export function MumIaDevPanel({ technicalError }: MumIaDevPanelProps) {
  const [testing, setTesting] = useState(false);
  const [runningFullDiag, setRunningFullDiag] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [diagnostics, setDiagnostics] = useState<string | null>(null);
  const [diagnosticsSummary, setDiagnosticsSummary] = useState<{
    environment: string;
    serverVariablesStatus: string;
  } | null>(null);
  const [fullDiagnostic, setFullDiagnostic] = useState<{
    authSupabase: string;
    company: string;
    openAiKey: string;
    openAiConnection: string;
    generationTest: string;
    rawError?: string | null;
  } | null>(null);
  const session = useSupabaseSession();
  const account = getAccount();

  if (!IS_MUM_IA_CLIENT_DEV) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await authenticatedFetch(
        "/api/ia/test",
        {
          method: "POST",
          body: JSON.stringify({ message: "Réponds simplement par OK" }),
        },
        "test-connexion-ia",
      );
      const payload = (await response.json()) as {
        success?: boolean;
        reply?: string;
        message?: string;
        code?: string;
        model?: string;
      };

      if (response.ok && payload.success && payload.reply) {
        setTestResult({
          ok: true,
          message: `✅ Connexion IA opérationnelle (modèle : ${payload.model ?? "?"}, réponse : ${payload.reply})`,
        });
      } else {
        setTestResult({
          ok: false,
          message: `❌ Erreur exacte : ${payload.message ?? `HTTP ${response.status}`}`,
        });
      }
    } catch (error) {
      const message =
        error instanceof MumIaAuthError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Network error";
      setTestResult({
        ok: false,
        message: `❌ Erreur exacte : ${message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleLoadDiagnostics = async () => {
    try {
      const response = await authenticatedFetch(
        "/api/ia/diagnostics",
        {},
        "verifier-config-serveur",
      );
      const payload = (await response.json()) as {
        environment?: string;
        serverVariables?: { status?: string };
      };
      setDiagnosticsSummary({
        environment: payload.environment ?? "inconnu",
        serverVariablesStatus: payload.serverVariables?.status ?? "KO",
      });
      setDiagnostics(JSON.stringify(payload, null, 2));
    } catch (error) {
      setDiagnosticsSummary(null);
      setDiagnostics(
        error instanceof Error ? error.message : "Impossible de charger le diagnostic",
      );
    }
  };

  const handleFullDiagnostic = async () => {
    setRunningFullDiag(true);
    setFullDiagnostic(null);
    try {
      const response = await authenticatedFetch(
        "/api/ia/test",
        {
          method: "POST",
          body: JSON.stringify({ message: "Diagnostic IA complet" }),
        },
        "test-connexion-ia",
      );

      const payload = (await response.json()) as {
        checks?: {
          authSupabase?: { ok?: boolean; error?: string | null };
          company?: { ok?: boolean; error?: string | null };
          openAiKey?: { ok?: boolean; error?: string | null };
          openAiConnection?: { ok?: boolean; error?: string | null };
          generationTest?: { ok?: boolean; error?: string | null };
        };
        debugMessage?: string;
        message?: string;
      };

      const toLabel = (
        check?: { ok?: boolean; error?: string | null },
      ) => (check?.ok ? "OK" : `Erreur${check?.error ? ` — ${check.error}` : ""}`);

      setFullDiagnostic({
        authSupabase: toLabel(payload.checks?.authSupabase),
        company: toLabel(payload.checks?.company),
        openAiKey: toLabel(payload.checks?.openAiKey),
        openAiConnection: toLabel(payload.checks?.openAiConnection),
        generationTest: toLabel(payload.checks?.generationTest),
        rawError:
          payload.debugMessage ??
          (!response.ok ? payload.message ?? `HTTP ${response.status}` : null),
      });
    } catch (error) {
      setFullDiagnostic({
        authSupabase: "Erreur",
        company: "Erreur",
        openAiKey: "Erreur",
        openAiConnection: "Erreur",
        generationTest: "Erreur",
        rawError: error instanceof Error ? error.message : "Diagnostic impossible",
      });
    } finally {
      setRunningFullDiag(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-amber-400/30 bg-amber-400/5 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
        <Stethoscope className="h-3.5 w-3.5" />
        Diagnostic MUM IA (dev uniquement)
      </div>

      <div className="rounded-lg border border-border/60 bg-card/30 px-3 py-2 text-xs">
        <p>user connecté : {account ? "oui" : "non"}</p>
        <p>session Supabase : {session ? "oui" : "non"}</p>
        <p>access_token présent : {session?.access_token ? "oui" : "non"}</p>
        <p>company_id trouvé : {session?.user?.id ? "oui" : "non"}</p>
      </div>

      {technicalError ? (
        <div className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-xs text-red-200">
          <p className="font-semibold text-red-300">Erreur technique :</p>
          <p className="mt-1 whitespace-pre-wrap break-words font-mono">
            {technicalError}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleTestConnection}
          disabled={testing}
        >
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Tester la connexion IA
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleLoadDiagnostics}
        >
          Vérifier config serveur
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleFullDiagnostic}
          disabled={runningFullDiag}
        >
          {runningFullDiag ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Diagnostic IA complet
        </Button>
      </div>

      {testResult ? (
        <p
          className={`text-xs ${testResult.ok ? "text-emerald-400" : "text-red-300"}`}
        >
          {testResult.message}
        </p>
      ) : null}

      {diagnostics ? (
        <div className="space-y-2">
          {diagnosticsSummary ? (
            <div className="rounded-lg border border-border/60 bg-card/30 px-3 py-2 text-xs">
              <p>Environnement détecté : {diagnosticsSummary.environment}</p>
              <p>Variables serveur : {diagnosticsSummary.serverVariablesStatus}</p>
            </div>
          ) : null}
          <pre className="max-h-48 overflow-auto rounded-lg border border-border/60 bg-card/40 p-2 text-[10px] text-muted-foreground">
            {diagnostics}
          </pre>
        </div>
      ) : null}

      {fullDiagnostic ? (
        <div className="space-y-1 rounded-lg border border-border/60 bg-card/30 px-3 py-2 text-xs">
          <p>Authentification Supabase : {fullDiagnostic.authSupabase}</p>
          <p>Entreprise : {fullDiagnostic.company}</p>
          <p>Clé OpenAI : {fullDiagnostic.openAiKey}</p>
          <p>Connexion OpenAI : {fullDiagnostic.openAiConnection}</p>
          <p>Génération test : {fullDiagnostic.generationTest}</p>
          {fullDiagnostic.rawError ? (
            <p className="font-mono text-red-300">
              Erreur exacte : {fullDiagnostic.rawError}
            </p>
          ) : null}
        </div>
      ) : null}

      <Link href="/ia/diagnostic" className="text-xs text-primary hover:underline">
        Ouvrir la page de diagnostic complète
      </Link>
    </div>
  );
}
