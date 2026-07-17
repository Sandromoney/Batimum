/**
 * Normalisation robuste des réponses OpenAI → devis MUM IA.
 * Accepte plusieurs formes (FR/EN, lots, prestations, lignes à plat).
 */
import type {
  AiDevisAutoVerification,
  AiDevisLigne,
  AiDevisResult,
  AiDevisSection,
} from "@/lib/ai-devis";

export const MUM_IA_DEVIS_SCHEMA_EN = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                designation: { type: "string" },
                description: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
                unitPriceHT: { type: "number" },
                totalHT: { type: "number" },
                vatRate: { type: "number" },
                source: {
                  type: "string",
                  enum: ["library", "supplier", "estimate"],
                },
                confidence: {
                  type: "string",
                  enum: ["verified", "estimated", "to_check"],
                },
              },
              required: [
                "designation",
                "description",
                "quantity",
                "unit",
                "unitPriceHT",
                "totalHT",
                "vatRate",
                "source",
                "confidence",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "lines"],
        additionalProperties: false,
      },
    },
    technicalNotes: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
  },
  required: ["title", "summary", "sections", "technicalNotes", "assumptions"],
  additionalProperties: false,
} as const;

const AI_PRIX_AVERTISSEMENT =
  "Prix et quantités estimatifs à vérifier par le professionnel.";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeSectionSubtotal(lignes: AiDevisLigne[]): number {
  return round2(
    lignes.reduce((sum, ligne) => sum + ligne.quantite * ligne.prixUnitaireHT, 0),
  );
}

function computeTotal(sections: AiDevisSection[]): number {
  return round2(sections.reduce((sum, section) => sum + section.sousTotalHT, 0));
}

