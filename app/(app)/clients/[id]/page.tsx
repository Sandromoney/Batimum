"use client";

import { ClientFicheView } from "@/components/client-fiche-view";
import { MumIaContextButton } from "@/components/mum-ia-context-button";
import { PageHeader } from "@/components/page-header";
import { useParams } from "next/navigation";

export default function ClientFichePage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fiche client"
        description="Historique, documents et indicateurs liés à ce client."
        action={<MumIaContextButton />}
      />
      <ClientFicheView clientId={clientId} />
    </div>
  );
}
