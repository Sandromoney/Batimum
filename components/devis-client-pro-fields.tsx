"use client";

import { Input, Label } from "@/components/ui/input";
import {
  hasIncompleteProClientInfo,
  isClientProfessionnel,
} from "@/lib/clients";
import type { Client } from "@/lib/types";

export function DevisClientProFields({
  client,
  onUpdate,
}: {
  client?: Client;
  onUpdate: (patch: Partial<Client>) => void;
}) {
  if (!client || !isClientProfessionnel(client)) return null;

  const incomplete = hasIncompleteProClientInfo(client);

  return (
    <section className="mt-4 space-y-4 rounded-xl border border-border/70 bg-card-elevated/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Client professionnel
        </p>
        {incomplete && (
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground ring-1 ring-amber-500/25">
            Infos PRO manquantes
          </span>
        )}
      </div>

      {incomplete && (
        <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-warning-foreground">
          Attention : les informations professionnelles du client sont
          incomplètes.
        </p>
      )}

      <section>
        <Label>SIRET</Label>
        <Input
          value={client.siret ?? ""}
          onChange={(event) => onUpdate({ siret: event.target.value })}
          placeholder="123 456 789 00012"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <section>
          <Label>TVA intracommunautaire</Label>
          <Input
            value={client.tvaIntracom ?? ""}
            onChange={(event) => onUpdate({ tvaIntracom: event.target.value })}
            placeholder="FR12345678901"
          />
        </section>
        <section>
          <Label>Code APE</Label>
          <Input
            value={client.codeApe ?? ""}
            onChange={(event) => onUpdate({ codeApe: event.target.value })}
            placeholder="Ex : 4399C"
          />
        </section>
      </section>
    </section>
  );
}
