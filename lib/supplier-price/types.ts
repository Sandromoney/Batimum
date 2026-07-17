import type {
  Fournisseur,
  FournisseurFamilleProduit,
  FournisseurTarifLigne,
  Parametres,
} from "@/lib/types";

export type SupplierPriceSource =
  | "saisie"
  | "import_remise"
  | "import_public"
  | "remise_globale"
  | "remise_famille"
  | "public_api"
  | "none";

export type SupplierPriceQuery = {
  designation: string;
  reference?: string;
  famille?: FournisseurFamilleProduit;
  fournisseurId?: string;
  quantite?: number;
  unite?: string;
};

export type SupplierPriceContext = {
  parametres: Parametres;
  fournisseurs: Fournisseur[];
  tarifs: FournisseurTarifLigne[];
};

export type SupplierPriceResult = {
  fournisseurId: string;
  fournisseurNom: string;
  reference?: string;
  nomProduit?: string;
  prixPublic?: number;
  prixRemise?: number;
  prixEstimeUnitaire?: number;
  remisePourcent?: number;
  source: SupplierPriceSource;
  dateMiseAJour?: string;
  disponible: boolean;
  aVerifier?: boolean;
  providerId: string;
};

export interface SupplierPriceProvider {
  readonly id: string;
  readonly label: string;
  lookup(
    query: SupplierPriceQuery,
    context: SupplierPriceContext,
  ): SupplierPriceResult | null;
  lookupAll(
    query: SupplierPriceQuery,
    context: SupplierPriceContext,
  ): SupplierPriceResult[];
}
