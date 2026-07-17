import type { DevisColorDraft } from "@/components/parametres-devis-color-picker";
import type { Employe, Parametres } from "@/lib/types";

export type ParametresSectionId =
  | "compte"
  | "connexion-email"
  | "entreprise"
  | "employes"
  | "documents"
  | "numerotation"
  | "facturation"
  | "coordonnees-bancaires"
  | "facturation-electronique"
  | "conditions-generales"
  | "signatures"
  | "relances-devis"
  | "relances-clients"
  | "mum-ia";

export type ParametresSectionMeta = {
  id: ParametresSectionId;
  label: string;
  description?: string;
};

export const PARAMETRES_SECTIONS: ParametresSectionMeta[] = [
  { id: "compte", label: "Compte" },
  { id: "connexion-email", label: "Connexion email" },
  { id: "entreprise", label: "Entreprise" },
  { id: "employes", label: "Employés" },
  { id: "documents", label: "Documents & PDF" },
  { id: "numerotation", label: "Numérotation" },
  { id: "facturation", label: "Facturation" },
  { id: "coordonnees-bancaires", label: "Coordonnées bancaires" },
  {
    id: "facturation-electronique",
    label: "Facturation électronique",
  },
  { id: "conditions-generales", label: "Conditions générales" },
  { id: "signatures", label: "Signatures" },
  { id: "relances-devis", label: "Relances devis" },
  { id: "relances-clients", label: "Relances factures" },
  { id: "mum-ia", label: "Assistant Batimum" },
];

const SECTION_FIELD_KEYS: Partial<
  Record<ParametresSectionId, (keyof Parametres)[]>
> = {
  compte: ["utilisateur"],
  entreprise: [
    "entreprise",
    "siteInternet",
    "siret",
    "siren",
    "formeJuridique",
    "codeApe",
    "tvaIntracom",
    "capitalSocial",
    "adresse",
    "codePostal",
    "ville",
    "departement",
    "region",
    "pays",
    "email",
    "emailFacturation",
    "telephone",
    "assuranceDecennale",
    "nomAssurance",
    "numeroPoliceAssurance",
  ],
  documents: [
    "logoApplication",
    "logoPdf",
    "couleurDevis",
    "couleurDevisCustom",
  ],
  numerotation: [
    "anneeAutomatique",
    "prefixeDevis",
    "compteurDevis",
    "prefixeFacture",
    "compteurFacture",
  ],
  facturation: [
    "modeTVA",
    "tva",
    "conditionsReglement",
    "acompte",
    "penalitesRetard",
    "indemniteForfaitaire",
    "tribunalCompetent",
  ],
  "coordonnees-bancaires": [
    "coordonneesBancairesTitulaire",
    "coordonneesBancairesBanque",
    "coordonneesBancairesIban",
    "coordonneesBancairesBic",
    "afficherCoordonneesBancaires",
  ],
  "facturation-electronique": [
    "facturationElectronique",
    "eFacturationPrete",
    "plateformeDematerialisation",
  ],
  "conditions-generales": ["conditionsGenerales"],
  signatures: ["signatureEmail", "signaturePdf"],
  "relances-devis": ["relancesDevisAutomatiques", "relancesDevis"],
  "relances-clients": [
    "relancesAutomatiques",
    "relanceAvantEcheance3j",
    "relanceJourEcheance",
    "relanceJ7",
    "relanceJ15",
    "relanceJ30",
  ],
  "connexion-email": ["connexionEmail"],
};

export type ParametresBaseline = {
  parametres: Parametres;
  colorDraft: DevisColorDraft;
  employes: Employe[];
};

function pickParametresFields(
  source: Parametres,
  keys: (keyof Parametres)[],
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    picked[key as string] = source[key];
  }
  return picked;
}

function stableEmployesSignature(employes: Employe[]): string {
  return JSON.stringify(
    [...employes]
      .map((employe) => ({
        id: employe.id,
        prenom: employe.prenom,
        nom: employe.nom,
        email: employe.email,
        telephone: employe.telephone,
        statut: employe.statut,
        poste: employe.poste,
        photo: employe.photo,
        identifiant: employe.identifiant,
        couleurPlanning: employe.couleurPlanning,
        coutHoraireInterne: employe.coutHoraireInterne,
        specialitePrincipale: employe.specialitePrincipale,
        typesChantiersMaitrises: employe.typesChantiersMaitrises,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}

function isDocumentsSectionDirty(
  form: Parametres,
  colorDraft: DevisColorDraft,
  baseline: Parametres,
  baselineColorDraft: DevisColorDraft,
): boolean {
  const keys = SECTION_FIELD_KEYS.documents ?? [];
  const current = {
    ...pickParametresFields(form, keys),
    colorDraft,
  };
  const saved = {
    ...pickParametresFields(baseline, keys),
    colorDraft: baselineColorDraft,
  };
  return JSON.stringify(current) !== JSON.stringify(saved);
}

export function isParametresSectionDirty(
  sectionId: ParametresSectionId,
  {
    form,
    colorDraft,
    baseline,
    employes,
    baselineEmployes,
  }: {
    form: Parametres;
    colorDraft: DevisColorDraft;
    baseline: ParametresBaseline;
    employes: Employe[];
    baselineEmployes: Employe[];
  },
): boolean {
  if (sectionId === "mum-ia") {
    return false;
  }

  if (sectionId === "employes") {
    const employesDirty =
      stableEmployesSignature(employes) !== stableEmployesSignature(baselineEmployes);
    const tauxDirty =
      form.tauxHoraireInterneDefaut !== baseline.parametres.tauxHoraireInterneDefaut;
    return employesDirty || tauxDirty;
  }

  if (sectionId === "documents") {
    return isDocumentsSectionDirty(
      form,
      colorDraft,
      baseline.parametres,
      baseline.colorDraft,
    );
  }

  const keys = SECTION_FIELD_KEYS[sectionId];
  if (!keys || keys.length === 0) return false;

  const current = pickParametresFields(form, keys);
  const saved = pickParametresFields(baseline.parametres, keys);
  return JSON.stringify(current) !== JSON.stringify(saved);
}

export function getDirtyParametresSections(input: {
  form: Parametres;
  colorDraft: DevisColorDraft;
  baseline: ParametresBaseline;
  employes: Employe[];
}): Set<ParametresSectionId> {
  const dirty = new Set<ParametresSectionId>();
  for (const section of PARAMETRES_SECTIONS) {
    if (
      isParametresSectionDirty(section.id, {
        ...input,
        baselineEmployes: input.baseline.employes,
      })
    ) {
      dirty.add(section.id);
    }
  }
  return dirty;
}

export function revertParametresSection(
  sectionId: ParametresSectionId,
  current: Parametres,
  baseline: ParametresBaseline,
): Parametres {
  const keys = SECTION_FIELD_KEYS[sectionId];
  if (!keys || keys.length === 0) return current;

  const next = { ...current };
  for (const key of keys) {
    (next as Record<string, unknown>)[key as string] = baseline.parametres[key];
  }
  return next;
}

export function isValidParametresSectionId(
  value: string | null | undefined,
): value is ParametresSectionId {
  if (!value) return false;
  return PARAMETRES_SECTIONS.some((section) => section.id === value);
}
