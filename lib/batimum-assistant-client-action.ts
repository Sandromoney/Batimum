import { markClientCreated } from "@/lib/client-historique";
import { createDevisBrouillon } from "@/lib/devis";
import { splitClientName } from "@/lib/batimum-nlu";
import type { AppData } from "@/lib/types";
import { generateId } from "@/lib/utils";

export function createClientInStore(
  data: AppData,
  fullName: string,
): { nextData: AppData; clientId: string; displayName: string } {
  const { prenom, nom } = splitClientName(fullName);
  const client = markClientCreated({
    id: generateId(),
    nom,
    prenom,
    telephone: "",
    adresse: "",
    codePostal: "",
    ville: "",
    createdAt: new Date().toISOString().slice(0, 10),
  });

  return {
    nextData: {
      ...data,
      clients: [...data.clients, client],
    },
    clientId: client.id,
    displayName: [prenom, nom].filter(Boolean).join(" ").trim() || nom,
  };
}

export function createDevisForClientInStore(
  data: AppData,
  clientId: string,
): { nextData: AppData; devisId: string } {
  const devis = createDevisBrouillon(
    data.clients,
    data.devis,
    { clientId },
    data.parametres,
  );
  const client = data.clients.find((c) => c.id === clientId);
  const titre = client
    ? `Devis — ${[client.prenom, client.nom].filter(Boolean).join(" ")}`
    : devis.titre;

  const enriched = { ...devis, titre, clientId };
  return {
    nextData: {
      ...data,
      devis: [...data.devis, enriched],
    },
    devisId: enriched.id,
  };
}
