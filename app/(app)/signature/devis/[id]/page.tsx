"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { devisTotal } from "@/lib/data";
import { getClientDisplayName } from "@/lib/clients";
import { DEVIS_STATUT_LABELS } from "@/lib/devis";
import { getLignePdfDescription } from "@/lib/devis-lignes";
import {
  DEVIS_REFUSAL_REASONS,
  getDevisDisplayStatut,
  markDevisRefusedByClient,
  resolveClientIpForSignature,
} from "@/lib/devis-statut";
import { patchAppDataDevis } from "@/lib/app-devis-bibliotheque";
import { completeDevisClientSignature } from "@/lib/devis-signature";
import {
  buildDevisRefusalCompanyEmail,
  createDevisRefusalNotification,
  sendReminderEmail,
} from "@/lib/relances";
import { downloadStoredSignedDevisPdf } from "@/lib/devis-pdf";
import { saveSignedDevisPdf, useStore } from "@/lib/store";
import { formatCurrency, formatDate, formatDateTimeFR } from "@/lib/utils";
import { hasValidationErrors, validateDevis } from "@/lib/validations";

const SIGNATURE_CANVAS_PADDING = 2;

export default function SignatureDevisPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data, setData } = useStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [nomSignataire, setNomSignataire] = useState("");
  const [success, setSuccess] = useState(false);
  const [refuseSuccess, setRefuseSuccess] = useState(false);
  const [refusedReasonShown, setRefusedReasonShown] = useState("");
  const [refuseModalOpen, setRefuseModalOpen] = useState(false);
  const [refusalReasonPreset, setRefusalReasonPreset] = useState("");
  const [refusalReasonCustom, setRefusalReasonCustom] = useState("");
  const [validationError, setValidationError] = useState("");
  const [confirmSignatureOpen, setConfirmSignatureOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signedEmailsSimulated, setSignedEmailsSimulated] = useState(false);

  const devisItem = data.devis.find((devis) => devis.id === id);
  const client = devisItem
    ? data.clients.find((clientItem) => clientItem.id === devisItem.clientId)
    : null;

  useEffect(() => {
    if (!isSignatureOpen) return;

    function resizeCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;

      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.beginPath();
      context.rect(0, 0, rect.width, rect.height);
      context.clip();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 2.5;
      context.strokeStyle = "#60A5FA";
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [isSignatureOpen]);

  function getPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, inside: false };
    const rect = canvas.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const inside =
      rawX >= 0 && rawX <= rect.width && rawY >= 0 && rawY <= rect.height;
    const minX = SIGNATURE_CANVAS_PADDING;
    const minY = SIGNATURE_CANVAS_PADDING;
    const maxX = Math.max(minX, rect.width - SIGNATURE_CANVAS_PADDING);
    const maxY = Math.max(minY, rect.height - SIGNATURE_CANVAS_PADDING);

    return {
      x: Math.min(Math.max(rawX, minX), maxX),
      y: Math.min(Math.max(rawY, minY), maxY),
      inside,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const point = getPoint(event);
    if (!point.inside) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const point = getPoint(event);
    if (!point.inside) {
      drawingRef.current = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      return;
    }

    context.lineTo(point.x, point.y);
    context.stroke();
    setHasSignature(true);
  }

  function stopDrawing(event?: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (event && canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    drawingRef.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
  }

  async function validateSignature() {
    const canvas = canvasRef.current;
    if (!devisItem || !canvas) return;
    if (devisItem.statut === "signe" || devisItem.statut === "refuse" || isSigned || isRefused) {
      return;
    }
    if (!nomSignataire.trim() || !hasSignature) return;
    if (hasValidationErrors(validateDevis(devisItem))) {
      setValidationError("Ce devis est incomplet et ne peut pas être signé.");
      return;
    }

    setIsSigning(true);
    setValidationError("");

    try {
      const signature = canvas.toDataURL("image/png");
      const clientIp = await resolveClientIpForSignature();
      const signedBy = nomSignataire.trim();

      const result = await completeDevisClientSignature({
        devis: devisItem,
        client: client ?? undefined,
        parametres: data.parametres,
        signature,
        signedBy,
        clientIp,
        totalHT: montantHT,
      });

      saveSignedDevisPdf(devisItem.id, result.pdfBase64);

      setData((previous) => {
        const nextDevis = previous.devis.map((devis) =>
          devis.id === devisItem.id ? result.devis : devis,
        );
        return {
          ...patchAppDataDevis(previous, nextDevis),
          notifications: [...previous.notifications, result.notification],
        };
      });

      if (result.emailsSimulated) {
        downloadStoredSignedDevisPdf({
          ...result.devis,
          signedPdfBase64: result.pdfBase64,
        });
        const companyPreview = `À: ${data.parametres.email ?? "(entreprise)"}\nObjet: Devis ${devisItem.numero} signé`;
        const clientPreview = client?.email
          ? `À: ${client.email}\nObjet: Copie devis signé ${devisItem.numero}`
          : "";
        await navigator.clipboard?.writeText(
          [companyPreview, clientPreview].filter(Boolean).join("\n\n"),
        );
        setSignedEmailsSimulated(true);
      }

      setSuccess(true);
      setIsSignatureOpen(false);
    } catch (error) {
      console.error("Signature devis:", error);
      setValidationError(
        "Impossible de finaliser la signature. Réessayez ou contactez l'entreprise.",
      );
    } finally {
      setIsSigning(false);
    }
  }

  function resolveRefusalReason(): string | undefined {
    if (!refusalReasonPreset) return undefined;
    if (refusalReasonPreset === "Autre") {
      return refusalReasonCustom.trim() || undefined;
    }
    return refusalReasonPreset;
  }

  async function confirmRefusal() {
    if (!devisItem || isSigned || isRefused) return;

    const refusalReason = resolveRefusalReason();
    const clientIp = await resolveClientIpForSignature();
    const refusedBy = getClientDisplayName(client ?? undefined) || "client";
    const notification = createDevisRefusalNotification({
      devis: devisItem,
      clientName: refusedBy,
      refusalReason,
    });
    const companyEmail = buildDevisRefusalCompanyEmail({
      devis: devisItem,
      client: client ?? undefined,
      parametres: data.parametres,
      refusalReason,
    });

    setData((previous) => ({
      ...previous,
      devis: previous.devis.map((devis) =>
        devis.id === devisItem.id
          ? markDevisRefusedByClient(devis, {
              refusedBy,
              refusalReason,
              clientIp,
            })
          : devis,
      ),
      notifications: [...previous.notifications, notification],
    }));

    void sendReminderEmail(companyEmail);
    setRefusedReasonShown(refusalReason ?? "");
    setRefuseSuccess(true);
    setRefuseModalOpen(false);
    setIsSignatureOpen(false);
  }

  if (!devisItem) {
    return (
      <main className="fixed inset-0 z-50 overflow-y-auto bg-background text-foreground">
        <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10">
          <Card className="w-full max-w-xl text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Devis introuvable
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Le lien de signature n'est pas valide ou le devis n'existe plus.
            </p>
          </Card>
        </section>
      </main>
    );
  }

  const displayStatut = getDevisDisplayStatut(devisItem);
  const montantHT = devisTotal(devisItem);
  const montantTTC = devisItem.montantTTC ?? montantHT;
  const tauxTVA = devisItem.tauxTVA ?? data.parametres.tva ?? 0;
  const montantTVA = Math.max(montantTTC - montantHT, 0);
  const isExpired = displayStatut === "expire";
  const isSigned = Boolean(devisItem.signature && devisItem.dateSignature) || success;
  const isRefused = devisItem.statut === "refuse" || refuseSuccess;
  const canRespond = !isSigned && !isRefused && !isExpired;

  return (
    <main className="fixed inset-0 z-50 overflow-y-auto bg-background text-foreground">
      <section className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-base font-black text-primary-foreground shadow-glow">
              B
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">
                Batimum
              </span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Signature devis
              </span>
            </span>
          </Link>
          <Badge
            label={DEVIS_STATUT_LABELS[displayStatut]}
            status={displayStatut}
          />
        </header>

        <Card className="overflow-hidden border-primary/25 shadow-glow">
          <section className="border-b border-border pb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {isRefused
                ? "Devis refusé"
                : isSigned
                  ? "Devis signé"
                  : "Devis à signer"}
            </p>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {devisItem.titre}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {devisItem.numero} · {formatDate(devisItem.dateDevis ?? devisItem.date)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card-elevated/60 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Total TTC
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {formatCurrency(montantTTC)}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-5 py-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card-elevated/50 p-5">
              <Label>Client</Label>
              <p className="font-semibold">{getClientDisplayName(client ?? undefined)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {client?.email ?? "Email non renseigné"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card-elevated/50 p-5">
              <Label>Entreprise</Label>
              <p className="font-semibold">{data.parametres.entreprise}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.parametres.email}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card-elevated/50 p-5">
              <Label>Montant HT</Label>
              <p className="font-semibold">{formatCurrency(montantHT)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card-elevated/50 p-5">
              <Label>Statut</Label>
              <p className="font-semibold">{DEVIS_STATUT_LABELS[displayStatut]}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card-elevated/50 p-5">
            <Label>Description</Label>
            <p className="text-sm leading-6 text-muted-foreground">
              {devisItem.lignes
                .map((ligne) => ligne.description)
                .filter(Boolean)
                .join(", ") || devisItem.titre}
            </p>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card-elevated/50 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold tracking-tight">
                Lignes du devis
              </h2>
              <span className="text-sm font-semibold text-primary">
                {formatCurrency(montantTTC)} TTC
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[680px] w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Description</th>
                    <th className="pb-2 pr-3 font-medium text-right">Qté</th>
                    <th className="pb-2 pr-3 font-medium">Unité</th>
                    <th className="pb-2 pr-3 font-medium text-right">P.U. HT</th>
                    <th className="pb-2 font-medium text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {devisItem.lignes.map((ligne) => (
                    <tr key={ligne.id} className="border-b border-border/50">
                      <td className="whitespace-pre-wrap py-3 pr-3">
                        {getLignePdfDescription(ligne) || "—"}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        {ligne.quantite}
                      </td>
                      <td className="py-3 pr-3">{ligne.unite ?? "forfait"}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        {formatCurrency(ligne.prixUnitaire)}
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums">
                        {formatCurrency(ligne.quantite * ligne.prixUnitaire)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <section className="mt-5 rounded-xl border border-border bg-background/40 px-4 py-3 text-sm">
              <p className="flex justify-between gap-4 text-muted-foreground">
                <span>Total HT</span>
                <span>{formatCurrency(montantHT)}</span>
              </p>
              <p className="mt-2 flex justify-between gap-4 text-muted-foreground">
                <span>TVA ({tauxTVA}%)</span>
                <span>{formatCurrency(montantTVA)}</span>
              </p>
              <p className="mt-2 flex justify-between gap-4 font-semibold text-foreground">
                <span>Total TTC</span>
                <span>{formatCurrency(montantTTC)}</span>
              </p>
            </section>
          </section>

          {isExpired ? (
            <section className="btp-alert-warning mt-6 p-5">
              <h2 className="text-lg font-semibold">Devis expiré</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                La date de validité de ce devis est dépassée. La signature et le
                refus ne sont plus possibles en ligne. Contactez l&apos;entreprise
                pour un nouveau devis.
              </p>
            </section>
          ) : isRefused ? (
            <section className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 p-5">
              <h2 className="text-lg font-semibold text-danger-foreground">Devis refusé</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Votre refus a bien été pris en compte. L&apos;entreprise a été
                informée.
              </p>
              {(devisItem.refusalReason || refusedReasonShown) && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Motif : {devisItem.refusalReason || refusedReasonShown}
                </p>
              )}
            </section>
          ) : isSigned ? (
            <section className="mt-6 rounded-2xl border border-primary/25 bg-primary/10 p-5">
              <h2 className="text-lg font-semibold text-primary">
                Devis signé avec succès
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Signé par {devisItem.signedBy ?? devisItem.nomSignataire ?? nomSignataire}{" "}
                le{" "}
                {formatDateTimeFR(
                  devisItem.signedAt ?? devisItem.dateSignature ?? new Date().toISOString(),
                )}
                .
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Le devis est verrouillé. Toute modification ultérieure nécessite
                une duplication ou une nouvelle version.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Une copie du PDF signé (version officielle) a été envoyée par email
                à vous et à l&apos;entreprise.
              </p>
              {signedEmailsSimulated && (
                <p className="mt-2 text-sm text-primary">
                  Mode simulation : PDF téléchargé et contenu des emails copié
                  dans le presse-papier.
                </p>
              )}
            </section>
          ) : (
            <section className="mt-6">
              {!isSignatureOpen ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button onClick={() => setIsSignatureOpen(true)}>
                    Accepter et signer le devis
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setRefuseModalOpen(true)}
                  >
                    Refuser le devis
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card-elevated/60 p-5">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Signature électronique
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Signez dans la zone ci-dessous avec la souris ou le doigt.
                  </p>
                  {validationError && (
                    <p className="mt-4 btp-alert-error px-4 py-3 text-sm">
                      {validationError}
                    </p>
                  )}

                  <div className="mt-5">
                    <Label>Nom du signataire</Label>
                    <Input
                      value={nomSignataire}
                      onChange={(event) => setNomSignataire(event.target.value)}
                      placeholder="Ex : Jean Martin"
                    />
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-background/70 p-3 shadow-inner">
                    <canvas
                      ref={canvasRef}
                      className="block h-44 w-full touch-none overflow-hidden rounded-xl bg-background/70"
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerCancel={stopDrawing}
                      onPointerLeave={stopDrawing}
                    />
                  </div>

                  <footer className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsSignatureOpen(false);
                        clearSignature();
                      }}
                    >
                      Annuler
                    </Button>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="secondary" onClick={clearSignature}>
                        Effacer
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setConfirmSignatureOpen(true)}
                        disabled={!nomSignataire.trim() || !hasSignature}
                      >
                        Valider la signature
                      </Button>
                    </div>
                  </footer>
                </div>
              )}
            </section>
          )}
        </Card>
      </section>

      <Modal
        open={refuseModalOpen && canRespond}
        onClose={() => setRefuseModalOpen(false)}
        title="Confirmer le refus du devis"
      >
        <section className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">
            Êtes-vous sûr de vouloir refuser ce devis ? Cette action sera
            transmise à l&apos;entreprise.
          </p>

          <section>
            <Label>Motif du refus (optionnel)</Label>
            <Select
              className="mt-2"
              value={refusalReasonPreset}
              onChange={(event) => setRefusalReasonPreset(event.target.value)}
            >
              <option value="">Sélectionner un motif</option>
              {DEVIS_REFUSAL_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </Select>
            {refusalReasonPreset === "Autre" && (
              <Input
                className="mt-2"
                value={refusalReasonCustom}
                onChange={(event) => setRefusalReasonCustom(event.target.value)}
                placeholder="Précisez le motif"
              />
            )}
          </section>

          <footer className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRefuseModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="button" variant="danger" onClick={() => void confirmRefusal()}>
              Confirmer le refus
            </Button>
          </footer>
        </section>
      </Modal>

      <ConfirmDialog
        open={confirmSignatureOpen}
        message="Confirmer la validation de cette signature ?"
        confirmLabel="Confirmer"
        onCancel={() => setConfirmSignatureOpen(false)}
        onConfirm={() => {
          setConfirmSignatureOpen(false);
          validateSignature();
        }}
      />
    </main>
  );
}
