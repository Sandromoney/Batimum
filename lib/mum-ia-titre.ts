import { TYPE_CHANTIER_LABELS } from "@/lib/chantiers";
import { getClientDisplayName } from "@/lib/clients";
import type { Client, TypeChantier } from "@/lib/types";

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractSurfaceM2(text: string): string | null {
  const match = text.match(/(\d+[,.]?\d*)\s*m\s*[²2]/i);
  if (!match?.[1]) return null;
  return match[1].replace(",", ".");
}

function extractLogementType(text: string): string | null {
  const normalized = normalizeText(text);
  if (/\bt\s*[345]\b/.test(normalized) || /\bt[345]\b/.test(normalized)) {
    const m = normalized.match(/\b(t\s*[345]|t[345])\b/);
    if (m) return m[1].replace(/\s/g, "").toUpperCase();
  }
  if (normalized.includes("studio")) return "Studio";
  if (normalized.includes("maison")) return "Maison";
  if (normalized.includes("appartement")) return "Appartement";
  return null;
}

function extractClientName(
  description: string,
  clients: Client[],
): string | null {
  const normalizedDesc = normalizeText(description);

  for (const client of clients) {
    const name = getClientDisplayName(client).trim();
    if (!name || name.length < 2) continue;
    const parts = name.split(/\s+/).filter((part) => part.length >= 2);
    for (const part of parts) {
      const norm = normalizeText(part);
      if (norm.length >= 3 && normalizedDesc.includes(norm)) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
    }
    const fullNorm = normalizeText(name);
    if (fullNorm.length >= 3 && normalizedDesc.includes(fullNorm)) {
      const last = parts[parts.length - 1];
      return last
        ? last.charAt(0).toUpperCase() + last.slice(1)
        : name;
    }
  }

  const explicit =
    description.match(/(?:client|pour|m\.|mme|mr|monsieur|madame)\s+([A-ZÀ-Ü][a-zà-ü]+)/i)
      ?.at(1) ??
    description.match(/\b([A-ZÀ-Ü][a-zà-ü]{2,})\s*$/m)?.at(1);

  return explicit?.trim() ?? null;
}

function extractVille(description: string, fallbackVille?: string): string | null {
  if (fallbackVille?.trim()) {
    return fallbackVille.trim().charAt(0).toUpperCase() + fallbackVille.trim().slice(1);
  }

  const aVille = description.match(
    /(?:à|a|sur|commune de|ville de)\s+([A-ZÀ-Ü][a-zà-ü-]+)/i,
  )?.[1];
  if (aVille) return aVille;

  return null;
}

function chantierSubject(typeChantier: TypeChantier, description: string): string {
  const normalized = normalizeText(description);

  if (typeChantier === "salle_de_bain" || normalized.includes("salle de bain")) {
    return "Salle de bain";
  }
  if (typeChantier === "cuisine" || normalized.includes("cuisine")) {
    return "Cuisine";
  }
  if (typeChantier === "extension") return "Extension";
  if (typeChantier === "maison_neuve") return "Maison neuve";

  const logement = extractLogementType(description);
  if (logement) return logement;

  const typeLabel = TYPE_CHANTIER_LABELS[typeChantier];
  if (typeChantier === "renovation") return "Rénovation";
  return typeLabel;
}

/**
 * Titre intelligent pour un devis MUM IA.
 * Ex. « Salle de bain Martin - Albi », « T3 65m² - Dupont »
 */
export function buildMumIaDevisTitre(params: {
  description: string;
  typeChantier: TypeChantier;
  ville?: string;
  departementLabel?: string;
  clients?: Client[];
  iaTitre?: string;
}): string {
  const { description, typeChantier, clients = [] } = params;
  const surface = extractSurfaceM2(description);
  const client = extractClientName(description, clients);
  const ville =
    extractVille(description, params.ville) ??
    (params.departementLabel ? null : null);
  const subject = chantierSubject(typeChantier, description);
  const logement = extractLogementType(description);

  let main = subject;

  if (logement && surface) {
    main = `${logement} ${surface}m²`;
  } else if (surface && (subject === "Salle de bain" || subject === "Cuisine")) {
    main = `${subject} ${surface}m²`;
  } else if (surface && typeChantier === "renovation") {
    main = `${surface}m² - Rénovation`;
  } else if (logement) {
    main = `${logement} complet`;
  }

  const suffixParts: string[] = [];
  if (client) suffixParts.push(client);
  if (ville) suffixParts.push(ville);

  if (suffixParts.length > 0) {
    return `${main} - ${suffixParts.join(" - ")}`;
  }

  if (params.iaTitre?.trim() && params.iaTitre.length <= 80) {
    return params.iaTitre.trim();
  }

  return main;
}
