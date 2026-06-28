import {
  formatRegionalCoefficientLabel,
  getRegionalCoefficient,
  type RegionalCoefficientInput,
} from "@/lib/batimum-coefficients-regionaux";
import {
  FIABILITE_BATIMUM_REGIONAL,
  FIABILITE_BATIMUM_STANDARD,
} from "@/lib/prix-fiabilite";
import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";
import { mergePriceLibraryIntoCatalogue } from "@/lib/batimum-price-library";

export type BtpNiveauPrix = "economique" | "standard" | "premium";

export const BATIMUM_STANDARD_VERSION = "V1";

function getNiveauPrixMultiplier(niveau: BtpNiveauPrix): number {
  switch (niveau) {
    case "economique":
      return 0.92;
    case "premium":
      return 1.18;
    default:
      return 1;
  }
}

export type BatimumPrixType = "fourniture" | "pose" | "fourniture_et_pose";

export interface BatimumPrixCatalogueEntry {
  id: string;
  categorie: string;
  designation: string;
  motsCles: string[];
  unite: string;
  prixMinHT: number;
  prixMoyenHT: number;
  prixMaxHT: number;
  tvaHabituelle: number;
  type: BatimumPrixType;
  fiabilite: number;
  notes?: string;
}

/** Catégories Batimum Standard V1 */
export const BATIMUM_CATEGORIES = [
  "Placo",
  "Isolation",
  "Carrelage / Faïence",
  "Sols",
  "Peinture",
  "Plomberie",
  "Électricité",
  "Dépose",
  "Évacuation / Nettoyage",
] as const;

const F = FIABILITE_BATIMUM_STANDARD;
const V1_NOTE = "Batimum Standard V1 — base nationale";

function v1(
  id: string,
  categorie: string,
  designation: string,
  motsCles: string[],
  unite: string,
  prixHT: number,
  type: BatimumPrixType,
  tvaHabituelle = 10,
): BatimumPrixCatalogueEntry {
  return {
    id,
    categorie,
    designation,
    motsCles,
    unite,
    prixMinHT: prixHT,
    prixMoyenHT: prixHT,
    prixMaxHT: prixHT,
    tvaHabituelle,
    type,
    fiabilite: F,
    notes: V1_NOTE,
  };
}

