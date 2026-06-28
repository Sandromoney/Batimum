"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { DataTable, Td, Tr } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { getClientDisplayName } from "@/lib/clients";
import { COMMANDE_STATUT_LABELS } from "@/lib/commandes";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Eye } from "lucide-react";

export default function CommandesPage() {
  const router = useRouter();
  const { data } = useStore();
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () =>
      [...data.commandes].sort((a, b) =>
        b.dateCreation.localeCompare(a.dateCreation),
      ),
    [data.commandes],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sorted;

    return sorted.filter((commande) => {
      const client = data.clients.find((item) => item.id === commande.clientId);
      const haystack = [
        commande.numero,
        commande.devisNumero,
        commande.devisTitre,
        getClientDisplayName(client),
        COMMANDE_STATUT_LABELS[commande.statut],
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data.clients, search, sorted]);

  return (
    <div className="btp-app-page space-y-6">
      <PageHeader
        title="Commandes"
        description="Devis acceptés ou signés passés en commande"
      />

      <section className="mb-6">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une commande, un client, un devis…"
        />
      </section>

      <DataTable
        headers={["N°", "Client", "Devis source", "Montant", "Statut", "Date", ""]}
      >
        {filtered.map((commande) => {
          const client = data.clients.find((item) => item.id === commande.clientId);
          return (
            <Tr
              key={commande.id}
              onClick={() => router.push(`/commandes/${commande.id}`)}
              className="cursor-pointer"
            >
              <Td className="font-medium">{commande.numero}</Td>
              <Td>{getClientDisplayName(client)}</Td>
              <Td>
                {commande.devisNumero ?? "—"}
                {commande.devisTitre ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {commande.devisTitre}
                  </span>
                ) : null}
              </Td>
              <Td className="tabular-nums">
                {formatCurrency(commande.montantTTC)}
              </Td>
              <Td>
                <Badge
                  label={COMMANDE_STATUT_LABELS[commande.statut]}
                  status={commande.statut}
                />
              </Td>
              <Td>{formatDate(commande.dateCreation)}</Td>
              <Td>
                <ButtonLink
                  href={`/commandes/${commande.id}`}
                  variant="secondary"
                  size="sm"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Eye className="h-4 w-4" />
                  Voir
                </ButtonLink>
              </Td>
            </Tr>
          );
        })}
      </DataTable>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">
          Aucune commande. Passez un devis accepté ou signé en commande depuis la
          fiche devis.
        </p>
      )}
    </div>
  );
}
