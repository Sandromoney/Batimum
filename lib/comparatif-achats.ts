import {
  buildTrajetsFournisseurs,
  type TrajetFournisseur,
} from "@/lib/fournisseur-trajet";
import {
  fournisseurCouvreFamille,
  inferFamilleProduit,
} from "@/lib/fournisseur-utils";
import {
  buildSupplierPriceContext,
  resolveSupplierPrices,
} from "@/lib/supplier-price";
import type { SupplierPriceResult } from "@/lib/supplier-price/types";
import type {
  Client,
  Devis,
  Fournisseur,
  FournisseurFamilleProduit,
  Parametres,
} from "@/lib/types";

export type ComparatifFournisseurLigne = {
  fournisseur: Fournisseur;
  prixPublic?: number;
  prixRemise?: number;
  remisePourcent?: number;
  prixEstimeUnitaire?: number;
  coutTotal?: number;
  prixStatus: "available" | "unavailable";
  sourcePrix: SupplierPriceResult["source"];
  score: number;
  distanceKm?: number;
  tempsTrajetMin?: number;
  aVerifier?: boolean;
};

export type ComparatifAchatLigne = {
  id: string;
  designation: string;
  quantite: number;
  unite?: string;
  famille: FournisseurFamilleProduit;
  comparatifs: ComparatifFournisseurLigne[];
  meilleurChoix?: ComparatifFournisseurLigne;
  economiePossible?: number;
  explication?: string;
};

export type PanierFournisseur = {
  fournisseur: Fournisseur;
  totalEstime: number;
  lignesAvecPrix: number;
  lignesTotal: number;
  distanceKm?: number;
  tempsTrajetMin?: number;
  score: number;
  favori: boolean;
  disponibilitePrix: number;
};

export type ComparatifAchatsResult = {
  lignes: ComparatifAchatLigne[];
  paniers: PanierFournisseur[];
  meilleurPanier?: PanierFournisseur;
  economieMeilleurPanier?: number;
  fournisseurPrincipal?: Fournisseur;
  coutMateriauxEstime: number;
  lignesSansPrix: number;
  margeEstimee?: number;
  rentabilite: "bonne" | "moyenne" | "faible" | "inconnue";
  explication: string;
  chantierAdresse?: string;
  clientAdresse?: string;
  adresseReference?: string;
  depotEntreprise?: string;
  trajets: TrajetFournisseur[];
  adresseManquante: boolean;
};

function scoreComparatifLigne(input: {
  fournisseur: Fournisseur;
  prixEstimeUnitaire?: number;
  distanceKm?: number;
  disponible: boolean;
  famille: FournisseurFamilleProduit;
}): number {
  let score = 0;
  if (input.disponible && typeof input.prixEstimeUnitaire === "number") {
    score += Math.max(0, 80 - input.prixEstimeUnitaire * 0.15);
  }
  score += (input.fournisseur.remiseGlobalePourcent ?? 0) * 0.35;
  if (input.fournisseur.favori) score += 14;
  if (input.disponible) score += 18;
  if (fournisseurCouvreFamille(input.fournisseur, input.famille)) score += 8;
  if (typeof input.distanceKm === "number") {
    score -= Math.min(25, input.distanceKm * 0.6);
  }
  return Number(score.toFixed(1));
}

