import { logClientLinkedEvent } from "@/lib/client-historique";
import {
  logCommandeFactureCreated,
  markCommandeCreated,
} from "@/lib/commande-historique";
import { appendDevisHistorique } from "@/lib/devis-statut";
import { appendChantierHistorique } from "@/lib/chantier-statut";
import { getFactureCreatedLabel } from "@/lib/facture-statut";
import type {
  Chantier,
  Client,
  Commande,
  Devis,
  Facture,
} from "@/lib/types";

function factureMeta(facture: Facture): Record<string, string> {
  return {
    factureId: facture.id,
    factureNumero: facture.numero,
    typeFacture: facture.typeFacture ?? "classique",
  };
}

export function recordCommandeCreation({
  devis,
  commande,
  client,
  chantier,
}: {
  devis: Devis;
  commande: Commande;
  client?: Client;
  chantier?: Chantier;
}): {
  devis: Devis;
  commande: Commande;
  client?: Client;
  chantier?: Chantier;
} {
  const commandeWithHistory = markCommandeCreated(commande);

  const nextDevis = appendDevisHistorique(devis, {
    type: "commande_liee",
    label: "Commande créée.",
    meta: {
      commandeId: commande.id,
      commandeNumero: commande.numero,
    },
  });

  const nextClient = client
    ? logClientLinkedEvent(
        client,
        "commande_liee",
        `Commande ${commande.numero} créée.`,
        {
          commandeId: commande.id,
          devisId: devis.id,
          devisNumero: devis.numero,
        },
      )
    : undefined;

  const nextChantier = chantier
    ? appendChantierHistorique(chantier, {
        type: "commande_liee",
        label: `Commande ${commande.numero} créée.`,
        meta: {
          commandeId: commande.id,
          devisId: devis.id,
        },
      })
    : undefined;

  return {
    devis: nextDevis,
    commande: commandeWithHistory,
    client: nextClient,
    chantier: nextChantier,
  };
}

export function recordChantierCreation({
  devis,
  chantier,
  client,
}: {
  devis?: Devis;
  chantier: Chantier;
  client?: Client;
}): {
  devis?: Devis;
  chantier: Chantier;
  client?: Client;
} {
  const nextDevis = devis
    ? appendDevisHistorique(devis, {
        type: "chantier_lie",
        label: "Chantier créé.",
        meta: {
          chantierId: chantier.id,
          chantierNom: chantier.nom,
        },
      })
    : undefined;

  const nextClient = client
    ? logClientLinkedEvent(client, "chantier_lie", `Chantier « ${chantier.nom} » créé.`, {
        chantierId: chantier.id,
        devisId: chantier.devisId ?? "",
      })
    : undefined;

  const nextChantier = chantier.devisId
    ? appendChantierHistorique(chantier, {
        type: "devis_lie",
        label: `Lié au devis ${chantier.devisNumber ?? chantier.devisId}.`,
        meta: {
          devisId: chantier.devisId,
          devisNumero: chantier.devisNumber ?? "",
        },
      })
    : chantier;

  return {
    devis: nextDevis,
    chantier: nextChantier,
    client: nextClient,
  };
}

export function recordDevisCreatedForClient({
  devis,
  client,
}: {
  devis: Devis;
  client?: Client;
}): { devis: Devis; client?: Client } {
  if (!client) return { devis };
  return {
    devis,
    client: logClientLinkedEvent(client, "devis_lie", `Devis ${devis.numero} créé.`, {
      devisId: devis.id,
      devisNumero: devis.numero,
    }),
  };
}

export function recordFactureCreation({
  facture,
  devis,
  commande,
  client,
  chantier,
}: {
  facture: Facture;
  devis?: Devis;
  commande?: Commande;
  client?: Client;
  chantier?: Chantier;
}): {
  facture: Facture;
  devis?: Devis;
  commande?: Commande;
  client?: Client;
  chantier?: Chantier;
} {
  const label = getFactureCreatedLabel(facture.typeFacture);
  const meta = factureMeta(facture);

  const nextDevis = devis
    ? appendDevisHistorique(devis, {
        type: "facture_liee",
        label,
        meta,
      })
    : undefined;

  const nextCommande = commande
    ? logCommandeFactureCreated(commande, label, meta)
    : undefined;

  const nextClient = client
    ? logClientLinkedEvent(client, "facture_liee", `${facture.numero} — ${label}`, meta)
    : undefined;

  const nextChantier = chantier
    ? appendChantierHistorique(chantier, {
        type: "facture_liee",
        label: `${facture.numero} — ${label}`,
        meta,
      })
    : undefined;

  return {
    facture,
    devis: nextDevis,
    commande: nextCommande,
    client: nextClient,
    chantier: nextChantier,
  };
}

export function recordFacturePaid({
  facture,
  devis,
  commande,
  client,
  chantier,
}: {
  facture: Facture;
  devis?: Devis;
  commande?: Commande;
  client?: Client;
  chantier?: Chantier;
}): {
  devis?: Devis;
  commande?: Commande;
  client?: Client;
  chantier?: Chantier;
} {
  const label = "Facture payée.";
  const meta = factureMeta(facture);

  return {
    devis: devis
      ? appendDevisHistorique(devis, { type: "facture_liee", label, meta })
      : undefined,
    commande: commande
      ? logCommandeFactureCreated(commande, label, meta)
      : undefined,
    client: client
      ? logClientLinkedEvent(client, "facture_liee", `${facture.numero} — ${label}`, meta)
      : undefined,
    chantier: chantier
      ? appendChantierHistorique(chantier, {
          type: "facture_liee",
          label: `${facture.numero} — ${label}`,
          meta,
        })
      : undefined,
  };
}

