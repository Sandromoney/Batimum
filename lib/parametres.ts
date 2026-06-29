import type { Avoir, Commande, Devis, Facture, Parametres } from "./types";
import { DEFAULT_CONNEXION_EMAIL } from "./email-provider/connexion-email";
import { normalizeThemePreference } from "./theme";

export const DEFAULT_PREFIXE_DEVIS = "DEV";
export const DEFAULT_PREFIXE_FACTURE = "FAC";
export const DEFAULT_PREFIXE_AVOIR = "AV";
export const DEFAULT_PREFIXE_COMMANDE = "COM";

export const DEFAULT_PARAMETRES: Parametres = {
  entreprise: "BTP Pro Services",
  siret: "123 456 789 00012",
  siren: "123456789",
  formeJuridique: "SARL",
  adresse: "12 rue des Artisans",
  ville: "Paris",
  codePostal: "75011",
  pays: "France",
  siteInternet: "",
  codeApe: "",
  capitalSocial: "",
  email: "contact@btppro.fr",
  emailFacturation: "facturation@btppro.fr",
  telephone: "01 23 45 67 89",
  tva: 20,
  tvaIntracom: "",
  modeTVA: "classique",
  conditionsReglement:
    "Paiement à 30 jours fin de mois par virement bancaire.",
  conditionsGenerales: "",
  acompte: "",
  penalitesRetard:
    "En cas de retard de paiement, des pénalités sont exigibles au taux légal.",
  indemniteForfaitaire:
    "Indemnité forfaitaire pour frais de recouvrement : 40 € (art. L441-10 C. com.).",
  tribunalCompetent: "Tribunal de commerce compétent du siège de l'entreprise.",
  utilisateur: "Jean Dupont",
  logoEntreprise: "",
  logoApplication: "",
  logoPdf: "",
  theme: "dark",
  objectifCaMensuel: 15000,
  assuranceDecennale: false,
  nomAssurance: "",
  numeroPoliceAssurance: "",
  prefixeDevis: DEFAULT_PREFIXE_DEVIS,
  prefixeFacture: DEFAULT_PREFIXE_FACTURE,
  prefixeAvoir: DEFAULT_PREFIXE_AVOIR,
  prefixeCommande: DEFAULT_PREFIXE_COMMANDE,
  anneeAutomatique: true,
  compteurDevis: 1,
  compteurFacture: 1,
  compteurAvoir: 1,
  compteurCommande: 1,
  signatureEmail: "",
  signaturePdf: "",
  plateformeDematerialisation: "",
  facturationElectronique: {
    pdpProviderId: "",
    pdpApiKey: "",
    pdpConnexionStatut: "non_configure",
    pdpEnvironnement: "test",
  },
  eFacturationPrete: false,
  relancesAutomatiques: true,
  relanceAvantEcheance3j: true,
  relanceJourEcheance: true,
  relanceJ7: true,
  relanceJ15: true,
  relanceJ30: true,
  connexionEmail: DEFAULT_CONNEXION_EMAIL,
  couleurDevis: "bleu_batimum",
};

