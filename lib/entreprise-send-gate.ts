import { deriveSirenFromSiret, getLogoPdf, isTvaClassique } from "@/lib/parametres";
import type { Devis, Facture, Parametres, RelanceClient } from "@/lib/types";
import { validateEmail } from "@/lib/validations";

export type EntrepriseSendField = {
  id: string;
  label: string;
  ok: boolean;
};

function hasValidSiret(siret?: string): boolean {
  return (siret ?? "").replace(/\D/g, "").length === 14;
}

function hasValidIban(iban?: string): boolean {
  const normalized = (iban ?? "").replace(/\s/g, "").toUpperCase();
  return normalized.length >= 15 && /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(normalized);
}

function hasValidTva(parametres: Parametres): boolean {
  if (!isTvaClassique(parametres)) return true;
  const tvaIntracom = parametres.tvaIntracom?.replace(/\s/g, "").toUpperCase() ?? "";
  if (!tvaIntracom) return false;
  const siren = (
    parametres.siren?.trim() || deriveSirenFromSiret(parametres.siret)
  ).replace(/\D/g, "");
  return (
    /^FR[A-Z0-9]{2}\d{9}$/.test(tvaIntracom) ||
    (siren.length === 9 && tvaIntracom.includes(siren))
  );
}

function hasValidAssuranceDecennale(parametres: Parametres): boolean {
  return (
    Boolean(parametres.assuranceDecennale) &&
    Boolean(parametres.nomAssurance?.trim()) &&
    Boolean(parametres.numeroPoliceAssurance?.trim())
  );
}

function hasValidAdresse(parametres: Parametres): boolean {
  return (
    Boolean(parametres.adresse?.trim()) &&
    Boolean(parametres.codePostal?.trim()) &&
    Boolean(parametres.ville?.trim())
  );
}

function hasValidTelephone(telephone?: string): boolean {
  return (telephone ?? "").replace(/\D/g, "").length >= 8;
}

/** Contrôle les informations entreprise requises avant envoi client. */
export function validateEntrepriseSendReadiness(
  parametres: Parametres,
): EntrepriseSendField[] {
  return [
    {
      id: "entreprise",
      label: "Entreprise",
      ok: Boolean(parametres.entreprise?.trim()),
    },
    {
      id: "logo",
      label: "Logo",
      ok: Boolean(getLogoPdf(parametres)),
    },
    {
      id: "adresse",
      label: "Adresse",
      ok: hasValidAdresse(parametres),
    },
    {
      id: "telephone",
      label: "Téléphone",
      ok: hasValidTelephone(parametres.telephone),
    },
    {
      id: "email",
      label: "Email",
      ok: validateEmail(parametres.email),
    },
    {
      id: "siret",
      label: "SIRET",
      ok: hasValidSiret(parametres.siret),
    },
    {
      id: "tva",
      label: "TVA",
      ok: hasValidTva(parametres),
    },
    {
      id: "iban",
      label: "IBAN",
      ok: hasValidIban(parametres.coordonneesBancairesIban),
    },
    {
      id: "assurance-decennale",
      label: "Assurance décennale",
      ok: hasValidAssuranceDecennale(parametres),
    },
  ];
}

export function getEntrepriseSendMissingFields(
  parametres: Parametres,
): EntrepriseSendField[] {
  return validateEntrepriseSendReadiness(parametres).filter((field) => !field.ok);
}

export function canSendClientDocument(parametres: Parametres): boolean {
  return getEntrepriseSendMissingFields(parametres).length === 0;
}

export function formatEntrepriseSendGateMessage(
  missing: EntrepriseSendField[],
): string {
  const labels = missing.map((field) => field.label).join(", ");
  return `Informations manquantes ou incomplètes : ${labels}. Complétez les paramètres de l'entreprise avant l'envoi.`;
}

export function hasDevisBeenSentToClient(devis: Devis[]): boolean {
  return devis.some(
    (item) =>
      item.statut === "envoye" ||
      item.statut === "signe" ||
      item.statut === "accepte" ||
      item.historique?.some(
        (entry) => entry.type === "envoye" || entry.type === "signe",
      ),
  );
}

export function hasFactureBeenSentToClient(
  factures: Facture[],
  relances: RelanceClient[] = [],
): boolean {
  return (
    factures.some(
      (item) =>
        item.statut === "envoyee" ||
        item.statut === "payee" ||
        item.historique?.some(
          (entry) => entry.type === "envoyee" || entry.type === "relance",
        ),
    ) ||
    relances.some(
      (relance) =>
        relance.documentType === "facture" &&
        (relance.statut === "envoyee" || relance.statut === "envoyee_simulee"),
    )
  );
}

export type EntrepriseSendGateContext = "devis" | "facture";

export function getEntrepriseSendGateTitle(
  context: EntrepriseSendGateContext,
  isFirstSend: boolean,
): string {
  if (!isFirstSend) return "Informations entreprise incomplètes";
  return context === "devis"
    ? "Complétez votre entreprise avant le premier envoi de devis"
    : "Complétez votre entreprise avant le premier envoi de facture";
}
