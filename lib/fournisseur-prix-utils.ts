import type { FournisseurTarifLigne } from "@/lib/types";

export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

export function htFromTtc(ttc: number, tvaRate: number): number {
  if (tvaRate < 0) return roundPrice(ttc);
  return roundPrice(ttc / (1 + tvaRate / 100));
}

export function ttcFromHt(ht: number, tvaRate: number): number {
  if (tvaRate < 0) return roundPrice(ht);
  return roundPrice(ht * (1 + tvaRate / 100));
}

export function getTarifPrixAchatHT(line: FournisseurTarifLigne): number | undefined {
  return line.prixEntrepriseSaisi ?? line.prixRemise;
}

export function getTarifPrixAchatTTC(
  line: FournisseurTarifLigne,
  defaultTva = 20,
): number | undefined {
  if (typeof line.prixAchatTTC === "number") return line.prixAchatTTC;
  const ht = getTarifPrixAchatHT(line);
  if (ht == null) return undefined;
  return ttcFromHt(ht, line.tauxTVA ?? defaultTva);
}

export function computeTarifMarge(
  prixAchatHT: number | undefined,
  prixVenteHT: number | undefined,
): { margeEuro?: number; margePourcent?: number } {
  if (prixAchatHT == null || prixVenteHT == null || prixVenteHT <= 0) {
    return {};
  }
  const margeEuro = roundPrice(prixVenteHT - prixAchatHT);
  const margePourcent = roundPrice((margeEuro / prixVenteHT) * 100);
  return { margeEuro, margePourcent };
}

/** Extraction texte lisible depuis PDF binaire (heuristique V1 pour l'IA). */
export async function extractImportableText(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    return file.text();
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let text = "";
  for (let i = 0; i < bytes.length && text.length < 14000; i++) {
    const char = bytes[i];
    if (char >= 32 && char <= 126) {
      text += String.fromCharCode(char);
    } else if (char === 10 || char === 13) {
      text += "\n";
    }
  }
  return text.trim() || `Fichier: ${file.name}`;
}
