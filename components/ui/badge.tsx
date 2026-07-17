import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  brouillon:
    "bg-zinc-500/15 text-[rgb(var(--color-neutral-text))] ring-1 ring-zinc-500/25",
  envoye: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  envoyee: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  accepte: "bg-card-hover text-foreground ring-1 ring-border",
  signe:
    "bg-emerald-500/15 text-[rgb(var(--color-success-text))] ring-1 ring-emerald-500/30",
  refuse:
    "bg-red-500/15 text-[rgb(var(--color-danger-text))] ring-1 ring-red-500/30",
  expire:
    "bg-orange-500/15 text-[rgb(var(--color-orange-text))] ring-1 ring-orange-500/30",
  archive: "bg-card-hover text-muted ring-1 ring-border",
  payee: "bg-emerald-500/15 text-[rgb(var(--color-success-text))] ring-1 ring-emerald-500/30",
  en_attente: "bg-card-hover text-muted ring-1 ring-border",
  en_retard:
    "bg-red-500/15 text-[rgb(var(--color-danger-text))] ring-1 ring-red-500/30",
  planifie:
    "bg-zinc-500/15 text-[rgb(var(--color-neutral-text))] ring-1 ring-zinc-500/25",
  en_cours: "bg-card-hover text-foreground ring-1 ring-border",
  retard_demarrage:
    "bg-orange-500/15 text-[rgb(var(--color-orange-text))] ring-1 ring-orange-500/30",
  terminee: "bg-card-hover text-muted ring-1 ring-border",
  annulee: "bg-card-hover text-muted ring-1 ring-border",
  termine:
    "bg-emerald-500/15 text-[rgb(var(--color-success-text))] ring-1 ring-emerald-500/30",
  suspendu: "bg-card-hover text-muted ring-1 ring-border",
  intervention: "bg-card-hover text-muted ring-1 ring-border",
  deplacement: "bg-card-hover text-muted ring-1 ring-border",
  rendez_vous_client: "bg-card-hover text-muted ring-1 ring-border",
  livraison_materiaux: "bg-card-hover text-muted ring-1 ring-border",
  reunion_chantier: "bg-card-hover text-muted ring-1 ring-border",
  sav: "bg-card-hover text-muted ring-1 ring-border",
  autre: "bg-card-hover text-muted ring-1 ring-border",
  reunion: "bg-card-hover text-muted ring-1 ring-border",
  livraison: "bg-card-hover text-muted ring-1 ring-border",
  classique: "bg-card-hover text-muted ring-1 ring-border",
  acompte: "bg-card-hover text-muted ring-1 ring-border",
  situation: "bg-card-hover text-muted ring-1 ring-border",
  solde: "bg-card-hover text-muted ring-1 ring-border",
  avoir_partiel:
    "bg-amber-500/10 text-[rgb(var(--color-warning-text))] ring-1 ring-amber-500/25",
  avoir_total: "bg-card-hover text-muted ring-1 ring-border",
};

export function Badge({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm",
        "shadow-[var(--shadow-input)]",
        colors[status] ?? "bg-card-hover text-muted ring-1 ring-border",
      )}
    >
      {label}
    </span>
  );
}
