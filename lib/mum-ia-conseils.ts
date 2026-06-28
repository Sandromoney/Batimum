import type { AiDevisResult } from "@/lib/ai-devis";
import type { EntrepriseLocalisation } from "@/lib/entreprise-localisation";

export type MumIaConseil = {
  ok: boolean;
  text: string;
};

function countBibliothequeUsage(result: AiDevisResult): {
  entreprise: number;
  total: number;
} {
  let entreprise = 0;
  let total = 0;

  for (const section of result.sections) {
    for (const ligne of section.lignes) {
      total += 1;
      if (ligne.sourcePrix === "manuel" || ligne.sourcePrix === "appris") {
        entreprise += 1;
      }
    }
  }

  return { entreprise, total };
}

export function buildMumIaConseils(params: {
  result?: AiDevisResult | null;
  entrepriseLocalisation?: EntrepriseLocalisation | null;
  departementLabel?: string;
  tauxTVA: number;
}): MumIaConseil[] {
  const conseils: MumIaConseil[] = [];
  const dept =
    params.entrepriseLocalisation?.departementLabel ?? params.departementLabel;

  if (dept) {
    conseils.push({
      ok: true,
      text: `Région détectée : ${dept}`,
    });
  }

  if (params.result) {
    const { entreprise, total } = countBibliothequeUsage(params.result);
    const pct = total > 0 ? Math.round((entreprise / total) * 100) : 0;
    conseils.push({
      ok: pct >= 50,
      text: `Bibliothèque entreprise utilisée : ${pct} %`,
    });

    const aVerifier = params.result.sections.reduce(
      (sum, section) =>
        sum + section.lignes.filter((ligne) => ligne.prixAVerifier).length,
      0,
    );

    conseils.push({
      ok: aVerifier === 0,
      text:
        aVerifier === 0
          ? "Aucun prix à vérifier"
          : `${aVerifier} poste${aVerifier > 1 ? "s" : ""} à vérifier`,
    });

    const doublons = params.result.rapportVerification?.doublonsDetectes?.length ?? 0;
    conseils.push({
      ok: doublons === 0,
      text:
        doublons === 0
          ? "Aucun doublon détecté"
          : `${doublons} doublon${doublons > 1 ? "s" : ""} corrigé${doublons > 1 ? "s" : ""}`,
    });
  }

  conseils.push({
    ok: true,
    text: `TVA détectée : ${params.tauxTVA} %`,
  });

  return conseils;
}