export function normalizeParametres(
  partial?: Partial<Parametres> | null,
): Parametres {
  const p = partial ?? {};
  const legacyLogo = p.logoEntreprise?.trim() ?? "";
  const logoApplication = p.logoApplication?.trim() || legacyLogo;
  const logoPdf = p.logoPdf?.trim() || legacyLogo;

  return {
    ...DEFAULT_PARAMETRES,
    ...p,
    theme: normalizeThemePreference(p.theme),
    modeTVA:
      p.modeTVA === "non_applicable_293B" ? "non_applicable_293B" : "classique",
    logoApplication,
    logoPdf,
    logoEntreprise: logoPdf || logoApplication || legacyLogo,
    prefixeDevis: (p.prefixeDevis?.trim() || DEFAULT_PREFIXE_DEVIS).toUpperCase(),
    prefixeFacture: (p.prefixeFacture?.trim() || DEFAULT_PREFIXE_FACTURE).toUpperCase(),
    prefixeAvoir: (p.prefixeAvoir?.trim() || DEFAULT_PREFIXE_AVOIR).toUpperCase(),
    prefixeCommande: (p.prefixeCommande?.trim() || DEFAULT_PREFIXE_COMMANDE).toUpperCase(),
    anneeAutomatique: p.anneeAutomatique !== false,
    compteurDevis: Math.max(1, Number(p.compteurDevis) || 1),
    compteurFacture: Math.max(1, Number(p.compteurFacture) || 1),
    compteurAvoir: Math.max(1, Number(p.compteurAvoir) || 1),
    compteurCommande: Math.max(1, Number(p.compteurCommande) || 1),
    relanceJ7: p.relanceJ7 !== false,
    relanceJ15: p.relanceJ15 !== false,
    relanceJ30: p.relanceJ30 !== false,
    relanceAvantEcheance3j: p.relanceAvantEcheance3j !== false,
    relanceJourEcheance: p.relanceJourEcheance !== false,
    relancesAutomatiques: p.relancesAutomatiques !== false,
    eFacturationPrete: Boolean(p.eFacturationPrete),
    facturationElectronique: {
      ...DEFAULT_PARAMETRES.facturationElectronique,
      ...p.facturationElectronique,
      pdpProviderId:
        p.facturationElectronique?.pdpProviderId?.trim() ||
        p.plateformeDematerialisation?.trim() ||
        "",
      pdpEnvironnement:
        p.facturationElectronique?.pdpEnvironnement === "production"
          ? "production"
          : "test",
      pdpConnexionStatut:
        p.facturationElectronique?.pdpConnexionStatut ?? "non_configure",
    },
    plateformeDematerialisation:
      p.facturationElectronique?.pdpProviderId?.trim() ||
      p.plateformeDematerialisation?.trim() ||
      "",
    siren:
      p.siren?.trim() ||
      deriveSirenFromSiret(p.siret ?? DEFAULT_PARAMETRES.siret),
    assuranceDecennale: Boolean(p.assuranceDecennale),
    connexionEmail: {
      ...DEFAULT_CONNEXION_EMAIL,
      ...p.connexionEmail,
      statut: p.connexionEmail?.statut ?? "non_connecte",
      provider: p.connexionEmail?.provider ?? null,
    },
    couleurDevis:
      p.couleurDevis === "noir" ||
      p.couleurDevis === "or" ||
      p.couleurDevis === "vert" ||
      p.couleurDevis === "rouge_brique" ||
      p.couleurDevis === "gris_premium"
        ? p.couleurDevis
        : "bleu_batimum",
  };
}

export function deriveSirenFromSiret(siret: string): string {
  const digits = siret.replace(/\D/g, "");
  return digits.slice(0, 9);
}

export function getEmailFacturation(parametres: Parametres): string {
  return parametres.emailFacturation?.trim() || parametres.email.trim();
}

export function getLogoApplication(parametres: Parametres): string | undefined {
  const logo = parametres.logoApplication?.trim() || parametres.logoEntreprise?.trim();
  return logo || undefined;
}

export function getLogoPdf(parametres: Parametres): string | undefined {
  const logo = parametres.logoPdf?.trim() || parametres.logoEntreprise?.trim();
  return logo || undefined;
}

export function isTvaClassique(parametres: Parametres): boolean {
  return parametres.modeTVA !== "non_applicable_293B";
}

export function getEffectiveTauxTVA(
  parametres: Parametres,
  documentTaux?: number,
): number {
  if (!isTvaClassique(parametres)) return 0;
  if (typeof documentTaux === "number") return documentTaux;
  return parametres.tva ?? 0;
}

export function getMentionTvaPdf(
  parametres: Parametres,
  tauxTVA: number,
  montantTVA: number,
  formatCurrency: (amount: number) => string,
): string {
  if (!isTvaClassique(parametres)) {
    return "TVA non applicable, article 293 B du CGI.";
  }
  if (tauxTVA > 0) {
    return `TVA au taux de ${tauxTVA} % — montant de TVA : ${formatCurrency(montantTVA)}.`;
  }
  return "TVA non applicable, article 293 B du CGI.";
}

