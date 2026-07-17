/**
 * Normalisation des enseignes fournisseurs BTP.
 * Ne constitue pas une liste fermée : toute saisie libre reste acceptée.
 * Les alias servent uniquement à reconnaître les variantes d'écriture courantes.
 */

/** Suggestions rapides affichées sous le champ de recherche. */
export const SUPPLIER_SEARCH_SUGGESTIONS = [
  "Point.P",
  "CEDEO",
  "Téréva",
  "Partedis",
  "Gedimat",
  "BigMat",
  "Rexel",
  "Chausson Matériaux",
] as const;

/** Enseignes connues (pour matching, pas pour filtrage). */
export const KNOWN_SUPPLIER_BRANDS = [
  "Point.P",
  "CEDEO",
  "Téréva",
  "Partedis",
  "Gedimat",
  "BigMat",
  "Chausson Matériaux",
  "Frans Bonhomme",
  "Richardson",
  "Brossette",
  "Rexel",
  "Sonepar",
  "YESSS Électrique",
  "Würth",
  "Hilti",
  "Legallais",
  "Foussier",
  "Descours & Cabaud",
  "Prolians",
  "Kiloutou",
  "Loxam",
  "Dispano",
  "Panofrance",
  "PUM",
  "Larivière",
  "Asturienne",
  "Décocéram",
  "Aubade",
  "Porcelanosa",
  "Lapeyre",
  "Leroy Merlin",
  "Castorama",
  "Brico Dépôt",
  "Brico Cash",
  "Mr.Bricolage",
] as const;

/** Patterns Overpass par enseigne canonique (regex, insensible à la casse). */
export const BRAND_OVERPASS_PATTERNS: Record<string, string[]> = {
  "Point.P": ["Point\\.?P", "Point P", "POINT P", "Point-P", "POINT\\.?P"],
  CEDEO: ["CEDEO", "Cedeo", "C[eé]d[eé]o"],
  "Téréva": ["T[eé]r[eé]va", "Tereva", "TEREVA"],
  Partedis: ["Partedis", "PARTEDIS"],
  Gedimat: ["Gedimat", "G[eé]dimat", "GEDIMAT"],
  BigMat: ["BigMat", "Big Mat", "BIGMAT"],
  "Chausson Matériaux": [
    "Chausson",
    "Chausson Mat[eé]riaux",
    "Chausson Matériaux",
  ],
  "Frans Bonhomme": ["Frans Bonhomme", "Frans Bonhomme Mat[eé]riaux"],
  Richardson: ["Richardson"],
  Brossette: ["Brossette"],
  Rexel: ["Rexel", "REXEL"],
  Sonepar: ["Sonepar", "SONEPAR"],
  "YESSS Électrique": ["YESSS", "Yesss", "Yesss [Ee]lectrique"],
  Würth: ["W[uü]rth", "Wurth", "WURTH"],
  Hilti: ["Hilti", "HILTI"],
  Legallais: ["Legallais", "L[eé]gallais"],
  Foussier: ["Foussier"],
  "Descours & Cabaud": ["Descours", "Descours.*Cabaud", "D[eé]scours"],
  Prolians: ["Prolians", "PROLIANS"],
  Kiloutou: ["Kiloutou", "KILOUTOU"],
  Loxam: ["Loxam", "LOXAM"],
  Dispano: ["Dispano"],
  Panofrance: ["Panofrance", "Pano France"],
  PUM: ["PUM", "P\\.U\\.M"],
  Larivière: ["Larivi[eè]re", "Lariviere"],
  Asturienne: ["Asturienne"],
  Décocéram: ["D[eé]coc[eé]ram", "Decoceram"],
  Aubade: ["Aubade"],
  Porcelanosa: ["Porcelanosa"],
  Lapeyre: ["Lapeyre"],
  "Leroy Merlin": ["Leroy Merlin", "Leroy-Merlin"],
  Castorama: ["Castorama"],
  "Brico Dépôt": ["Brico D[eé]p[oô]t", "Brico Depot"],
  "Brico Cash": ["Brico Cash"],
  "Mr.Bricolage": ["Mr\\.? ?Bricolage", "M\\.? ?Bricolage"],
};

/** Variantes textuelles par clé normalisée (sans adresses fixes). */
export const BRAND_QUERY_VARIANTS: Record<string, string[]> = {
  tereva: ["Téréva", "Tereva", "TEREVA"],
  "point p": ["Point.P", "Point P", "Point-P", "POINT P"],
  cedeo: ["CEDEO", "Cedeo", "Cédéo"],
  gedimat: ["Gedimat", "Gédimat", "GEDIMAT"],
  wurth: ["Würth", "Wurth", "WURTH"],
  bigmat: ["BigMat", "Big Mat", "BIGMAT"],
  rexel: ["Rexel", "REXEL"],
  partedis: ["Partedis", "PARTEDIS"],
  "yesss electrique": ["YESSS Électrique", "YESSS", "Yesss"],
  chaussonmateriaux: ["Chausson Matériaux", "Chausson"],
};

