import {
  hasDevisChantierAddress,
  isClientAddressComplete,
} from "@/lib/clients";
import type {
  Chantier,
  Client,
  Devis,
  Employe,
  EvenementPlanning,
  Facture,
  LigneDevis,
  Parametres,
} from "@/lib/types";
import { getLigneDesignation, isEmptyLigneDevis, isSectionLigne } from "@/lib/devis-lignes";
import {
  buildProgressiveBillingContext,
  getMontantFactureTTC,
  normalizeTypeFacture,
  resolveTotalProjetTTC,
  validateFactureMontantAgainstDevis,
  validateSituationPourcentageAvancement,
} from "@/lib/factures-progressive";

export type ValidationErrors = Record<string, string>;

const REQUIRED = "Ce champ est obligatoire";

export const CLIENT_ADDRESS_REQUIRED_MSG =
  "L'adresse du client est obligatoire.";
export const CHANTIER_ADDRESS_REQUIRED_MSG =
  "Veuillez renseigner l'adresse du chantier.";
export const DEVIS_CLIENT_ADDRESS_REQUIRED_MSG =
  "Veuillez renseigner l'adresse du client avant de créer un devis.";

function isEmpty(value?: string | null) {
  return !value || value.trim().length === 0;
}

function isBefore(dateA?: string, dateB?: string) {
  if (!dateA || !dateB) return false;
  return dateA < dateB;
}

