import type { Client, Devis, Facture, Parametres } from "@/lib/types";
import { getClientDisplayName } from "@/lib/clients";
import { computeDevisTvaRecap } from "@/lib/devis-tva";
import { isTvaClassique } from "@/lib/parametres";
import { formatCurrency } from "@/lib/utils";

export type DevisRelanceNiveau = "j7" | "j14" | "j21" | "personnalise" | "manuelle";

export type DevisRelanceRegle = {
  id: string;
  label: string;
  actif: boolean;
  joursApresEnvoi: number;
  sujet: string;
  message: string;
};

export type DevisRelanceVariables = {
  nom_client: string;
  numero_devis: string;
  montant_devis: string;
  nom_entreprise: string;
  lien_devis: string;
  date_devis: string;
};

export const DEVIS_RELANCE_VARIABLES_HELP =
  "{nom_client}, {numero_devis}, {montant_devis}, {nom_entreprise}, {lien_devis}, {date_devis}";

export const DEFAULT_DEVIS_RELANCE_REGLES: DevisRelanceRegle[] = [
  {
    id: "j7",
    label: "Relance J+7",
    actif: true,
    joursApresEnvoi: 7,
    sujet: "Relance concernant votre devis {numero_devis}",
    message: `Bonjour {nom_client},

Je me permets de revenir vers vous concernant le devis {numero_devis} que nous vous avons transmis.

N'hésitez pas à revenir vers nous si vous avez la moindre question ou si vous souhaitez avancer sur le projet.

Bien cordialement,
{nom_entreprise}`,
  },
  {
    id: "j14",
    label: "Relance J+14",
    actif: true,
    joursApresEnvoi: 14,
    sujet: "Suite à notre devis {numero_devis}",
    message: `Bonjour {nom_client},

Nous revenons vers vous concernant le devis {numero_devis} resté sans retour à ce jour.

Nous restons disponibles si vous souhaitez échanger, modifier certains éléments ou valider le devis.

Bien cordialement,
{nom_entreprise}`,
  },
  {
    id: "j21",
    label: "Relance J+21",
    actif: true,
    joursApresEnvoi: 21,
    sujet: "Dernière relance concernant votre devis {numero_devis}",
    message: `Bonjour {nom_client},

Nous revenons une dernière fois vers vous concernant le devis {numero_devis}.

Sans retour de votre part, nous considérerons que le projet est pour le moment mis en attente.

Nous restons bien sûr disponibles si besoin.

Bien cordialement,
{nom_entreprise}`,
  },
];

export const DEVIS_RELANCE_NIVEAU_LABELS: Record<DevisRelanceNiveau, string> = {
  j7: "Relance J+7",
  j14: "Relance J+14",
  j21: "Relance J+21",
  personnalise: "Relance personnalisée",
  manuelle: "Relance manuelle",
};

export function normalizeDevisRelanceRegles(
  regles?: DevisRelanceRegle[] | null,
): DevisRelanceRegle[] {
  if (!regles?.length) return DEFAULT_DEVIS_RELANCE_REGLES;

  const defaultsById = new Map(
    DEFAULT_DEVIS_RELANCE_REGLES.map((regle) => [regle.id, regle]),
  );

  return regles.map((regle) => {
    const fallback = defaultsById.get(regle.id);
    return {
      id: regle.id || fallback?.id || "personnalise",
      label: regle.label?.trim() || fallback?.label || "Relance personnalisée",
      actif: regle.actif !== false,
      joursApresEnvoi: Math.max(
        1,
        Number(regle.joursApresEnvoi) || fallback?.joursApresEnvoi || 7,
      ),
      sujet: regle.sujet?.trim() || fallback?.sujet || "",
      message: regle.message?.trim() || fallback?.message || "",
    };
  });
}

export function getDevisRelanceRegles(parametres: Parametres): DevisRelanceRegle[] {
  return normalizeDevisRelanceRegles(parametres.relancesDevis);
}

export function getActiveDevisRelanceRegles(
  parametres: Parametres,
): DevisRelanceRegle[] {
  if (!parametres.relancesDevisAutomatiques) return [];
  return getDevisRelanceRegles(parametres)
    .filter((regle) => regle.actif)
    .sort((a, b) => a.joursApresEnvoi - b.joursApresEnvoi);
}

export function resolveDevisRelanceNiveau(
  regleId: string,
): DevisRelanceNiveau {
  if (regleId === "j7" || regleId === "j14" || regleId === "j21") {
    return regleId;
  }
  if (regleId === "manuelle") return "manuelle";
  return "personnalise";
}

export function buildDevisRelanceVariables({
  devis,
  client,
  parametres,
  signatureUrl = "",
}: {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  signatureUrl?: string;
}): DevisRelanceVariables {
  const recap = computeDevisTvaRecap(
    devis,
    parametres.tva,
    isTvaClassique(parametres),
  );
  const montant =
    typeof devis.montantTTC === "number" && devis.montantTTC > 0
      ? devis.montantTTC
      : recap.totalTTC;

  const dateSource = devis.sentAt || devis.date || devis.dateCreation;
  const dateDevis = dateSource
    ? new Date(dateSource).toLocaleDateString("fr-FR")
    : "—";

  return {
    nom_client: getClientDisplayName(client),
    numero_devis: devis.numero,
    montant_devis: formatCurrency(montant),
    nom_entreprise: parametres.entreprise?.trim() || "Votre entreprise",
    lien_devis: signatureUrl || "—",
    date_devis: dateDevis,
  };
}

export function applyDevisRelanceTemplate(
  template: string,
  variables: DevisRelanceVariables,
): string {
  return template.replace(/\{([a-z_]+)\}/g, (match, key: string) => {
    const value = variables[key as keyof DevisRelanceVariables];
    return value ?? match;
  });
}

export function findDevisRelanceRegle(
  parametres: Parametres,
  regleId: string,
): DevisRelanceRegle | undefined {
  return getDevisRelanceRegles(parametres).find((regle) => regle.id === regleId);
}

export function isDevisEligibleForRelances(
  devis: Devis,
  factures: Facture[],
): boolean {
  if (devis.relancesDesactivees) return false;
  if (!devis.sentAt) return false;
  if (["signe", "refuse", "archive", "expire", "brouillon"].includes(devis.statut)) {
    return false;
  }
  if (factures.some((facture) => facture.devisSourceId === devis.id)) {
    return false;
  }
  return ["envoye", "en_attente", "en_retard", "accepte"].includes(devis.statut);
}