const BASE_BATIMUM_PRIX_CATALOGUE: BatimumPrixCatalogueEntry[] = [
  // ——— PLACO ———
  v1("v1-placo-ba13", "Placo", "Plaque BA13 standard", ["plaque ba13", "ba13", "placo plaque"], "m²", 12, "fourniture"),
  v1("v1-placo-doublage-100", "Placo", "Doublage Optima 100 mm fourni/posé", ["doublage optima 100", "doublage 100 mm", "optima 100"], "m²", 62, "fourniture_et_pose"),
  v1("v1-placo-doublage-120", "Placo", "Doublage Optima 120 mm fourni/posé", ["doublage optima 120", "doublage 120 mm", "optima 120"], "m²", 65, "fourniture_et_pose"),
  v1("v1-placo-cloison-72", "Placo", "Cloison Placostil 72/48 fourni/posé", ["cloison placostil 72", "placostil 72 48", "cloison 72"], "m²", 60, "fourniture_et_pose"),
  v1("v1-placo-cloison-98", "Placo", "Cloison Placostil 98/48 fourni/posé", ["cloison placostil 98", "placostil 98 48", "cloison 98"], "m²", 68, "fourniture_et_pose"),
  v1("v1-placo-faux-plafond-ba13", "Placo", "Faux plafond BA13 fourni/posé", ["faux plafond ba13", "plafond placo", "faux plafond placo"], "m²", 55, "fourniture_et_pose"),
  v1("v1-placo-faux-plafond-hydro", "Placo", "Faux plafond hydro fourni/posé", ["faux plafond hydro", "plafond hydrofuge", "placo hydro"], "m²", 60, "fourniture_et_pose"),
  v1("v1-placo-habillage-wc", "Placo", "Habillage WC suspendu", ["habillage wc suspendu", "coffrage wc", "habillage bati support"], "forfait", 250, "fourniture_et_pose"),
  v1("v1-placo-coffrage", "Placo", "Coffrage placo simple", ["coffrage placo", "habillage placo", "encoffrement placo"], "ml", 45, "fourniture_et_pose"),
  v1("v1-placo-bande-joint", "Placo", "Bande + joint + finition", ["bande joint", "joint placo", "finition placo"], "m²", 8, "pose"),

  // ——— ISOLATION ———
  v1("v1-iso-100", "Isolation", "Laine minérale 100 mm fourni/posé", ["laine minerale 100", "isolation 100 mm", "laine de verre 100"], "m²", 18, "fourniture_et_pose", 5.5),
  v1("v1-iso-200", "Isolation", "Laine minérale 200 mm fourni/posé", ["laine minerale 200", "isolation 200 mm", "laine de verre 200"], "m²", 25, "fourniture_et_pose", 5.5),
  v1("v1-iso-murs", "Isolation", "Isolation murs intérieure standard", ["isolation murs interieure", "isolation mur", "doublage isolant"], "m²", 22, "fourniture_et_pose", 5.5),
  v1("v1-iso-combles", "Isolation", "Isolation combles perdus", ["isolation combles perdus", "combles perdus", "soufflage combles"], "m²", 28, "fourniture_et_pose", 5.5),
  v1("v1-iso-rampant", "Isolation", "Isolation plafond sous rampant", ["isolation sous rampant", "rampant toiture", "isolation combles amenages"], "m²", 35, "fourniture_et_pose", 5.5),

  // ——— CARRELAGE / FAÏENCE ———
  v1("v1-carrelage-pose-seule", "Carrelage / Faïence", "Pose carrelage seule", ["pose carrelage seule", "pose carrelage", "main d oeuvre carrelage"], "m²", 45, "pose"),
  v1("v1-carrelage-fp-std", "Carrelage / Faïence", "Carrelage fourni/posé standard", ["carrelage fourni pose", "carrelage standard", "gres cerame"], "m²", 75, "fourniture_et_pose"),
  v1("v1-carrelage-fp-gf", "Carrelage / Faïence", "Carrelage grand format fourni/posé", ["carrelage grand format", "grand format", "carrelage 60x60"], "m²", 95, "fourniture_et_pose"),
  v1("v1-faience-fp-std", "Carrelage / Faïence", "Faïence fournie/posée standard", ["faience standard", "faience murale", "carrelage mural"], "m²", 90, "fourniture_et_pose"),
  v1("v1-faience-fp-gf", "Carrelage / Faïence", "Faïence grand format", ["faience grand format", "faience grand format murale"], "m²", 110, "fourniture_et_pose"),
  v1("v1-carrelage-plinthes", "Carrelage / Faïence", "Plinthes carrelage", ["plinthes carrelage", "plinthe carrelage"], "ml", 12, "fourniture_et_pose"),
  v1("v1-carrelage-ragreage", "Carrelage / Faïence", "Ragréage autolissant", ["ragreage autolissant", "ragreage sol", "autolissant"], "m²", 15, "fourniture_et_pose"),
  v1("v1-carrelage-etancheite", "Carrelage / Faïence", "Étanchéité SPEC douche", ["etancheite spec", "etancheite douche", "spec douche"], "m²", 20, "fourniture_et_pose"),

  // ——— SOLS ———
  v1("v1-sol-parquet-ac4", "Sols", "Parquet flottant AC4 fourni/posé", ["parquet flottant ac4", "parquet ac4", "parquet stratifie ac4"], "m²", 40, "fourniture_et_pose"),
  v1("v1-sol-parquet-ac5", "Sols", "Parquet flottant AC5 fourni/posé", ["parquet flottant ac5", "parquet ac5", "parquet stratifie ac5"], "m²", 45, "fourniture_et_pose"),
  v1("v1-sol-sous-couche", "Sols", "Sous-couche acoustique", ["sous couche acoustique", "sous couche parquet", "isolant sol"], "m²", 5, "fourniture_et_pose"),
  v1("v1-sol-plinthes-mdf", "Sols", "Plinthes MDF fournies/posées", ["plinthes mdf", "plinthe mdf", "plinthes parquet"], "ml", 10, "fourniture_et_pose"),
  v1("v1-sol-pvc", "Sols", "Sol PVC fourni/posé", ["sol pvc", "pvc sol", "revetement pvc"], "m²", 38, "fourniture_et_pose"),
  v1("v1-sol-chape", "Sols", "Chape ciment 8 cm", ["chape ciment", "chape 8 cm", "chape traditionnelle"], "m²", 40, "fourniture_et_pose"),

  // ——— PEINTURE ———
  v1("v1-peinture-plafond", "Peinture", "Peinture plafond", ["peinture plafond", "repeinture plafond"], "m²", 18, "fourniture_et_pose"),
  v1("v1-peinture-murs", "Peinture", "Peinture murs", ["peinture murs", "peinture mur", "repeinture murs"], "m²", 20, "fourniture_et_pose"),
  v1("v1-peinture-2-couches", "Peinture", "Impression + 2 couches", ["impression 2 couches", "peinture 2 couches", "impression peinture"], "m²", 24, "fourniture_et_pose"),
  v1("v1-peinture-enduit", "Peinture", "Enduit complet prêt peinture", ["enduit pret peinture", "enduit lissage", "enduit complet"], "m²", 15, "fourniture_et_pose"),

  // ——— PLOMBERIE ———
  v1("v1-plomb-depl-efec", "Plomberie", "Déplacement alimentation EF/EC", ["deplacement alimentation", "alimentation ef ec", "point eau"], "point", 180, "pose"),
  v1("v1-plomb-evac-eu", "Plomberie", "Création évacuation EU", ["creation evacuation", "evacuation eu", "evacuation eaux usees"], "point", 160, "pose"),
  v1("v1-plomb-wc-suspendu", "Plomberie", "WC suspendu fourni/posé", ["wc suspendu", "toilette suspendue", "wc suspendu complet"], "forfait", 850, "fourniture_et_pose"),
  v1("v1-plomb-wc-sol", "Plomberie", "WC au sol fourni/posé", ["wc au sol", "toilette au sol", "wc pose sol"], "forfait", 450, "fourniture_et_pose"),
  v1("v1-plomb-meuble-vasque", "Plomberie", "Meuble vasque fourni/posé", ["meuble vasque", "vasque meuble", "meuble sdb"], "forfait", 900, "fourniture_et_pose"),
  v1("v1-plomb-meuble-double", "Plomberie", "Meuble double vasque fourni/posé", ["meuble double vasque", "double vasque", "meuble 2 vasques"], "forfait", 1400, "fourniture_et_pose"),
  v1("v1-plomb-mitigeur", "Plomberie", "Mitigeur fourni/posé", ["mitigeur", "robinet mitigeur", "mitigeur lavabo"], "forfait", 180, "fourniture_et_pose", 20),
  v1("v1-plomb-receveur", "Plomberie", "Receveur douche fourni/posé", ["receveur douche", "bac douche", "receveur extra plat"], "forfait", 650, "fourniture_et_pose"),
  v1("v1-plomb-paroi", "Plomberie", "Paroi douche fournie/posée", ["paroi douche", "paroi verre douche", "cabine douche"], "forfait", 550, "fourniture_et_pose"),
  v1("v1-plomb-douche-complete", "Plomberie", "Douche complète fournie/posée", ["douche complete", "salle de bain douche", "installation douche"], "forfait", 3000, "fourniture_et_pose"),
  v1("v1-plomb-baignoire", "Plomberie", "Baignoire fournie/posée", ["baignoire", "pose baignoire", "baignoire acrylique"], "forfait", 1200, "fourniture_et_pose"),
  v1("v1-plomb-seche-serviettes", "Plomberie", "Sèche-serviettes fourni/posé", ["seche serviettes", "radiateur seche serviette", "seche serviette electrique"], "forfait", 450, "fourniture_et_pose"),

  // ——— ÉLECTRICITÉ ———
  v1("v1-elec-prise", "Électricité", "Prise électrique complète", ["prise electrique", "prise murale", "creation prise"], "unité", 95, "fourniture_et_pose"),
  v1("v1-elec-interrupteur", "Électricité", "Interrupteur complet", ["interrupteur", "inter simple", "va et vient"], "unité", 70, "fourniture_et_pose"),
  v1("v1-elec-spot", "Électricité", "Spot LED fourni/posé", ["spot led", "spot plafond", "eclairage spot"], "unité", 65, "fourniture_et_pose"),
  v1("v1-elec-miroir", "Électricité", "Alimentation miroir lumineux", ["miroir lumineux", "miroir led", "alimentation miroir", "miroir sdb", "miroir lumineux led"], "unité", 120, "fourniture_et_pose"),
  v1("v1-elec-vmc", "Électricité", "VMC simple flux", ["vmc simple flux", "vmc", "ventilation mecanique"], "forfait", 650, "fourniture_et_pose"),
  v1("v1-elec-tableau-t3", "Électricité", "Tableau électrique T3 complet", ["tableau electrique t3", "tableau t3", "coffret electrique"], "forfait", 1200, "fourniture_et_pose"),
  v1("v1-elec-renov-m2", "Électricité", "Installation électrique rénovation", ["installation electrique renovation", "electricite renovation", "reseau electrique m2"], "m² habitable", 110, "fourniture_et_pose"),

  // ——— DÉPOSE ———
  v1("v1-depose-faience", "Dépose", "Dépose faïence", ["depose faience", "arrachage faience", "demolition faience"], "m²", 18, "pose"),
  v1("v1-depose-carrelage", "Dépose", "Dépose carrelage", ["depose carrelage", "arrachage carrelage", "demolition carrelage"], "m²", 22, "pose"),
  v1("v1-depose-cloison", "Dépose", "Dépose cloison", ["depose cloison", "demolition cloison", "depose placo"], "m²", 20, "pose"),
  v1("v1-depose-plafond", "Dépose", "Dépose plafond", ["depose plafond", "demolition plafond", "depose faux plafond"], "m²", 18, "pose"),
  v1("v1-depose-baignoire", "Dépose", "Dépose baignoire", ["depose baignoire", "demolition baignoire", "retrait baignoire"], "forfait", 180, "pose"),
  v1("v1-depose-meuble-vasque", "Dépose", "Dépose meuble vasque", ["depose meuble vasque", "depose vasque", "retrait meuble sdb"], "forfait", 90, "pose"),
  v1("v1-depose-sdb-complete", "Dépose", "Dépose salle de bain complète", ["depose salle de bain", "demolition sdb", "depose sdb complete"], "forfait", 800, "pose"),

  // ——— ÉVACUATION / NETTOYAGE ———
  v1("v1-evac-gravats", "Évacuation / Nettoyage", "Évacuation gravats", ["evacuation gravats", "gravats", "decharge gravats"], "m³", 120, "fourniture_et_pose", 20),
  v1("v1-evac-benne", "Évacuation / Nettoyage", "Benne petite quantité", ["benne", "benne gravats", "location benne"], "forfait", 250, "fourniture_et_pose", 20),
  v1("v1-nettoyage-fin", "Évacuation / Nettoyage", "Nettoyage fin chantier", ["nettoyage fin chantier", "menage fin chantier", "nettoyage fin"], "forfait", 250, "pose", 20),
  v1("v1-protection-chantier", "Évacuation / Nettoyage", "Protection chantier", ["protection chantier", "bache protection", "protection sols"], "forfait", 150, "fourniture_et_pose", 20),
];

