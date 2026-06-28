"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getDevisPdfObjectUrl, hasOfficialSignedDevisPdf, type BuildDevisPdfOptions } from "@/lib/devis-pdf";
import { Download, Loader2, Send, X } from "lucide-react";

export function DevisPreviewModal({
  open,
  onClose,
  pdfOptions,
  onDownload,
  onSendToClient,
  canSendToClient = true,
  sendToClientDisabledTitle,
}: {
  open: boolean;
  onClose: () => void;
  pdfOptions: BuildDevisPdfOptions | null;
  onDownload: () => void | Promise<void>;
  onSendToClient?: () => void | Promise<void>;
  canSendToClient?: boolean;
  sendToClientDisabledTitle?: string;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !pdfOptions) {
      setPdfUrl(null);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const options = pdfOptions;

    async function loadPreview() {
      setLoading(true);
      setError("");
      setPdfUrl(null);
      try {
        objectUrl = await getDevisPdfObjectUrl(options);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPdfUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setError("Impossible d'afficher la prévisualisation du devis.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, pdfOptions?.devis.id, pdfOptions?.devis.statut, pdfOptions?.totalHT]);

  useEffect(() => {
    if (!open && pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [open, pdfUrl]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="devis-preview-title"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card/95 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2
              id="devis-preview-title"
              className="truncate text-base font-semibold tracking-tight"
            >
              Prévisualisation du devis
            </h2>
            <p className="text-xs text-muted-foreground">
              Aperçu tel qu&apos;il sera envoyé au client
              {pdfOptions?.devis && hasOfficialSignedDevisPdf(pdfOptions.devis)
                ? " (PDF signé officiel)"
                : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {onSendToClient && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!canSendToClient}
                title={
                  canSendToClient
                    ? undefined
                    : sendToClientDisabledTitle ??
                      "Ajoutez l'email du client pour envoyer le devis"
                }
                onClick={() => void onSendToClient()}
              >
                <Send className="h-3.5 w-3.5" />
                Envoyer au client
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void onDownload()}
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger PDF
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
              Fermer
            </Button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 bg-card-elevated p-2 sm:p-4">
          {loading && (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              Préparation de l&apos;aperçu…
            </div>
          )}
          {error && !loading && (
            <div className="flex h-full min-h-[40vh] items-center justify-center px-4">
              <p className="rounded-xl border btp-alert-error px-4 py-3 text-sm">
                {error}
              </p>
            </div>
          )}
          {pdfUrl && !loading && (
            <iframe
              title="Prévisualisation du devis"
              src={pdfUrl}
              className="h-full min-h-[calc(100vh-5.5rem)] w-full rounded-lg border border-border/60 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}