export type NormalizeMumDevisOutcome = {
  result: AiDevisResult | null;
  missingFields: string[];
  warnings: string[];
  stats: {
    rawKeys: string[];
    rawSectionsCount: number;
    rawLinesCount: number;
    normalizedSectionsCount: number;
    normalizedLinesCount: number;
  };
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (value == null || value === "") continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const cleaned = String(value)
      .replace(/€/g, "")
      .replace(/\s/g, "")
      .replace(/\u00a0/g, "")
      .replace(",", ".");
    const num = Number(cleaned);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function pickBoolean(source: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return null;
}

function extractLinesFromContainer(container: Record<string, unknown>): unknown[] {
  for (const key of [
    "lines",
    "lignes",
    "items",
    "postes",
    "details",
    "prestations",
    "travaux",
  ]) {
    if (Array.isArray(container[key])) return container[key] as unknown[];
  }
  return [];
}

function coerceRawSections(root: Record<string, unknown>): {
  sections: Array<{ name: string; lines: unknown[] }>;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Wrapper raw.devis / raw.quote
  const nestedDevis = asObject(root.devis) ?? asObject(root.quote);
  const effectiveRoot = nestedDevis
    ? { ...root, ...nestedDevis }
    : root;
  if (nestedDevis) {
    warnings.push("Forme devis/quote → sections");
  }

  if (Array.isArray(effectiveRoot.sections) && effectiveRoot.sections.length > 0) {
    return {
      sections: (effectiveRoot.sections as unknown[]).map((item, index) => {
        const obj = asObject(item);
        if (!obj) {
          warnings.push(`sections[${index}] invalide`);
          return { name: `Travaux ${index + 1}`, lines: [] };
        }
        return {
          name:
            pickString(obj, ["name", "titre", "title", "nom", "libelle", "label"]) ||
            `Travaux ${index + 1}`,
          lines: extractLinesFromContainer(obj),
        };
      }),
      warnings,
    };
  }

  if (Array.isArray(effectiveRoot.lots) && effectiveRoot.lots.length > 0) {
    warnings.push("Forme lots → sections");
    return {
      sections: (effectiveRoot.lots as unknown[]).map((item, index) => {
        if (typeof item === "string") {
          return {
            name: item,
            lines: [
              {
                designation: item,
                quantity: 1,
                unit: "forfait",
                unitPriceHT: 0,
              },
            ],
          };
        }
        const obj = asObject(item);
        if (!obj) return { name: `Lot ${index + 1}`, lines: [] };
        const lines = extractLinesFromContainer(obj);
        const name =
          pickString(obj, ["name", "titre", "title", "nom", "libelle", "lot"]) ||
          `Lot ${index + 1}`;
        if (lines.length === 0) {
          const designation = pickString(obj, [
            "designation",
            "label",
            "description",
            "name",
            "titre",
          ]);
          if (designation) return { name, lines: [obj] };
        }
        return { name, lines };
      }),
      warnings,
    };
  }

  if (Array.isArray(effectiveRoot.prestations) && effectiveRoot.prestations.length > 0) {
    warnings.push("Forme prestations → section Prestations");
    return {
      sections: [{ name: "Prestations", lines: effectiveRoot.prestations as unknown[] }],
      warnings,
    };
  }

  if (Array.isArray(effectiveRoot.lines) && effectiveRoot.lines.length > 0) {
    warnings.push("Forme lines racine → section Travaux");
    return {
      sections: [{ name: "Travaux", lines: effectiveRoot.lines as unknown[] }],
      warnings,
    };
  }

  for (const key of ["items", "lignes", "postes", "travaux"]) {
    if (Array.isArray(effectiveRoot[key]) && (effectiveRoot[key] as unknown[]).length > 0) {
      warnings.push(`Forme ${key} racine → section Travaux`);
      return {
        sections: [{ name: "Travaux", lines: effectiveRoot[key] as unknown[] }],
        warnings,
      };
    }
  }

  if (Array.isArray(effectiveRoot.chapitres) && effectiveRoot.chapitres.length > 0) {
    warnings.push("Forme chapitres → sections");
    return {
      sections: (effectiveRoot.chapitres as unknown[]).map((item, index) => {
        const obj = asObject(item);
        if (!obj) return { name: `Chapitre ${index + 1}`, lines: [] };
        return {
          name:
            pickString(obj, ["name", "titre", "title", "nom"]) ||
            `Chapitre ${index + 1}`,
          lines: extractLinesFromContainer(obj),
        };
      }),
      warnings,
    };
  }

  return { sections: [], warnings };
}

function normalizeLine(
  raw: unknown,
  path: string,
  defaultVat: number,
  warnings: string[],
): AiDevisLigne | null {
  if (typeof raw === "string" && raw.trim()) {
    return {
      designation: raw.trim(),
      description: "À vérifier",
      quantite: 1,
      unite: "forfait",
      prixUnitaireHT: 0,
      tauxTVA: defaultVat,
      prixAVerifier: true,
    };
  }

  const ligne = asObject(raw);
  if (!ligne) {
    warnings.push(`${path} ignorée (objet invalide)`);
    return null;
  }

  let designation = pickString(ligne, [
    "designation",
    "label",
    "name",
    "title",
    "titre",
    "libelle",
    "nom",
    "intitule",
  ]);
  const description = pickString(ligne, [
    "description",
    "detail",
    "details",
    "descriptif",
    "summary",
  ]);

  if (!designation && description) {
    designation = description.slice(0, 140);
    warnings.push(`${path}.designation absente — reprise description`);
  }
  if (!designation) {
    warnings.push(`${path}.designation absente — ligne ignorée`);
    return null;
  }

  let quantity =
    pickNumber(ligne, ["quantity", "qty", "quantite", "quantité", "qte"]) ?? 1;
  if (!Number.isFinite(quantity) || quantity < 0) quantity = 1;

  const unit =
    pickString(ligne, ["unit", "unite", "unité", "u"]) || "forfait";

  let unitPriceHT = pickNumber(ligne, [
    "unitPriceHT",
    "unit_price",
    "unitPrice",
    "priceHT",
    "price",
    "prixUnitaireHT",
    "prix_unitaire_ht",
    "prixUnitaire",
    "prixHT",
    "prix",
    "montantHT",
  ]);

  const totalHT = pickNumber(ligne, [
    "totalHT",
    "total",
    "amountHT",
    "montantTotalHT",
    "sousTotalHT",
  ]);

  if ((unitPriceHT == null || unitPriceHT <= 0) && totalHT != null && quantity > 0) {
    unitPriceHT = totalHT / quantity;
    warnings.push(`${path}.unitPriceHT dérivé de totalHT`);
  }
  if (unitPriceHT == null || !Number.isFinite(unitPriceHT)) unitPriceHT = 0;
  unitPriceHT = Math.max(0, unitPriceHT);

  const vatRate =
    pickNumber(ligne, ["vatRate", "tva", "tauxTVA", "taux_tva", "tauxTva"]) ??
    defaultVat;

  const source = pickString(ligne, ["source"]).toLowerCase();
  const confidence = pickString(ligne, ["confidence", "fiabilite"]).toLowerCase();
  const explicitCheck = pickBoolean(ligne, [
    "prixAVerifier",
    "aVerifier",
    "to_check",
  ]);

  const prixAVerifier =
    explicitCheck === true ||
    unitPriceHT <= 0 ||
    source === "estimate" ||
    confidence === "to_check" ||
    confidence === "estimated";

  let finalDescription = description;
  if (prixAVerifier && !finalDescription.toLowerCase().includes("à vérifier")) {
    finalDescription = finalDescription
      ? `${finalDescription} — Prix à vérifier`
      : "Prix à vérifier";
  }

  return {
    designation,
    description: finalDescription,
    quantite: quantity,
    unite: unit,
    prixUnitaireHT: unitPriceHT,
    tauxTVA: Number.isFinite(vatRate) ? vatRate : defaultVat,
    prixAVerifier,
  };
}

const EMPTY_AUTO: AiDevisAutoVerification = {
  travauxComplets: true,
  lotsManquants: [],
  quantitesCoherentes: true,
  prixCoherents: true,
  tvaCoherentes: true,
  pointsVerifies: true,
};

/** Point d'entrée unique */
export function normalizeMumDevisResponse(
  raw: unknown,
  options?: { defaultVatRate?: number },
): NormalizeMumDevisOutcome {
  const defaultVat = options?.defaultVatRate ?? 20;
  const warnings: string[] = [];
  const missingFields: string[] = [];

  const root = asObject(raw);
  if (!root) {
    return {
      result: null,
      missingFields: ["root (JSON objet attendu)"],
      warnings,
      stats: {
        rawKeys: [],
        rawSectionsCount: 0,
        rawLinesCount: 0,
        normalizedSectionsCount: 0,
        normalizedLinesCount: 0,
      },
    };
  }

  const rawKeys = Object.keys(root);
  const coerced = coerceRawSections(root);
  warnings.push(...coerced.warnings);

  const rawSectionsCount = coerced.sections.length;
  const rawLinesCount = coerced.sections.reduce(
    (sum, section) => sum + section.lines.length,
    0,
  );

  console.log("[MUM IA NORMALIZED INPUT]", {
    rawKeys,
    rawSectionsCount,
    rawLinesCount,
  });

  if (rawSectionsCount === 0) {
    missingFields.push("sections (aucune structure sections/lots/lines/items)");
    return {
      result: null,
      missingFields,
      warnings,
      stats: {
        rawKeys,
        rawSectionsCount,
        rawLinesCount,
        normalizedSectionsCount: 0,
        normalizedLinesCount: 0,
      },
    };
  }

  const sections: AiDevisSection[] = [];

  coerced.sections.forEach((section, sectionIndex) => {
    const path = `sections[${sectionIndex}]`;
    const lignes: AiDevisLigne[] = [];

    section.lines.forEach((line, lineIndex) => {
      const normalized = normalizeLine(
        line,
        `${path}.lines[${lineIndex}]`,
        defaultVat,
        warnings,
      );
      if (normalized) lignes.push(normalized);
    });

    if (lignes.length === 0) {
      warnings.push(`${path} sans lignes exploitables — section ignorée`);
      return;
    }

    sections.push({
      titre: section.name || `Travaux ${sectionIndex + 1}`,
      lignes,
      sousTotalHT: computeSectionSubtotal(lignes),
    });
  });

  const normalizedLinesCount = sections.reduce(
    (sum, section) => sum + section.lignes.length,
    0,
  );

  console.log("[MUM IA NORMALIZED OUTPUT]", {
    normalizedSectionsCount: sections.length,
    normalizedLinesCount,
    warningsCount: warnings.length,
  });

  if (sections.length === 0 || normalizedLinesCount === 0) {
    missingFields.push("sections (aucune section avec lignes exploitables)");
    return {
      result: null,
      missingFields,
      warnings,
      stats: {
        rawKeys,
        rawSectionsCount,
        rawLinesCount,
        normalizedSectionsCount: 0,
        normalizedLinesCount: 0,
      },
    };
  }

  let titre = pickString(root, ["title", "titre", "nom", "name"]);
  if (!titre) {
    titre = sections[0]?.titre
      ? `Devis — ${sections[0].titre}`
      : "Devis chantier";
    warnings.push(`title absent — « ${titre} »`);
  }

  const summary = pickString(root, [
    "summary",
    "descriptionGenerale",
    "description",
    "descriptif",
  ]);

  const assumptions = Array.isArray(root.assumptions)
    ? root.assumptions
    : Array.isArray(root.hypotheses)
      ? root.hypotheses
      : Array.isArray(root.hypothèses)
        ? root.hypothèses
        : [];

  const technicalNotes = Array.isArray(root.technicalNotes)
    ? root.technicalNotes
    : Array.isArray(root.pointsAVerifier)
      ? root.pointsAVerifier
      : [];

  const result: AiDevisResult = {
    titre,
    descriptionGenerale: summary,
    hypothèses: assumptions.map((item) => String(item).trim()).filter(Boolean),
    sections,
    totalHT: computeTotal(sections),
    pointsAVerifier: technicalNotes
      .map((item) => String(item).trim())
      .filter(Boolean),
    avertissementPrix: AI_PRIX_AVERTISSEMENT,
    autoVerification: EMPTY_AUTO,
  };

  return {
    result,
    missingFields: [],
    warnings,
    stats: {
      rawKeys,
      rawSectionsCount,
      rawLinesCount,
      normalizedSectionsCount: sections.length,
      normalizedLinesCount,
    },
  };
}