const DEPARTMENT_NAMES: Record<string, string> = {
  "01": "Ain",
  "31": "Haute-Garonne",
  "81": "Tarn",
  "12": "Aveyron",
  "82": "Tarn-et-Garonne",
};

export function stripAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalise une requête fournisseur pour comparaison.
 * Ex. Téréva → tereva, Point.P → point p
 */
export function normalizeSupplierQuery(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDepartmentCode(postcode: string): string | null {
  const cp = postcode.trim();
  if (!cp) return null;
  if (cp.startsWith("20")) return cp.slice(0, 3) === "201" ? "2A" : "2B";
  return cp.slice(0, 2);
}

export function getDepartmentLabel(postcode: string): string | null {
  const code = getDepartmentCode(postcode);
  if (!code) return null;
  return DEPARTMENT_NAMES[code] ?? null;
}

export type SupplierSearchPass = {
  query: string;
  bounded: boolean;
  label: string;
};

/**
 * Construit les passes de recherche textuelle (générique, toutes enseignes).
 */
export function buildSupplierSearchPasses(input: {
  query: string;
  ville?: string;
  codePostal?: string;
}): SupplierSearchPass[] {
  const original = input.query.trim();
  if (!original) return [];

  const canonical = normalizeSupplierBrandQuery(original);
  const normalizedKey = normalizeSupplierQuery(canonical);
  const noAccent = stripAccents(canonical).trim();
  const ville = input.ville?.trim() ?? "";
  const codePostal = input.codePostal?.trim() ?? "";
  const department = codePostal ? getDepartmentLabel(codePostal) : null;

  const seen = new Set<string>();
  const passes: SupplierSearchPass[] = [];

  const add = (query: string, bounded: boolean, label: string) => {
    const key = `${query.toLowerCase()}|${bounded}`;
    if (!query.trim() || seen.has(key)) return;
    seen.add(key);
    passes.push({ query: query.trim(), bounded, label });
  };

  add(canonical, false, "canonical");
  if (noAccent !== canonical) add(noAccent, false, "no-accent");

  const aliasVariants = BRAND_QUERY_VARIANTS[normalizedKey] ?? [];
  for (const variant of aliasVariants) {
    add(variant, false, `alias:${variant}`);
  }
  if (original !== canonical) add(original, false, "original");

  if (ville) {
    add(`${canonical} ${ville}`, true, "canonical+ville");
    add(`${noAccent} ${ville}`, true, "no-accent+ville");
  }

  if (codePostal) {
    add(`${canonical} ${codePostal}`, true, "canonical+cp");
    add(`${noAccent} ${codePostal}`, true, "no-accent+cp");
  }

  if (department) {
    add(`${canonical} ${department}`, false, "canonical+dept");
    add(`${noAccent} ${department}`, false, "no-accent+dept");
  }

  return passes;
}

export function normalizeForBrandMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function matchesBrandAlias(queryNorm: string, alias: string): boolean {
  const aliasNorm = normalizeForBrandMatch(alias);
  if (!aliasNorm || !queryNorm) return false;
  return (
    queryNorm === aliasNorm ||
    queryNorm.includes(aliasNorm) ||
    aliasNorm.includes(queryNorm)
  );
}

/**
 * Retourne l'enseigne canonique si reconnue, sinon la requête telle quelle.
 */
export function normalizeSupplierBrandQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return trimmed;

  const queryNorm = normalizeForBrandMatch(trimmed);

  for (const brand of KNOWN_SUPPLIER_BRANDS) {
    const brandNorm = normalizeForBrandMatch(brand);
    if (queryNorm === brandNorm || matchesBrandAlias(queryNorm, brand)) {
      return brand;
    }
  }

  return trimmed;
}

/**
 * Variantes de recherche à essayer (canonique + saisie originale si différente).
 */
export function getSupplierSearchVariants(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const canonical = normalizeSupplierBrandQuery(trimmed);
  const variants = new Set<string>([canonical]);
  if (canonical !== trimmed) variants.add(trimmed);
  return [...variants];
}

export function inferEnseigneFromQuery(query: string): string {
  return normalizeSupplierBrandQuery(query);
}

export function buildOverpassPattern(query: string): string {
  const enseigne = inferEnseigneFromQuery(query);
  const known = BRAND_OVERPASS_PATTERNS[enseigne];
  if (known?.length) return known.join("|");

  return query
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
