import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";

export const DEFAULT_HAUTEUR_SOUS_PLAFOND_M = 2.5;

const LINEAR_SURFACE_KEYWORDS = [
  "cloison",
  "doublage",
  "habillage",
  "coffrage",
  "credence",
  "crédence",
  "ba13",
  "placo",
  "cloisonnement",
  "contre cloison",
  "contre-cloison",
];

const ML_UNITS = new Set(["ml", "m l", "mètre linéaire", "metre lineaire", "m"]);
const M2_UNITS = new Set(["m²", "m2", "m 2"]);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDecimal(value: string): number {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function extractHauteurSousPlafond(corpus: string): number {
  const normalized = corpus.toLowerCase();
  const patterns = [
    /hsp\s*[:=]?\s*(\d+[,.]?\d*)\s*m/i,
    /hauteur\s+sous\s+plafond\s*[:=]?\s*(\d+[,.]?\d*)\s*m/i,
    /hauteur\s*[:=]?\s*(\d+[,.]?\d*)\s*m/i,
    /plafond\s+a\s*(\d+[,.]?\d*)\s*m/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const value = parseDecimal(match[1]);
      if (value >= 2 && value <= 4) return value;
    }
  }

  return DEFAULT_HAUTEUR_SOUS_PLAFOND_M;
}

export function extractLinearMetersFromText(text: string): number | null {
  const normalized = text.toLowerCase();
  const patterns = [
    /(\d+[,.]?\d*)\s*ml\b/i,
    /(\d+[,.]?\d*)\s*m\s*l\b/i,
    /(\d+[,.]?\d*)\s*mètres?\s*linéaires?/i,
    /(\d+[,.]?\d*)\s*metres?\s*lineaires?/i,
    /de\s+(\d+[,.]?\d*)\s*ml\b/i,
    /de\s+(\d+[,.]?\d*)\s*m\s*l\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const value = parseDecimal(match[1]);
      if (value > 0) return value;
    }
  }

  return null;
}

export function isPlinthesPoste(designation: string, description: string): boolean {
  const text = normalizeBibliothequeKey(`${designation} ${description}`);
  return text.includes("plinthe");
}

export function isLinearSurfacePoste(designation: string, description: string): boolean {
  if (isPlinthesPoste(designation, description)) return false;
  const text = normalizeBibliothequeKey(`${designation} ${description}`);
  return LINEAR_SURFACE_KEYWORDS.some((kw) =>
    text.includes(normalizeBibliothequeKey(kw)),
  );
}

function normalizeUnite(unite: string): string {
  return unite.trim().toLowerCase().replace(/\s+/g, " ");
}

function isMlUnit(unite: string): boolean {
  const u = normalizeUnite(unite);
  return ML_UNITS.has(u) || u === "m";
}

function isM2Unit(unite: string): boolean {
  return M2_UNITS.has(normalizeUnite(unite));
}

export type UnitConversionResult<T extends { quantite: number; unite: string; description: string }> = {
  ligne: T;
  converted: boolean;
  note?: string;
};

/**
 * Convertit ml → m² pour cloisons, doublages, crédences, etc.
 * Utilise la hauteur chantier (défaut 2,50 m).
 */
export function applyUnitConversionToLigne<
  T extends {
    designation: string;
    description: string;
    quantite: number;
    unite: string;
  },
>(ligne: T, corpus: string): UnitConversionResult<T> {
  if (!isLinearSurfacePoste(ligne.designation, ligne.description)) {
    return { ligne, converted: false };
  }

  const hsp = extractHauteurSousPlafond(corpus);
  const textMl =
    extractLinearMetersFromText(`${ligne.designation} ${ligne.description}`) ??
    extractLinearMetersFromText(corpus);

  if (isMlUnit(ligne.unite)) {
    const ml = textMl && textMl > 0 ? textMl : ligne.quantite;
    const m2 = round2(ml * hsp);
    const note = `${ml} ml × ${hsp} m (hsp) = ${m2} m²`;
    return {
      ligne: {
        ...ligne,
        quantite: m2,
        unite: "m²",
        description: ligne.description
          ? `${ligne.description} — ${note}`
          : note,
      },
      converted: true,
      note,
    };
  }

  if (isM2Unit(ligne.unite) && textMl && textMl > 0) {
    const expectedM2 = round2(textMl * hsp);
    if (ligne.quantite <= 1 || Math.abs(ligne.quantite - textMl) < 0.01) {
      const note = `${textMl} ml × ${hsp} m (hsp) = ${expectedM2} m²`;
      return {
        ligne: {
          ...ligne,
          quantite: expectedM2,
          description: ligne.description
            ? `${ligne.description} — ${note}`
            : note,
        },
        converted: true,
        note,
      };
    }
  }

  return { ligne, converted: false };
}

export function formatUnitConversionRulesForPrompt(): string {
  return [
    "CONVERSION DES UNITÉS MÉTIER :",
    "- Si le client indique une longueur en ml (cloison, doublage, crédence, habillage, coffrage) :",
    `  quantité m² = longueur ml × hauteur sous plafond (défaut ${DEFAULT_HAUTEUR_SOUS_PLAFOND_M} m si non précisée).`,
    "- Exemple : cloison 8 ml × 2,50 m = 20 m² → appliquer le prix m² de la bibliothèque.",
    "- PLINTHES : restent en ml. Interdit : surface × hauteur sous plafond.",
    "- PLINTHES : si dimensions inconnues → max(√(surface) × 4 × 0,8 ; surface × 0,9) par pièce (ex. 42 m² → ~38 ml).",
    "- Toujours exprimer la quantité finale dans l'unité du prix catalogue (souvent m², sauf plinthes en ml).",
  ].join("\n");
}
