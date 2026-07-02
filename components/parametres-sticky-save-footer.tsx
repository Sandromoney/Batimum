"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ParametresStickySaveFooterProps = {
  isDirty: boolean;
  saving: boolean;
  loadingSettings: boolean;
  lastModifiedAt: string | null;
  onReset: () => void;
};

function formatRelativeTimeFr(isoDate: string, nowMs: number): string {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return "";

  const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (diffSec < 60) return "à l'instant";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `il y a ${diffDays} j`;
}

export function ParametresStickySaveFooter({
  isDirty,
  saving,
  loadingSettings,
  lastModifiedAt,
  onReset,
}: ParametresStickySaveFooterProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isDirty || !lastModifiedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [isDirty, lastModifiedAt]);

  if (!isDirty) return null;

  const relativeTime = lastModifiedAt
    ? formatRelativeTimeFr(lastModifiedAt, now)
    : "";

  return (
    <footer
      className={cn(
        "sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-background/95 px-4 py-4 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.65)] sm:mt-0"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-200">
            Modifications non enregistrées
          </p>
          {relativeTime ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Dernière modification {relativeTime}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="submit"
          className="min-w-[200px] bg-amber-600 text-white shadow-[0_0_20px_rgba(251,191,36,0.22)] hover:bg-amber-500"
          disabled={saving || loadingSettings}
        >
          {saving ? "Enregistrement…" : "Enregistrer les paramètres"}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={saving || loadingSettings}
          onClick={onReset}
        >
          Réinitialiser les données
        </Button>
      </div>
    </footer>
  );
}