function buildComparatifForLine(
  lineId: string,
  designation: string,
  quantite: number,
  unite: string | undefined,
  fournisseurs: Fournisseur[],
  trajets: TrajetFournisseur[],
  priceResults: SupplierPriceResult[],
): ComparatifAchatLigne {
  const famille = inferFamilleProduit(designation);
  const comparatifs: ComparatifFournisseurLigne[] = fournisseurs
    .filter((fournisseur) => fournisseurCouvreFamille(fournisseur, famille))
    .map((fournisseur) => {
      const price = priceResults.find((item) => item.fournisseurId === fournisseur.id);
      const trajet = trajets.find((item) => item.fournisseur.id === fournisseur.id);
      const prixEstimeUnitaire = price?.prixEstimeUnitaire;
      const disponible = Boolean(price?.disponible && typeof prixEstimeUnitaire === "number");
      const coutTotal =
        disponible && typeof prixEstimeUnitaire === "number"
          ? Number((prixEstimeUnitaire * quantite).toFixed(2))
          : undefined;

      return {
        fournisseur,
        prixPublic: price?.prixPublic,
        prixRemise: price?.prixRemise,
        remisePourcent: price?.remisePourcent,
        prixEstimeUnitaire,
        coutTotal,
        prixStatus: disponible ? "available" : "unavailable",
        sourcePrix: price?.source ?? "none",
        score: scoreComparatifLigne({
          fournisseur,
          prixEstimeUnitaire,
          distanceKm: trajet?.distanceKm,
          disponible,
          famille,
        }),
        distanceKm: trajet?.distanceKm,
        tempsTrajetMin: trajet?.tempsTrajetMin,
        aVerifier: price?.aVerifier,
      } satisfies ComparatifFournisseurLigne;
    })
    .sort((a, b) => {
      if (a.prixStatus !== b.prixStatus) {
        return a.prixStatus === "available" ? -1 : 1;
      }
      if (
        typeof a.prixEstimeUnitaire === "number" &&
        typeof b.prixEstimeUnitaire === "number" &&
        a.prixEstimeUnitaire !== b.prixEstimeUnitaire
      ) {
        return a.prixEstimeUnitaire - b.prixEstimeUnitaire;
      }
      return b.score - a.score;
    });

  const avecPrix = comparatifs.filter((item) => item.prixStatus === "available");
  const meilleurChoix = avecPrix[0] ?? comparatifs[0];
  const second = avecPrix[1];
  const economiePossible =
    meilleurChoix?.coutTotal && second?.coutTotal
      ? Number((second.coutTotal - meilleurChoix.coutTotal).toFixed(2))
      : undefined;

  let explication: string | undefined;
  if (meilleurChoix && second && economiePossible && economiePossible > 0) {
    const deltaDistance =
      (second.distanceKm ?? 0) - (meilleurChoix.distanceKm ?? 0);
    if (deltaDistance > 8 && economiePossible < 15) {
      explication = `${meilleurChoix.fournisseur.nom} semble plus intéressant : l'écart de prix est faible et le trajet est plus court.`;
    } else {
      explication = `Meilleur choix : ${meilleurChoix.fournisseur.nom}${economiePossible > 0 ? ` — économie estimée ${economiePossible.toFixed(2)} € vs ${second.fournisseur.nom}` : ""}.`;
    }
  } else if (meilleurChoix?.prixStatus === "available") {
    explication = `Meilleur choix : ${meilleurChoix.fournisseur.nom} avec votre remise.`;
  } else {
    explication = "Prix public non disponible — complétez les tarifs fournisseur.";
  }

  return {
    id: lineId,
    designation,
    quantite,
    unite,
    famille,
    comparatifs,
    meilleurChoix,
    economiePossible,
    explication,
  };
}

function buildPaniers(
  lignes: ComparatifAchatLigne[],
  fournisseurs: Fournisseur[],
  trajets: TrajetFournisseur[],
): PanierFournisseur[] {
  return fournisseurs
    .map((fournisseur) => {
      const trajet = trajets.find((item) => item.fournisseur.id === fournisseur.id);
      let totalEstime = 0;
      let lignesAvecPrix = 0;

      for (const ligne of lignes) {
        const match = ligne.comparatifs.find(
          (item) => item.fournisseur.id === fournisseur.id,
        );
        if (match?.coutTotal) {
          totalEstime += match.coutTotal;
          lignesAvecPrix += 1;
        }
      }

      const disponibilitePrix =
        lignes.length > 0 ? Math.round((lignesAvecPrix / lignes.length) * 100) : 0;

      let score = 0;
      if (lignesAvecPrix > 0) score += 40;
      score += disponibilitePrix * 0.25;
      score -= totalEstime * 0.01;
      if (fournisseur.favori) score += 12;
      if (typeof trajet?.distanceKm === "number") {
        score -= Math.min(20, trajet.distanceKm * 0.4);
      }

      return {
        fournisseur,
        totalEstime: Number(totalEstime.toFixed(2)),
        lignesAvecPrix,
        lignesTotal: lignes.length,
        distanceKm: trajet?.distanceKm,
        tempsTrajetMin: trajet?.tempsTrajetMin,
        score: Number(score.toFixed(1)),
        favori: Boolean(fournisseur.favori),
        disponibilitePrix,
      } satisfies PanierFournisseur;
    })
    .filter((panier) => panier.lignesAvecPrix > 0 || panier.fournisseur.favori)
    .sort((a, b) => {
      if (a.lignesAvecPrix !== b.lignesAvecPrix) {
        return b.lignesAvecPrix - a.lignesAvecPrix;
      }
      if (a.totalEstime > 0 && b.totalEstime > 0 && a.totalEstime !== b.totalEstime) {
        return a.totalEstime - b.totalEstime;
      }
      return b.score - a.score;
    });
}

