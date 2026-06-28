"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  formatPhoneDisplay,
  getGoogleMapsUrl,
  getWazeUrl,
  isMobileCallDevice,
  normalizePhoneForTel,
} from "@/lib/employee-chantier-actions";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Copy,
  HardHat,
  Map,
  Navigation,
  Phone,
} from "lucide-react";

export function EmployeeChantierActions({
  responsableNom,
  responsableTelephone,
  adresseComplete,
  adresseCompleteValide = false,
  onReport,
  compact = false,
}: {
  responsableNom?: string;
  responsableTelephone?: string;
  adresseComplete?: string;
  adresseCompleteValide?: boolean;
  onReport?: () => void;
  compact?: boolean;
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileCallDevice());
  }, []);

  const phoneDisplay = responsableTelephone
    ? formatPhoneDisplay(responsableTelephone)
    : "";
  const phoneTel = phoneDisplay ? normalizePhoneForTel(phoneDisplay) : "";
  const hasPhone = phoneTel.length > 0;
  const hasResponsable = Boolean(responsableNom?.trim());
  const canNavigate = adresseCompleteValide && Boolean(adresseComplete?.trim());

  async function copyPhone() {
    if (!phoneDisplay) return;
    try {
      await navigator.clipboard.writeText(phoneDisplay);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const actionButtonClass = cn(
    "min-h-14 w-full rounded-2xl text-base font-semibold sm:min-h-12 sm:text-sm",
    compact && "min-h-12 text-sm",
  );

  return (
    <>
      <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
        {(hasResponsable || hasPhone) && (
          <div className="rounded-2xl border border-border/50 bg-card/40 px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <HardHat className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Responsable
                </p>
                {hasResponsable && (
                  <p className="mt-0.5 font-semibold text-foreground">
                    {responsableNom}
                  </p>
                )}
                {hasPhone && (
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                      {phoneDisplay}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyPhone()}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Copy className="h-3 w-3" />
                      {copied ? "Copié" : "Copier"}
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            "grid gap-2",
            compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
          )}
        >
          {hasPhone ? (
            <a
              href={`tel:${phoneTel}`}
              className={cn(
                "btp-btn inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground shadow-glow transition-all hover:bg-primary-hover",
                actionButtonClass,
              )}
            >
              <Phone className="h-5 w-5" />
              Appeler
            </a>
          ) : (
            <Button type="button" className={actionButtonClass} disabled>
              <Phone className="h-5 w-5" />
              Appeler
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            className={actionButtonClass}
            onClick={() => setNavigationOpen(true)}
            disabled={!canNavigate}
          >
            <Navigation className="h-5 w-5" />
            Itinéraire
          </Button>

          {onReport && (
            <Button
              type="button"
              variant="secondary"
              className={cn(actionButtonClass, !compact && "sm:col-span-2")}
              onClick={onReport}
            >
              <AlertTriangle className="h-4 w-4" />
              Signaler un problème
            </Button>
          )}
        </div>

        {!hasPhone && (
          <p className="text-center text-xs text-warning-foreground/90">
            Numéro responsable manquant
          </p>
        )}
        {!canNavigate && (
          <p className="text-center text-xs text-warning-foreground/90">
            Adresse chantier incomplète
          </p>
        )}
      </div>

      <Modal
        open={navigationOpen}
        onClose={() => setNavigationOpen(false)}
        title="Ouvrir l'itinéraire"
      >
        <div className="space-y-3">
          {adresseComplete && (
            <p className="rounded-xl border border-border/50 bg-card-elevated/30 px-3 py-2.5 text-sm text-muted-foreground">
              {adresseComplete}
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            className="min-h-14 w-full justify-center gap-3 text-base font-semibold"
            disabled={!canNavigate}
            onClick={() => {
              if (!canNavigate || !adresseComplete) return;
              if (isMobile) {
                window.location.href = getGoogleMapsUrl(adresseComplete);
              } else {
                window.open(
                  getGoogleMapsUrl(adresseComplete),
                  "_blank",
                  "noopener,noreferrer",
                );
              }
              setNavigationOpen(false);
            }}
          >
            <Map className="h-5 w-5 text-primary" />
            Google Maps
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-14 w-full justify-center gap-3 text-base font-semibold"
            disabled={!canNavigate}
            onClick={() => {
              if (!canNavigate || !adresseComplete) return;
              if (isMobile) {
                window.location.href = getWazeUrl(adresseComplete);
              } else {
                window.open(getWazeUrl(adresseComplete), "_blank", "noopener,noreferrer");
              }
              setNavigationOpen(false);
            }}
          >
            <Navigation className="h-5 w-5 text-primary" />
            Waze
          </Button>
        </div>
      </Modal>
    </>
  );
}
