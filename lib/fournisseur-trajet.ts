import type { Fournisseur, Parametres } from "@/lib/types";
import { formatFournisseurAdresse } from "@/lib/fournisseur-utils";

export type TrajetPoint = {
  label: string;
  adresse?: string;
  codePostal?: string;
};

export type TrajetFournisseur = {
  fournisseur: Fournisseur;
  distanceKm?: number;
  tempsTrajetMin?: number;
  distanceDepotKm?: number;
  distanceChantierKm?: number;
  adresseComplete: string;
};

function extractCodePostal(adresse?: string, codePostal?: string): string | undefined {
  const cp = codePostal?.replace(/\D/g, "").slice(0, 5);
  if (cp && cp.length >= 2) return cp;
  if (!adresse) return undefined;
  const match = adresse.match(/\b(\d{5})\b/);
  return match?.[1];
}

/** Estimation V1 sans API externe — basée sur l'écart des codes postaux. */
export function estimerDistanceKm(
  codePostalA?: string,
  codePostalB?: string,
): number | undefined {
  const a = extractCodePostal(undefined, codePostalA);
  const b = extractCodePostal(undefined, codePostalB);
  if (!a || !b) return undefined;
  if (a === b) return 1.2;

  const numA = Number(a);
  const numB = Number(b);
  if (!Number.isFinite(numA) || !Number.isFinite(numB)) return undefined;

  const deptA = a.slice(0, 2);
  const deptB = b.slice(0, 2);
  const diff = Math.abs(numA - numB);

  if (deptA === deptB) {
    return Number(Math.max(1.5, diff * 0.06).toFixed(1));
  }

  const deptDiff = Math.abs(Number(deptA) - Number(deptB));
  return Number(Math.max(8, deptDiff * 12 + diff * 0.01).toFixed(1));
}

export function estimerTempsTrajetMin(distanceKm?: number): number | undefined {
  if (typeof distanceKm !== "number") return undefined;
  const vitesseMoyenneKmH = 42;
  const baseMin = 4;
  return Math.max(baseMin, Math.round((distanceKm / vitesseMoyenneKmH) * 60));
}

export function buildTrajetsFournisseurs(input: {
  parametres: Parametres;
  fournisseurs: Fournisseur[];
  adresseChantier?: string;
  adresseClient?: string;
  codePostalChantier?: string;
  codePostalClient?: string;
}): {
  depot: TrajetPoint;
  chantier: TrajetPoint;
  adresseReference?: string;
  trajets: TrajetFournisseur[];
} {
  const depotCp = extractCodePostal(input.parametres.adresse, input.parametres.codePostal);
  const chantierCp =
    extractCodePostal(input.adresseChantier, input.codePostalChantier) ??
    extractCodePostal(input.adresseClient, input.codePostalClient);

  const depot: TrajetPoint = {
    label: "Dépôt entreprise",
    adresse: [
      input.parametres.adresse,
      `${input.parametres.codePostal ?? ""} ${input.parametres.ville ?? ""}`.trim(),
    ]
      .filter(Boolean)
      .join(", "),
    codePostal: depotCp,
  };

  const chantierAdresse =
    input.adresseChantier?.trim() ||
    input.adresseClient?.trim() ||
    undefined;

  const chantier: TrajetPoint = {
    label: "Chantier",
    adresse: chantierAdresse,
    codePostal: chantierCp,
  };

  const trajets = input.fournisseurs.map((fournisseur) => {
    const fournisseurCp = extractCodePostal(fournisseur.adresseDepot, fournisseur.codePostal);
    const distanceDepotKm = estimerDistanceKm(depotCp, fournisseurCp);
    const distanceChantierKm = estimerDistanceKm(fournisseurCp, chantierCp);
    const distanceKm =
      typeof distanceDepotKm === "number" && typeof distanceChantierKm === "number"
        ? Number((distanceDepotKm + distanceChantierKm).toFixed(1))
        : distanceDepotKm ?? distanceChantierKm;

    return {
      fournisseur,
      distanceKm,
      distanceDepotKm,
      distanceChantierKm,
      tempsTrajetMin: estimerTempsTrajetMin(distanceKm),
      adresseComplete: formatFournisseurAdresse(fournisseur),
    } satisfies TrajetFournisseur;
  });

  return {
    depot,
    chantier,
    adresseReference: chantierAdresse,
    trajets: trajets.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)),
  };
}