export const BATIMUM_PRIX_CATALOGUE: BatimumPrixCatalogueEntry[] =
  mergePriceLibraryIntoCatalogue(BASE_BATIMUM_PRIX_CATALOGUE);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getAdjustedBatimumPrice(
  entry: BatimumPrixCatalogueEntry,
  params: {
    regionCode: string;
    departementCode: string;
    ville?: string;
    coefficientManuel?: number | null;
    niveauPrix: BtpNiveauPrix;
    field?: "min" | "moyen" | "max";
  },
): number {
  const base =
    params.field === "min"
      ? entry.prixMinHT
      : params.field === "max"
        ? entry.prixMaxHT
        : entry.prixMoyenHT;

  const coef = getRegionalCoefficient({
    regionCode: params.regionCode,
    departementCode: params.departementCode,
    ville: params.ville,
    coefficientManuel: params.coefficientManuel,
  });

  return round2(base * coef * getNiveauPrixMultiplier(params.niveauPrix));
}

export function findBatimumCatalogueEntry(
  designation: string,
): BatimumPrixCatalogueEntry | undefined {
  const key = normalizeBibliothequeKey(designation);
  if (!key) return undefined;

  const exact = BATIMUM_PRIX_CATALOGUE.find(
    (entry) => normalizeBibliothequeKey(entry.designation) === key,
  );
  if (exact) return exact;

  const keywordMatch = BATIMUM_PRIX_CATALOGUE.find((entry) =>
    entry.motsCles.some((mot) => {
      const motKey = normalizeBibliothequeKey(mot);
      return motKey === key || key.includes(motKey) || motKey.includes(key);
    }),
  );
  if (keywordMatch) return keywordMatch;

  return BATIMUM_PRIX_CATALOGUE.find((entry) => {
    const entryKey = normalizeBibliothequeKey(entry.designation);
    return entryKey.includes(key) || key.includes(entryKey);
  });
}

