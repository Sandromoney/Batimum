import type {
  Fournisseur,
  FournisseurFamilleProduit,
  FournisseurTarifLigne,
} from "@/lib/types";
import type { SupplierPriceSource } from "@/lib/supplier-price/types";

export function normalizeFournisseurText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function inferFamilleProduit(label: string): FournisseurFamilleProduit {
  const n = normalizeFournisseurText(label);
  if (/carrel|faience/.test(n)) return "carrelage";
  if (/placo|platre/.test(n)) return "placo";
  if (/peint|enduit/.test(n)) return "peinture";
  if (/electri|prise|tableau/.test(n)) return "electricite";
  if (/chauff|radiateur|chaudiere/.test(n)) return "chauffage";
  if (/clim|vmc/.test(n)) return "climatisation";
  if (/menuiser|porte|fenetre/.test(n)) return "menuiserie";
  if (/tube|robinet|evier|wc|douche|plomb/.test(n)) return "plomberie";
  return "autre";
}

export function remisePourFamille(
  fournisseur: Fournisseur,
  famille: FournisseurFamilleProduit,
): number {
  const line = fournisseur.remisesParFamille?.find((item) => item.famille === famille);
  if (line && typeof line.remisePourcent === "number") return line.remisePourcent;
  return fournisseur.remiseGlobalePourcent ?? 0;
}

export function fournisseurCouvreFamille(
  fournisseur: Fournisseur,
  famille: FournisseurFamilleProduit,
): boolean {
  if (!fournisseur.familles.length) return true;
  return fournisseur.familles.includes(famille);
}

export function findTarifLigne(
  tarifs: FournisseurTarifLigne[],
  fournisseurId: string,
  designation: string,
  reference?: string,
): FournisseurTarifLigne | undefined {
  const target = normalizeFournisseurText(designation);
  const ref = reference ? normalizeFournisseurText(reference) : "";

  const supplierTarifs = tarifs.filter((line) => line.fournisseurId === fournisseurId);
  if (ref) {
    const byRef = supplierTarifs.find(
      (line) => line.reference && normalizeFournisseurText(line.reference) === ref,
    );
    if (byRef) return byRef;
  }

  const exact = supplierTarifs.find(
    (line) => normalizeFournisseurText(line.nomProduit) === target,
  );
  if (exact) return exact;

  return supplierTarifs.find((line) => {
    const name = normalizeFournisseurText(line.nomProduit);
    return name.includes(target) || target.includes(name);
  });
}

export type PrixEstimeResult = {
  prixPublic?: number;
  prixRemise?: number;
  remisePourcent?: number;
  source: SupplierPriceSource;
  dateMiseAJour?: string;
  aVerifier?: boolean;
};

export function calculerPrixEstimeEntreprise(
  fournisseur: Fournisseur,
  famille: FournisseurFamilleProduit,
  tarif?: FournisseurTarifLigne,
): PrixEstimeResult {
  const remise = remisePourFamille(fournisseur, famille);
  const prixPublic = tarif?.prixPublic;
  const prixRemiseImport = tarif?.prixRemise;
  const prixSaisi = tarif?.prixEntrepriseSaisi;

  if (typeof prixSaisi === "number" && prixSaisi >= 0) {
    return {
      prixPublic,
      prixRemise: prixSaisi,
      remisePourcent: remise,
      source: "saisie",
      dateMiseAJour: tarif?.dateImport,
      aVerifier: tarif?.aVerifier,
    };
  }

  if (typeof prixRemiseImport === "number" && prixRemiseImport >= 0) {
    return {
      prixPublic,
      prixRemise: prixRemiseImport,
      remisePourcent: remise,
      source: "import_remise",
      dateMiseAJour: tarif?.dateImport,
      aVerifier: tarif?.aVerifier,
    };
  }

  if (typeof prixPublic === "number" && prixPublic >= 0 && remise > 0) {
    return {
      prixPublic,
      prixRemise: Number((prixPublic * (1 - remise / 100)).toFixed(2)),
      remisePourcent: remise,
      source: remise !== (fournisseur.remiseGlobalePourcent ?? 0) ? "remise_famille" : "remise_globale",
      dateMiseAJour: tarif?.dateImport,
      aVerifier: tarif?.aVerifier,
    };
  }

  if (typeof prixPublic === "number" && prixPublic >= 0) {
    return {
      prixPublic,
      prixRemise: prixPublic,
      remisePourcent: 0,
      source: "import_public",
      dateMiseAJour: tarif?.dateImport,
      aVerifier: tarif?.aVerifier,
    };
  }

  return {
    source: "none",
    remisePourcent: remise,
    aVerifier: tarif?.aVerifier,
  };
}

export function formatFournisseurAdresse(fournisseur: Fournisseur): string {
  return [fournisseur.adresseDepot, `${fournisseur.codePostal} ${fournisseur.ville}`.trim()]
    .filter(Boolean)
    .join(", ");
}

export type ParsedTarifCsvRow = {
  reference?: string;
  nomProduit: string;
  categorie?: string;
  unite?: string;
  prixPublic?: number;
  prixRemise?: number;
  aVerifier?: boolean;
};

function parseCsvNumber(value: string): number | undefined {
  const cleaned = value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function detectCsvDelimiter(header: string): string {
  const semicolons = (header.match(/;/g) ?? []).length;
  const commas = (header.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function mapCsvHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((header, index) => {
    const key = normalizeFournisseurText(header);
    map[key] = index;
  });
  return map;
}

function pickCsvValue(
  cells: string[],
  headerMap: Record<string, number>,
  aliases: string[],
): string {
  for (const alias of aliases) {
    const index = headerMap[alias];
    if (index !== undefined) {
      const value = cells[index]?.trim();
      if (value) return value;
    }
  }
  return "";
}

export function parseTarifCsv(content: string): ParsedTarifCsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = detectCsvDelimiter(lines[0] ?? "");
  const headerMap = mapCsvHeaders(
    (lines[0] ?? "").split(delimiter).map((cell) => cell.trim()),
  );

  const rows: ParsedTarifCsvRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const nomProduit = pickCsvValue(cells, headerMap, [
      "nom produit",
      "nom",
      "designation",
      "produit",
      "libelle",
      "description",
    ]);
    if (!nomProduit) continue;

    const reference = pickCsvValue(cells, headerMap, ["reference", "ref", "code"]);
    const categorie = pickCsvValue(cells, headerMap, ["categorie", "famille", "category"]);
    const unite = pickCsvValue(cells, headerMap, ["unite", "unit", "u"]);
    const prixPublicRaw = pickCsvValue(cells, headerMap, [
      "prix public",
      "prix_public",
      "prix ht",
      "prix",
      "tarif public",
    ]);
    const prixRemiseRaw = pickCsvValue(cells, headerMap, [
      "prix remise",
      "prix_remise",
      "prix remise",
      "prix pro",
      "prix net",
      "prix remis",
    ]);

    const prixPublic = parseCsvNumber(prixPublicRaw);
    const prixRemise = parseCsvNumber(prixRemiseRaw);

    rows.push({
      reference: reference || undefined,
      nomProduit,
      categorie: categorie || undefined,
      unite: unite || undefined,
      prixPublic,
      prixRemise,
      aVerifier: !prixPublic && !prixRemise,
    });
  }

  return rows;
}
