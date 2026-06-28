import { cn } from "@/lib/utils";
import { getClientDisplayName, isClientProfessionnel } from "@/lib/clients";
import type { Client } from "@/lib/types";

export function ClientNameDisplay({
  client,
  className,
}: {
  client?: Pick<Client, "nom" | "prenom" | "societe" | "typeClient">;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5", className)}>
      <span className="truncate">{getClientDisplayName(client)}</span>
      {isClientProfessionnel(client) && (
        <span className="shrink-0 rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-400 ring-1 ring-orange-500/25">
          PRO
        </span>
      )}
    </span>
  );
}