export function validateEmail(email?: string) {
  if (isEmpty(email)) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function validatePhone(phone?: string, indicatif = "+33") {
  if (isEmpty(phone)) return false;
  const rawPhone = String(phone).trim();
  if (!/^[\d\s+]+$/.test(rawPhone)) return false;

  const digits = rawPhone.replace(/\s/g, "");
  if (indicatif === "+33") {
    const frenchNumber = digits.startsWith("+33")
      ? digits.slice(3)
      : digits.startsWith("0")
        ? digits.slice(1)
        : digits;

    return /^[1-9]\d{8}$/.test(frenchNumber);
  }

  return digits.replace(/^\+/, "").length >= 6;
}

export function validateDateConsistency({
  start,
  end,
  startLabel = "date de début",
  endLabel = "date de fin",
}: {
  start?: string;
  end?: string;
  startLabel?: string;
  endLabel?: string;
}) {
  if (!start || !end || !isBefore(end, start)) return "";
  return `La ${endLabel} ne peut pas être avant la ${startLabel}`;
}

export function validateClient(client: Partial<Client>) {
  const errors: ValidationErrors = {};

  if (isEmpty(client.nom)) errors.nom = REQUIRED;
  if (isEmpty(client.prenom)) errors.prenom = REQUIRED;
  if (!validatePhone(client.telephone, client.indicatifTelephone)) {
    errors.telephone = client.telephone ? "Numéro de téléphone invalide" : REQUIRED;
  }
  if (!isEmpty(client.email) && !validateEmail(client.email)) {
    errors.email = "Email invalide";
  }
  if (isEmpty(client.adresse)) errors.adresse = CLIENT_ADDRESS_REQUIRED_MSG;
  if (isEmpty(client.codePostal)) errors.codePostal = CLIENT_ADDRESS_REQUIRED_MSG;
  if (isEmpty(client.ville)) errors.ville = CLIENT_ADDRESS_REQUIRED_MSG;

  return errors;
}

export function validateDevisCreation(input: {
  clientId?: string;
  dateDevis?: string;
  client?: Pick<Client, "adresse" | "codePostal" | "ville"> | null;
}) {
  const errors: ValidationErrors = {};

  if (isEmpty(input.clientId)) errors.clientId = REQUIRED;
  if (isEmpty(input.dateDevis)) errors.dateDevis = REQUIRED;
  if (!isEmpty(input.clientId) && !isClientAddressComplete(input.client)) {
    errors.clientAddress = DEVIS_CLIENT_ADDRESS_REQUIRED_MSG;
  }

  return errors;
}

export function validateDevis(
  devis: Partial<Devis>,
  client?: Pick<Client, "adresse" | "codePostal" | "ville"> | null,
) {
  const errors: ValidationErrors = {};
  const dateDevis = devis.dateDevis ?? devis.date;

  if (isEmpty(devis.clientId)) errors.clientId = REQUIRED;
  if (isEmpty(dateDevis)) errors.dateDevis = REQUIRED;
  if (!hasDevisChantierAddress(devis, client)) {
    errors.adresseChantier = isClientAddressComplete(client)
      ? CHANTIER_ADDRESS_REQUIRED_MSG
      : DEVIS_CLIENT_ADDRESS_REQUIRED_MSG;
  }
  const lignesActives =
    devis.lignes?.filter((ligne) => !isEmptyLigneDevis(ligne)) ?? [];

  if (lignesActives.filter((ligne) => !isSectionLigne(ligne)).length === 0) {
    errors.lignes = "Au moins une ligne de devis est obligatoire";
  }

  devis.lignes?.forEach((ligne, index) => {
    if (isEmptyLigneDevis(ligne)) return;

    if (isSectionLigne(ligne)) {
      if (isEmpty(getLigneDesignation(ligne))) {
        errors[`lignes.${index}.description`] = REQUIRED;
      }
      return;
    }

    if (isEmpty(getLigneDesignation(ligne))) {
      errors[`lignes.${index}.description`] = REQUIRED;
    }
    if (!(Number(ligne.quantite) > 0)) {
      errors[`lignes.${index}.quantite`] = "La quantité doit être supérieure à 0";
    }
    if (!(Number(ligne.prixUnitaire) >= 0)) {
      errors[`lignes.${index}.prixUnitaire`] =
        "Le prix unitaire doit être supérieur ou égal à 0";
    }
    if (isEmpty(ligne.unite)) errors[`lignes.${index}.unite`] = REQUIRED;
  });

  if (devis.dateSignature && dateDevis && isBefore(devis.dateSignature, dateDevis)) {
    errors.dateSignature = "La date de signature ne peut pas être avant la date du devis";
  }
  if (typeof devis.validiteJours === "number" && devis.validiteJours < 0) {
    errors.validiteJours = "La validité ne peut pas être négative";
  }
  if (isEmpty(devis.statut)) errors.statut = REQUIRED;

  return errors;
}

export function validateFacture(facture: Partial<Facture>) {
  const errors: ValidationErrors = {};
  const type = facture.typeFacture ?? "classique";
  const needsLink =
    type === "acompte" || type === "situation" || type === "solde";

  if (isEmpty(facture.clientId)) errors.clientId = REQUIRED;
  if (isEmpty(facture.numero)) errors.numero = REQUIRED;
  if (isEmpty(facture.dateEmission)) errors.dateEmission = REQUIRED;
  if (isEmpty(facture.dateEcheance)) errors.dateEcheance = REQUIRED;

  if (needsLink && !facture.devisLieId && !facture.devisSourceId && !facture.chantierLieId && !facture.chantierId) {
    errors.devisLieId = "Liez un devis ou un chantier pour cette facture";
  }

  if (type === "acompte") {
    if (!(Number(facture.acompteValeur) > 0)) {
      errors.acompteValeur = "Indiquez un montant ou un pourcentage d'acompte";
    }
  }

  if (type === "situation") {
    const mode = facture.situationMode ?? "pourcentage";
    if (mode === "pourcentage" && !(Number(facture.pourcentageAvancement) > 0)) {
      errors.pourcentageAvancement = "Indiquez un pourcentage d'avancement";
    }
    if (
      mode === "quantite" &&
      !(Number(facture.situationQuantitePourcentage) > 0)
    ) {
      errors.situationQuantitePourcentage =
        "Indiquez un pourcentage de quantités facturées";
    }
    if (mode === "montant" && !(Number(facture.situationMontantLibre) > 0)) {
      errors.situationMontantLibre = "Indiquez un montant de situation";
    }
  }

  if (!(Number(facture.montant) > 0)) {
    errors.montant =
      type === "situation"
        ? "Le montant de situation doit être supérieur à 0 (vérifiez le % d'avancement)"
        : "Le montant TTC doit être supérieur à 0";
  }
  if (isEmpty(facture.statut)) errors.statut = REQUIRED;
  if (isBefore(facture.dateEcheance, facture.dateEmission)) {
    errors.dateEcheance = "La date d'échéance ne peut pas être avant la date d'émission";
  }
  if (facture.datePaiement && isBefore(facture.datePaiement, facture.dateEmission)) {
    errors.datePaiement = "La date de paiement ne peut pas être avant la date d'émission";
  }
  if (facture.statut === "payee" && isEmpty(facture.datePaiement)) {
    errors.datePaiement = REQUIRED;
  }

  return errors;
}

export function validateFactureBillingPlafond(
  facture: Partial<Facture>,
  opts: {
    factures: Facture[];
    devis?: Devis;
    chantier?: Chantier;
    defaultTva: number;
  },
): ValidationErrors {
  const errors: ValidationErrors = {};
  const devisId = facture.devisLieId ?? facture.devisSourceId;
  const chantierId = facture.chantierLieId ?? facture.chantierId;
  const type = normalizeTypeFacture(facture.typeFacture);
  const isProgressive =
    type === "acompte" || type === "situation" || type === "solde";

  if (!devisId && !isProgressive) return errors;
  if (type === "classique" && !devisId) return errors;
  if (!devisId && !chantierId) return errors;

  const totalProjetTTC = resolveTotalProjetTTC(
    opts.devis,
    opts.chantier,
    opts.defaultTva,
  );
  if (!(totalProjetTTC > 0)) return errors;

  const ctx = buildProgressiveBillingContext(opts.factures, {
    devisId,
    chantierId,
    totalProjetTTC,
    excludeFactureId: facture.id,
  });

  const montant = getMontantFactureTTC({
    montant: Number(facture.montant ?? 0),
    montantTTC: facture.montantTTC,
  });

  if (type === "situation") {
    const mode = facture.situationMode ?? "pourcentage";
    if (mode === "pourcentage") {
      const pctError = validateSituationPourcentageAvancement(
        Number(facture.pourcentageAvancement ?? 0),
        ctx,
      );
      if (pctError) errors.pourcentageAvancement = pctError;
    }
    if (mode === "quantite") {
      const pctError = validateSituationPourcentageAvancement(
        Number(facture.situationQuantitePourcentage ?? 0),
        ctx,
      );
      if (pctError) errors.situationQuantitePourcentage = pctError;
    }
  }

  const montantError = validateFactureMontantAgainstDevis(montant, ctx);
  if (montantError) {
    errors.montant = montantError;
    if (type === "acompte") errors.acompteValeur = montantError;
    if (type === "situation" && facture.situationMode === "montant") {
      errors.situationMontantLibre = montantError;
    }
  }

  return errors;
}

export function validateChantier(chantier: Partial<Chantier>) {
  const errors: ValidationErrors = {};

  if (isEmpty(chantier.nom)) errors.nom = REQUIRED;
  if (isEmpty(chantier.clientId)) errors.clientId = REQUIRED;
  if (isEmpty(chantier.adresse)) {
    errors.adresse = CHANTIER_ADDRESS_REQUIRED_MSG;
  }
  if (isEmpty(chantier.type)) errors.type = REQUIRED;
  if (chantier.type === "autre" && isEmpty(chantier.typePersonnalise)) {
    errors.typePersonnalise = REQUIRED;
  }
  if (isEmpty(chantier.dateDebut)) errors.dateDebut = REQUIRED;
  if (isBefore(chantier.dateFin, chantier.dateDebut)) {
    errors.dateFin = "La date de fin ne peut pas être avant la date de début";
  }
  if (!(Number(chantier.budget) > 0)) {
    errors.budget =
      "Veuillez renseigner un budget chantier supérieur à 0.";
  }

  return errors;
}

export function validateEmploye(employe: Partial<Employe>) {
  const errors: ValidationErrors = {};

  if (isEmpty(employe.prenom)) errors.prenom = REQUIRED;
  if (isEmpty(employe.nom)) errors.nom = REQUIRED;

  return errors;
}

export function validatePlanningEvent(event: Partial<EvenementPlanning>) {
  const errors: ValidationErrors = {};

  const tache = (event.tache ?? event.titre ?? "").trim();
  if (!tache && !event.chantierId?.trim()) {
    errors.tache = REQUIRED;
  }
  if (
    event.type === "autre" &&
    !(event.typePersonnalise ?? "").trim()
  ) {
    errors.typePersonnalise = REQUIRED;
  }
  if (isEmpty(event.date)) errors.date = REQUIRED;
  if (isEmpty(event.heureDebut)) errors.heureDebut = REQUIRED;
  if (isEmpty(event.heureFin)) errors.heureFin = REQUIRED;
  if (event.heureDebut && event.heureFin && event.heureFin <= event.heureDebut) {
    errors.heureFin = "L'heure de fin doit être après l'heure de début";
  }

  return errors;
}

export function hasValidationErrors(errors: ValidationErrors) {
  return Object.keys(errors).length > 0;
}

export function validateParametresSave(form: Parametres): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!form.utilisateur?.trim()) errors.utilisateur = REQUIRED;
  if (!form.entreprise?.trim()) errors.entreprise = REQUIRED;
  if (!form.adresse?.trim()) errors.adresse = REQUIRED;
  if (!form.codePostal?.trim()) errors.codePostal = REQUIRED;
  if (!form.ville?.trim()) errors.ville = REQUIRED;

  if (!form.email?.trim()) {
    errors.email = REQUIRED;
  } else if (!validateEmail(form.email)) {
    errors.email = "Adresse email invalide";
  }

  return errors;
}

