import { getClientDisplayName } from "./clients";
import { factureMontantHT } from "./factures";
import {
  deriveSirenFromSiret,
  formatAdresseEntreprise,
  getEmailFacturation,
} from "./parametres";
import type { Client, Facture, Parametres } from "./types";
import {
  getTransmissionStatutLabel,
  resolveParametresFacturationElectronique,
} from "@/lib/electronic-invoice/facture-transmission";
import { formatCurrency } from "./utils";

export type MentionConformite = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export type FactureElectroniqueExport = {
  version: "1.0";
  format: "structure-pre-factur-x";
  genereLe: string;
  facture: {
    id: string;
    numero: string;
    dateEmission: string;
    dateEcheance: string;
    typeFacture?: string;
    conditionsPaiement?: string;
    penalitesRetard?: string;
    indemniteForfaitaire?: string;
  };
  vendeur: {
    raisonSociale: string;
    formeJuridique?: string;
    siret: string;
    siren: string;
    tvaIntracom?: string;
    adresse: string;
    emailFacturation: string;
    telephone: string;
  };
  acheteur: {
    nom: string;
    typeClient?: string;
    siret?: string;
    siren?: string;
    tvaIntracom?: string;
    adresse?: string;
    email?: string;
  };
  lignes: Array<{
    id: string;
    description: string;
    quantite: number;
    unite?: string;
    prixUnitaireHT: number;
    tauxTVA?: number;
    montantHT: number;
  }>;
  totaux: {
    montantHT: number;
    montantTVA: number;
    montantTTC: number;
    devise: "EUR";
  };
  mentionsLegales: {
    conditionsReglement?: string;
    penalitesRetard?: string;
    indemniteForfaitaire?: string;
    tribunalCompetent?: string;
  };
  transmission: {
    statut: string;
    plateforme?: string;
    identifiantFactureElectronique?: string;
    pdpTransmissionId?: string;
    dateTransmission?: string;
    dateAcceptation?: string;
    dateRejet?: string;
    motifRejet?: string;
    note: string;
  };
};

function isClientProfessionnel(client?: Client) {
  return client?.typeClient === "professionnel" || Boolean(client?.siret?.trim());
}

export function validateParametresEFacturation(
  parametres: Parametres,
): MentionConformite[] {
  const siren = parametres.siren?.trim() || deriveSirenFromSiret(parametres.siret);

  return [
    {
      id: "entreprise",
      label: "Raison sociale",
      ok: Boolean(parametres.entreprise?.trim()),
    },
    {
      id: "siret",
      label: "SIRET",
      ok: parametres.siret.replace(/\D/g, "").length === 14,
    },
    {
      id: "siren",
      label: "SIREN",
      ok: siren.replace(/\D/g, "").length === 9,
    },
    {
      id: "forme-juridique",
      label: "Forme juridique",
      ok: Boolean(parametres.formeJuridique?.trim()),
    },
    {
      id: "adresse",
      label: "Adresse complète",
      ok: Boolean(
        parametres.adresse?.trim() &&
          parametres.codePostal?.trim() &&
          parametres.ville?.trim(),
      ),
    },
    {
      id: "email-facturation",
      label: "Email de facturation",
      ok: Boolean(getEmailFacturation(parametres)),
    },
    {
      id: "tva-intracom",
      label: "TVA intracommunautaire",
      ok: Boolean(parametres.tvaIntracom?.trim()),
    },
    {
      id: "conditions",
      label: "Conditions de paiement",
      ok: Boolean(parametres.conditionsReglement?.trim()),
    },
    {
      id: "penalites",
      label: "Pénalités de retard",
      ok: Boolean(parametres.penalitesRetard?.trim()),
    },
    {
      id: "indemnite",
      label: "Indemnité forfaitaire de recouvrement",
      ok: Boolean(parametres.indemniteForfaitaire?.trim()),
    },
  ];
}

