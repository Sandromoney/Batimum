"use client";

import type { DevisCounters } from "@/lib/hooks/use-devis-local";

const items: { key: keyof DevisCounters; label: string }[] = [
  { key: "total", label: "Devis total" },
  { key: "brouillon", label: "Brouillon" },
  { key: "envoye", label: "Envoyé" },
  { key: "signe", label: "Signé" },
  { key: "refuse", label: "Refusé" },
  { key: "expire", label: "Expiré" },
];

export function DevisCounters({ counters }: { counters: DevisCounters }) {
  return (
    <section className="btp-dashboard-stats grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items.map(({ key, label }) => (
        <article
          key={key}
          className="rounded-2xl border border-border bg-card px-5 py-4 shadow-card transition-all duration-200 hover:bg-card-hover hover:shadow-card-hover"
        >
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-[-0.03em] text-foreground">
            {counters[key]}
          </p>
        </article>
      ))}
    </section>
  );
}