export function formatBatimumCatalogueForPrompt(params: {
  regionCode: string;
  regionLabel: string;
  departementCode: string;
  departementLabel: string;
  ville?: string;
  coefficientManuel?: number | null;
  niveauPrix: BtpNiveauPrix;
}): string {
  const regionalInput: RegionalCoefficientInput = {
    regionCode: params.regionCode,
    departementCode: params.departementCode,
    ville: params.ville,
    coefficientManuel: params.coefficientManuel,
  };
  const coefLabel = formatRegionalCoefficientLabel(regionalInput);

  const header = [
    `BIBLIOTHÈQUE BATIMUM STANDARD ${BATIMUM_STANDARD_VERSION} (NE PAS INVENTER DE PRIX HORS CETTE BASE) :`,
    `${BATIMUM_PRIX_CATALOGUE.length} lignes de référence nationale — remplacées progressivement par la bibliothèque entreprise.`,
    `Région : ${params.regionLabel} | Département : ${params.departementCode} — ${params.departementLabel}`,
    `Niveau de prix : ${params.niveauPrix} | Coefficient régional : ${coefLabel}`,
    `Fiabilité base standard : ${FIABILITE_BATIMUM_STANDARD}% | Fiabilité après coefficient régional : ${FIABILITE_BATIMUM_REGIONAL}%`,
    "Formule : prix_régional = prix_standard_V1 × coefficient_régional × coefficient_niveau",
    "Priorité MUM IA : bibliothèque entreprise (si fiable) > Batimum régional V1 > prix à vérifier.",
    "Si aucune correspondance fiable → prixAVerifier=true et mention « Prix à vérifier ».",
    "",
  ];

  const lines = BATIMUM_PRIX_CATALOGUE.map((entry) => {
    const moyen = getAdjustedBatimumPrice(entry, { ...params, field: "moyen" });

    return [
      `- [${entry.id}] ${entry.categorie} | ${entry.designation}`,
      `  Type: ${entry.type} | Unité: ${entry.unite} | TVA: ${entry.tvaHabituelle}%`,
      `  Standard V1 HT: ${entry.prixMoyenHT} € | Régional HT: ${moyen} €`,
      `  Mots-clés: ${entry.motsCles.join(", ")}`,
    ].join("\n");
  });

  return [...header, ...lines].join("\n");
}