export function buildComparatifAchats(
  devis: Devis,
  client: Client | undefined,
  parametres: Parametres,
): ComparatifAchatsResult {
  const fournisseurs = parametres.fournisseurs ?? [];
  const context = buildSupplierPriceContext(parametres);

  const chantierAdresse = devis.adresseChantier?.trim() || undefined;
  const clientAdresse = client
    ? [client.adresse, `${client.codePostal} ${client.ville}`.trim()]
        .filter(Boolean)
        .join(", ")
    : undefined;

  const trajetBundle = buildTrajetsFournisseurs({
    parametres,
    fournisseurs,
    adresseChantier: chantierAdresse,
    adresseClient: clientAdresse,
    codePostalClient: client?.codePostal,
  });

  const lignes = devis.lignes
    .filter((line) => (line.typeLigne ?? "ligne") !== "section")
    .map((line) => {
      const designation = line.designation || line.description || "Ligne devis";
      const quantite = Number(line.quantite) || 0;
      const priceResults = resolveSupplierPrices(
        { designation, quantite, unite: line.unite },
        context,
      );
      return buildComparatifForLine(
        line.id,
        designation,
        quantite,
        line.unite,
        fournisseurs,
        trajetBundle.trajets,
        priceResults,
      );
    });

  const paniers = buildPaniers(lignes, fournisseurs, trajetBundle.trajets);
  const meilleurPanier = paniers[0];
  const secondPanier = paniers[1];
  const economieMeilleurPanier =
    meilleurPanier && secondPanier
      ? Number((secondPanier.totalEstime - meilleurPanier.totalEstime).toFixed(2))
      : undefined;

  const coutMateriauxEstime = Number(
  lignes
    .reduce((acc, line) => acc + (line.meilleurChoix?.coutTotal ?? 0), 0)
    .toFixed(2),
  );

  const lignesSansPrix = lignes.filter(
    (line) => line.meilleurChoix?.prixStatus !== "available",
  ).length;

  const margeEstimee =
    coutMateriauxEstime > 0
      ? Number(
          (
            ((devis.montantHT ?? 0) - coutMateriauxEstime) /
            (devis.montantHT || 1) *
            100
          ).toFixed(1),
        )
      : undefined;

  const rentabilite =
    margeEstimee === undefined
      ? "inconnue"
      : margeEstimee >= 30
        ? "bonne"
        : margeEstimee >= 15
          ? "moyenne"
          : "faible";

  const fournisseurPrincipal = meilleurPanier?.fournisseur;

  const explication =
    lignesSansPrix > 0
      ? `${lignesSansPrix} ligne(s) sans prix connu. Les prix publics indisponibles sont signalés clairement.`
      : meilleurPanier
        ? `Panier estimé le plus intéressant : ${meilleurPanier.fournisseur.nom}${economieMeilleurPanier && economieMeilleurPanier > 0 ? ` — économie estimée ${economieMeilleurPanier.toFixed(2)} €` : ""}.`
        : "Ajoutez des fournisseurs et importez vos tarifs pour activer le comparatif.";

  return {
    lignes,
    paniers,
    meilleurPanier,
    economieMeilleurPanier:
      economieMeilleurPanier && economieMeilleurPanier > 0
        ? economieMeilleurPanier
        : undefined,
    fournisseurPrincipal,
    coutMateriauxEstime,
    lignesSansPrix,
    margeEstimee,
    rentabilite,
    explication,
    chantierAdresse,
    clientAdresse,
    adresseReference: trajetBundle.adresseReference,
    depotEntreprise: trajetBundle.depot.adresse,
    trajets: trajetBundle.trajets,
    adresseManquante: !chantierAdresse && !clientAdresse,
  };
}

export function buildComparatifAchatsExportText(
  devis: Devis,
  client: Client | undefined,
  result: ComparatifAchatsResult,
): string {
  const clientLabel = client
    ? [client.prenom, client.nom, client.societe].filter(Boolean).join(" ")
    : "Client non renseigné";

  const lines = [
    `Chantier: ${devis.titre}`,
    `Client: ${clientLabel}`,
    `Fournisseur conseillé: ${result.fournisseurPrincipal?.nom ?? "Non déterminé"}`,
    `Coût matériaux estimé: ${result.coutMateriauxEstime.toFixed(2)} €`,
    `Marge estimée: ${result.margeEstimee ?? "N/A"} %`,
    "",
    "Comparatif matériaux",
    ...result.lignes.map((line) => {
      const best = line.meilleurChoix;
      return `- ${line.designation} | Qté ${line.quantite} ${line.unite ?? ""} | Meilleur: ${best?.fournisseur.nom ?? "N/A"} | ${best?.prixEstimeUnitaire ?? "Prix public non disponible"} €`;
    }),
    "",
    "Panier par fournisseur",
    ...result.paniers.map(
      (panier) =>
        `- ${panier.fournisseur.nom}: ${panier.totalEstime.toFixed(2)} € (${panier.lignesAvecPrix}/${panier.lignesTotal} lignes)`,
    ),
  ];

  return lines.join("\n");
}
