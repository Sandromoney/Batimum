import type { Parametres } from "./types";
import {
  formatAdresseEntreprise,
  getMentionTvaPdf,
} from "./parametres";
import {
  formatCoordonneesBancairesLines,
  shouldShowCoordonneesBancaires,
} from "./coordonnees-bancaires";

export type DevisPdfMentionLine = {
  text: string;
  multiline?: boolean;
};

export function buildDevisPdfFooterMentions(
  parametres: Parametres,
  options: {
    pdfTauxTVA: number;
    pdfMontantTVA: number;
    formatCurrency: (amount: number) => string;
  },
): DevisPdfMentionLine[] {
  const lines: DevisPdfMentionLine[] = [];

  if (parametres.siret?.trim()) {
    lines.push({ text: `SIRET : ${parametres.siret.trim()}` });
  }
  if (parametres.codeApe?.trim()) {
    lines.push({ text: `Code APE : ${parametres.codeApe.trim()}` });
  }
  if (parametres.tvaIntracom?.trim()) {
    lines.push({
      text: `TVA intracommunautaire : ${parametres.tvaIntracom.trim()}`,
    });
  }
  if (parametres.capitalSocial?.trim()) {
    lines.push({
      text: `Capital social : ${parametres.capitalSocial.trim()}`,
    });
  }

  const adresse = formatAdresseEntreprise(parametres);
  if (adresse) {
    lines.push({ text: adresse, multiline: true });
  }
  if (parametres.email?.trim()) {
    lines.push({ text: `Email : ${parametres.email.trim()}` });
  }
  if (parametres.telephone?.trim()) {
    lines.push({ text: `Téléphone : ${parametres.telephone.trim()}` });
  }
  if (parametres.conditionsReglement?.trim()) {
    lines.push({
      text: `Conditions de règlement : ${parametres.conditionsReglement.trim()}`,
      multiline: true,
    });
  }

  if (shouldShowCoordonneesBancaires(parametres)) {
    const bankLines = formatCoordonneesBancairesLines(parametres);
    if (bankLines.length > 0) {
      lines.push({
        text: `Coordonnées bancaires :\n${bankLines.join("\n")}`,
        multiline: true,
      });
    }
  }

  const mentionTva = getMentionTvaPdf(
    parametres,
    options.pdfTauxTVA,
    options.pdfMontantTVA,
    options.formatCurrency,
  );
  if (mentionTva.trim()) {
    lines.push({ text: mentionTva, multiline: true });
  }

  if (parametres.conditionsGenerales?.trim()) {
    lines.push({
      text: parametres.conditionsGenerales.trim(),
      multiline: true,
    });
  }

  return lines;
}
