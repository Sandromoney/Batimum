"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DevisSignatureCanvas } from "@/components/devis-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { devisTotal } from "@/lib/data";
import { getClientDisplayName } from "@/lib/clients";
import { resolveDevisBrandColor } from "@/lib/devis-brand-colors";
import { ligneMontantHT } from "@/lib/devis-tva";
import { getClientFacingDevis } from "@/lib/mum-ia-mode";
import type { Client, Devis, Parametres } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";

type SignaturePayload = {
  devis: Devis;
  client: Client | null;
  parametres: Parametres;
  status: "pending" | "signed" | "refused";
};

export default function PublicDevisSignaturePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SignaturePayload | null>(null);
  const [signedBy, setSignedBy] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [completed, setCompleted] = useState<"signed" | "refused" | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Lien de signature invalide.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDevis() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/signature/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as SignaturePayload & { error?: string };

        if (cancelled) return;

        if (!response.ok || !body.devis) {
          setError(body.error ?? "Devis introuvable.");
          setPayload(null);
          return;
        }

        setPayload(body);
        setSignedBy(
          body.devis.nomSignataire?.trim() ||
            (body.client ? getClientDisplayName(body.client) : ""),
        );

        if (body.status === "signed") setCompleted("signed");
        if (body.status === "refused") setCompleted("refused");
      } catch {
        if (!cancelled) {
          setError("Impossible de charger le devis. Réessayez plus tard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDevis();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const devis = useMemo(
    () => (payload ? getClientFacingDevis(payload.devis) : null),
    [payload],
  );

  const brandColor = useMemo(
    () => resolveDevisBrandColor(payload?.parametres ?? {}),
    [payload?.parametres],
  );

  const totalHT = useMemo(() => {
    if (!devis) return 0;
    return devis.montantHT ?? devisTotal(devis);
  }, [devis]);

  async function handleSign() {
    if (!token || !signatureData || !signedBy.trim()) {
      setError("Signez dans la zone prévue et indiquez votre nom.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/signature/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          signature: signatureData,
          signedBy: signedBy.trim(),
        }),
      });

      const body = (await response.json()) as { error?: string; devis?: Devis };

      if (!response.ok) {
        setError(body.error ?? "Impossible d'enregistrer la signature.");
        return;
      }

      if (body.devis) {
        setPayload((current) =>
          current ? { ...current, devis: body.devis!, status: "signed" } : current,
        );
      }
      setCompleted("signed");
    } catch {
      setError("Connexion impossible. Réessayez dans quelques instants.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du devis…
        </div>
      </main>
    );
  }

  if (error && !payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md space-y-3 p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Devis introuvable</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </main>
    );
  }

  if (!payload || !devis) return null;

  const entreprise = payload.parametres.entreprise?.trim() || "Votre entreprise";

  if (completed === "signed") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <Card className="max-w-lg space-y-4 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="text-xl font-semibold">Devis signé</h1>
          <p className="text-sm text-muted-foreground">
            Merci. Votre signature pour le devis <strong>{devis.numero}</strong> a
            bien été enregistrée. {entreprise} a été notifié(e).
          </p>
        </Card>
      </main>
    );
  }

  if (completed === "refused") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <Card className="max-w-lg space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Devis refusé</h1>
          <p className="text-sm text-muted-foreground">
            Ce devis a déjà été refusé.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Signature électronique
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Devis {devis.numero}
          </h1>
          <p className="text-sm text-muted-foreground">
            Émis par <span className="font-medium text-foreground">{entreprise}</span>
            {devis.dateDevis || devis.date
              ? ` — ${formatDate(devis.dateDevis ?? devis.date)}`
              : ""}
          </p>
        </header>

        <Card className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Client
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {payload.client
                  ? getClientDisplayName(payload.client)
                  : "Client"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Objet
              </p>
              <p className="mt-1 text-sm text-foreground">{devis.titre}</p>
            </div>
          </div>

          <div>
            <p
              className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: brandColor.hex }}
            >
              Détail du devis
            </p>
            <div className="overflow-hidden rounded-xl border border-border/80">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Qté</th>
                    <th className="px-3 py-2 text-right font-medium">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {devis.lignes.map((ligne) => (
                    <tr key={ligne.id} className="border-t border-border/60">
                      <td className="px-3 py-2 text-foreground">
                        {ligne.description}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {ligne.quantite}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">
                        {formatCurrency(ligneMontantHT(ligne))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr
                    className="border-t border-border/80 font-semibold"
                    style={{ color: brandColor.hex }}
                  >
                    <td className="px-3 py-3" colSpan={2}>
                      Total HT
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatCurrency(totalHT)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Signer le devis
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dessinez votre signature ci-dessous pour accepter ce devis.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="signedBy"
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              Nom du signataire
            </label>
            <Input
              id="signedBy"
              value={signedBy}
              onChange={(event) => setSignedBy(event.target.value)}
              placeholder="Prénom et nom"
              disabled={submitting}
            />
          </div>

          <DevisSignatureCanvas
            onChange={setSignatureData}
            disabled={submitting}
          />

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            className="w-full justify-center sm:w-auto"
            disabled={submitting || !signatureData || !signedBy.trim()}
            onClick={() => void handleSign()}
            style={{ backgroundColor: brandColor.hex }}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              "Valider ma signature"
            )}
          </Button>
        </Card>
      </div>
    </main>
  );
}
