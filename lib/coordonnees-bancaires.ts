import type { Parametres } from "./types";

export function hasCoordonneesBancaires(parametres: Parametres): boolean {
  return Boolean(
    parametres.coordonneesBancairesTitulaire?.trim() ||
      parametres.coordonneesBancairesBanque?.trim() ||
      parametres.coordonneesBancairesIban?.trim() ||
      parametres.coordonneesBancairesBic?.trim() ||
      parametres.coordonneesBancaires?.trim(),
  );
}

export function shouldShowCoordonneesBancaires(parametres: Parametres): boolean {
  return parametres.afficherCoordonneesBancaires === true && hasCoordonneesBancaires(parametres);
}

export function formatCoordonneesBancairesLines(parametres: Parametres): string[] {
  const lines: string[] = [];

  if (parametres.coordonneesBancairesTitulaire?.trim()) {
    lines.push(`Titulaire : ${parametres.coordonneesBancairesTitulaire.trim()}`);
  }
  if (parametres.coordonneesBancairesBanque?.trim()) {
    lines.push(`Banque : ${parametres.coordonneesBancairesBanque.trim()}`);
  }
  if (parametres.coordonneesBancairesIban?.trim()) {
    lines.push(`IBAN : ${parametres.coordonneesBancairesIban.trim()}`);
  }
  if (parametres.coordonneesBancairesBic?.trim()) {
    lines.push(`BIC : ${parametres.coordonneesBancairesBic.trim()}`);
  }

  if (lines.length === 0 && parametres.coordonneesBancaires?.trim()) {
    return parametres.coordonneesBancaires
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return lines;
}

export function formatCoordonneesBancairesBlock(parametres: Parametres): string {
  return formatCoordonneesBancairesLines(parametres).join("\n");
}

export function appendCoordonneesBancairesToText(
  text: string,
  parametres: Parametres,
): string {
  if (!shouldShowCoordonneesBancaires(parametres)) return text;
  const block = formatCoordonneesBancairesBlock(parametres);
  if (!block.trim()) return text;
  return `${text}\n\nCoordonnées bancaires :\n${block}`;
}