export function validateFactureMentionsObligatoires({
  facture,
  client,
  parametres,
  allFactures,
}: {
  facture: Facture;
  client?: Client;
  parametres: Parametres;
  allFactures: Facture[];
}): MentionConformite[] {
  const montantHT = facture.montantHT ?? factureMontantHT(facture);
  const montantTTC = facture.montantTTC ?? facture.montant;
  const montantTVA = Math.round((montantTTC - montantHT) * 100) / 100;
  const numeroUnique = allFactures.filter((f) => f.numero === facture.numero).length <= 1;
  const numerosAnterieurs = allFactures
    .filter((f) => f.id !== facture.id && f.dateEmission <= facture.dateEmission)
    .map((f) => f.numero);
  const chronologique =
    numerosAnterieurs.length === 0 ||
    !numerosAnterieurs.some((numero) => numero.localeCompare(facture.numero) > 0);

  const mentions: MentionConformite[] = [
    {
      id: "numero-unique",
      label: "Numéro de facture unique",
      ok: numeroUnique && Boolean(facture.numero?.trim()),
    },
    {
      id: "numero-chrono",
      label: "Numérotation chronologique",
      ok: chronologique,
      detail: chronologique ? undefined : "Vérifier la séquence des numéros",
    },
    {
      id: "date-emission",
      label: "Date d'émission",
      ok: Boolean(facture.dateEmission),
    },
    {
      id: "vendeur",
      label: "Vendeur (entreprise)",
      ok: Boolean(parametres.entreprise?.trim()),
    },
    {
      id: "client",
      label: "Client",
      ok: Boolean(client),
    },
    {
      id: "siret-vendeur",
      label: "SIRET vendeur",
      ok: parametres.siret.replace(/\D/g, "").length === 14,
    },
    {
      id: "siren-vendeur",
      label: "SIREN vendeur",
      ok: (parametres.siren ?? deriveSirenFromSiret(parametres.siret)).replace(
        /\D/g,
        "",
      ).length === 9,
    },
    {
      id: "tva",
      label: "TVA",
      ok: typeof facture.tauxTVA === "number" || montantTVA >= 0,
    },
    {
      id: "total-ht",
      label: "Total HT",
      ok: montantHT > 0,
      detail: formatCurrency(montantHT),
    },
    {
      id: "total-tva",
      label: "Total TVA",
      ok: montantTVA >= 0,
      detail: formatCurrency(montantTVA),
    },
    {
      id: "total-ttc",
      label: "Total TTC",
      ok: montantTTC > 0,
      detail: formatCurrency(montantTTC),
    },
    {
      id: "conditions-paiement",
      label: "Conditions de paiement",
      ok: Boolean(parametres.conditionsReglement?.trim()),
    },
    {
      id: "date-echeance",
      label: "Date d'échéance",
      ok: Boolean(facture.dateEcheance),
    },
    {
      id: "penalites",
      label: "Pénalités de retard",
      ok: Boolean(parametres.penalitesRetard?.trim()),
    },
  ];

  if (isClientProfessionnel(client)) {
    mentions.push({
      id: "indemnite-pro",
      label: "Indemnité forfaitaire (client professionnel)",
      ok: Boolean(parametres.indemniteForfaitaire?.trim()),
    });
    if (client?.siret?.trim()) {
      mentions.push({
        id: "siret-client",
        label: "SIRET client",
        ok: client.siret.replace(/\D/g, "").length === 14,
      });
    }
  }

  return mentions;
}

export function buildFactureElectroniqueExport({
  facture,
  client,
  parametres,
}: {
  facture: Facture;
  client?: Client;
  parametres: Parametres;
}): FactureElectroniqueExport {
  const montantHT = facture.montantHT ?? factureMontantHT(facture);
  const montantTTC = facture.montantTTC ?? facture.montant;
  const montantTVA = Math.round((montantTTC - montantHT) * 100) / 100;
  const siren = parametres.siren?.trim() || deriveSirenFromSiret(parametres.siret);

  const fe = resolveParametresFacturationElectronique(parametres);
  const transmission = normalizeTransmissionForExport(facture, fe.pdpProviderId);

  return {
    version: "1.0",
    format: "structure-pre-factur-x",
    genereLe: new Date().toISOString(),
    facture: {
      id: facture.id,
      numero: facture.numero,
      dateEmission: facture.dateEmission,
      dateEcheance: facture.dateEcheance,
      typeFacture: facture.typeFacture,
      conditionsPaiement: parametres.conditionsReglement,
      penalitesRetard: parametres.penalitesRetard,
      indemniteForfaitaire: isClientProfessionnel(client)
        ? parametres.indemniteForfaitaire
        : undefined,
    },
    vendeur: {
      raisonSociale: parametres.entreprise,
      formeJuridique: parametres.formeJuridique,
      siret: parametres.siret,
      siren,
      tvaIntracom: parametres.tvaIntracom,
      adresse: formatAdresseEntreprise(parametres),
      emailFacturation: getEmailFacturation(parametres),
      telephone: parametres.telephone,
    },
    acheteur: {
      nom: getClientDisplayName(client),
      typeClient: client?.typeClient,
      siret: client?.siret,
      siren: client?.siret ? deriveSirenFromSiret(client.siret) : undefined,
      tvaIntracom: client?.tvaIntracom,
      adresse: client?.adresse,
      email: client?.email,
    },
    lignes: (facture.lignes ?? []).map((ligne) => ({
      id: ligne.id,
      description: ligne.description,
      quantite: ligne.quantite,
      unite: ligne.unite,
      prixUnitaireHT: ligne.prixUnitaire,
      tauxTVA: ligne.tauxTVA ?? facture.tauxTVA,
      montantHT: ligne.quantite * ligne.prixUnitaire,
    })),
    totaux: {
      montantHT,
      montantTVA: montantTVA >= 0 ? montantTVA : 0,
      montantTTC,
      devise: "EUR",
    },
    mentionsLegales: {
      conditionsReglement: parametres.conditionsReglement,
      penalitesRetard: parametres.penalitesRetard,
      indemniteForfaitaire: parametres.indemniteForfaitaire,
      tribunalCompetent: parametres.tribunalCompetent,
    },
    transmission,
  };
}

function normalizeTransmissionForExport(
  facture: Facture,
  configuredProviderId?: string,
): FactureElectroniqueExport["transmission"] {
  const tx = facture.transmissionElectronique;
  const statut = tx?.statut ?? "non_transmis";

  return {
    statut,
    plateforme: tx?.pdpProviderId || configuredProviderId,
    identifiantFactureElectronique: tx?.identifiantFactureElectronique,
    pdpTransmissionId: tx?.pdpTransmissionId,
    dateTransmission: tx?.dateTransmission,
    dateAcceptation: tx?.dateAcceptation,
    dateRejet: tx?.dateRejet,
    motifRejet: tx?.motifRejet,
    note:
      statut === "non_transmis"
        ? "Export préparatoire — aucune transmission PDP tant que l'intégration officielle n'est pas activée."
        : `Statut PDP : ${getTransmissionStatutLabel(statut)}.`,
  };
}

export function downloadFactureElectroniqueJson(
  payload: FactureElectroniqueExport,
  filename: string,
) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