export function formatAdresseEntreprise(parametres: Parametres): string {
  const parts = [
    parametres.adresse?.trim(),
    [parametres.codePostal, parametres.ville].filter(Boolean).join(" ").trim(),
    parametres.pays?.trim(),
  ].filter(Boolean);
  return parts.join(", ");
}

function buildNumeroPrefix(
  basePrefix: string,
  anneeAutomatique: boolean,
): string {
  const base = (basePrefix.trim() || DEFAULT_PREFIXE_DEVIS).toUpperCase();
  if (anneeAutomatique) {
    return `${base}-${new Date().getFullYear()}-`;
  }
  return `${base}-`;
}

function extractSequence(numero: string, fullPrefix: string): number | null {
  if (!numero.startsWith(fullPrefix)) return null;
  const suffix = numero.slice(fullPrefix.length);
  const parsed = parseInt(suffix, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function maxSequenceFromDocuments(
  numeros: string[],
  fullPrefix: string,
): number {
  const sequences = numeros
    .map((numero) => extractSequence(numero, fullPrefix))
    .filter((value): value is number => value !== null);
  return sequences.length > 0 ? Math.max(...sequences) : 0;
}

export function formatNumeroExample(
  prefixe: string,
  anneeAutomatique: boolean,
  compteur: number,
): string {
  const base = (prefixe.trim() || DEFAULT_PREFIXE_DEVIS).toUpperCase();
  const seq = String(Math.max(1, compteur)).padStart(3, "0");
  if (anneeAutomatique) {
    return `${base}-${new Date().getFullYear()}-${seq}`;
  }
  return `${base}-${seq}`;
}

export function generateNextNumeroDevis(
  devis: Devis[],
  parametres?: Parametres,
): string {
  const p = normalizeParametres(parametres);
  const prefix = buildNumeroPrefix(p.prefixeDevis ?? DEFAULT_PREFIXE_DEVIS, p.anneeAutomatique !== false);
  const fromDocs = maxSequenceFromDocuments(
    devis.map((item) => item.numero),
    prefix,
  );
  const next = Math.max(p.compteurDevis ?? 1, fromDocs + 1);
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function generateNextNumeroFacture(
  factures: Facture[],
  parametres?: Parametres,
): string {
  const p = normalizeParametres(parametres);
  const prefix = buildNumeroPrefix(
    p.prefixeFacture ?? DEFAULT_PREFIXE_FACTURE,
    p.anneeAutomatique !== false,
  );
  const fromDocs = maxSequenceFromDocuments(
    factures.map((item) => item.numero),
    prefix,
  );
  const next = Math.max(p.compteurFacture ?? 1, fromDocs + 1);
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function generateNextNumeroAvoir(
  avoirs: Avoir[],
  parametres?: Parametres,
): string {
  const p = normalizeParametres(parametres);
  const prefix = buildNumeroPrefix(
    p.prefixeAvoir ?? DEFAULT_PREFIXE_AVOIR,
    p.anneeAutomatique !== false,
  );
  const fromDocs = maxSequenceFromDocuments(
    avoirs.map((item) => item.numero),
    prefix,
  );
  const next = Math.max(p.compteurAvoir ?? 1, fromDocs + 1);
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function generateNextNumeroCommande(
  commandes: Commande[],
  parametres?: Parametres,
): string {
  const p = normalizeParametres(parametres);
  const prefix = buildNumeroPrefix(
    p.prefixeCommande ?? DEFAULT_PREFIXE_COMMANDE,
    p.anneeAutomatique !== false,
  );
  const fromDocs = maxSequenceFromDocuments(
    commandes.map((item) => item.numero),
    prefix,
  );
  const next = Math.max(p.compteurCommande ?? 1, fromDocs + 1);
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function syncParametresForSave(form: Parametres): Parametres {
  const normalized = normalizeParametres(form);
  return {
    ...normalized,
    logoEntreprise: normalized.logoPdf || normalized.logoApplication || "",
  };
}
