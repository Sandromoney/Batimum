import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  brouillon:
    "bg-zinc-500/15 text-[rgb(var(--color-neutral-text))] ring-1 ring-zinc-500/25",
  envoye: "bg-primary/10 text-primary ring-1 ring-primary/25",
  envoyee: "bg-primary/10 text-primary ring-1 ring-primary/25",
  accepte: "bg-primary/10 text-primary ring-1 ring-primary/25",
  signe:
    "bg-emerald-500/15 text-[rgb(var(--color-success-text))] ring-1 ring-emerald-500/30",
  refuse:
    "bg-red-500/15 text-[rgb(var(--color-danger-text))] ring-1 ring-red-500/30",
  expire:
    "bg-orange-500/15 text-[rgb(var(--color-orange-text))] ring-1 ring-orange-500/30",
  archive: "bg-card-hover text-muted ring-1 ring-border",
  payee: "bg-primary/10 text-primary ring-1 ring-primary/25",
  en_attente: "bg-card-hover text-muted ring-1 ring-border",
  en_retard:
    "bg-red-500/15 text-[rgb(var(--color-danger-text))] ring-1 ring-red-500/30",
  planifie:
    "bg-zinc-500/15 text-[rgb(var(--color-neutral-text))] ring-1 ring-zinc-500/25",
  en_cours: "bg-primary/10 text-primary ring-1 ring-primary/25",
  retard_demarrage:
    "bg-orange-500/15 text-[rgb(var(--color-orange-text))] ring-1 ring-orange-500/30",
  terminee: "bg-card-hover text-muted ring-1 ring-border",
  annulee: "bg-card-hover text-muted ring-1 ring-border",
  termine:
    "bg-emerald-500/15 text-[rgb(var(--color-success-text))] ring-1 ring-emerald-500/30",
  suspendu: "bg-card-hover text-muted ring-1 ring-border",
  intervention: "bg-primary/10 text-primary ring-1 ring-primary/25",
  deplacement: "bg-primary/10 text-primary ring-1 ring-primary/25",
  rendez_vous_client: "bg-primary/10 text-primary ring-1 ring-primary/25",
  livraison_materiaux: "bg-primary/10 text-primary ring-1 ring-primary/25",
  reunion_chantier: "bg-primary/10 text-primary ring-1 ring-primary/25",
  sav: "bg-primary/10 text-primary ring-1 ring-primary/25",
  autre: "bg-primary/10 text-primary ring-1 ring-primary/25",
  reunion: "bg-primary/10 text-primary ring-1 ring-primary/25",
  livraison: "bg-primary/10 text-primary ring-1 ring-primary/25",
  classique: "bg-card-hover text-muted ring-1 ring-border",
  acompte: "bg-primary/10 text-primary ring-1 ring-primary/25",
  situation: "bg-primary/15 text-primary ring-1 ring-primary/30",
  solde: "bg-primary/20 text-primary ring-1 ring-primary/40",
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
