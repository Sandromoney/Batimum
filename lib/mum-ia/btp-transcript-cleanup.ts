/**
 * Nettoyage léger d'une transcription vocale FR pour le vocabulaire BTP.
 * Ne invente jamais de quantités absentes — normalise uniquement ce qui est dit.
 */

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  zéro: 0,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  vingt: 20,
  "trente": 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
  cent: 100,
  cents: 100,
};

/** « quatre-vingt » / « quatre vingt » → 80, etc. */
function parseFrCompoundNumber(raw: string): number | null {
  const cleaned = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^\d+([.,]\d+)?$/.test(cleaned)) {
    return Number(cleaned.replace(",", "."));
  }

  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 0) return null;

  // quatre vingt / quatre-vingts (+ dix|onze|…|dix-neuf)
  if (parts[0] === "quatre" && (parts[1] === "vingt" || parts[1] === "vingts")) {
    let n = 80;
    if (parts.length === 2) return n;
    if (parts[2] === "dix") {
      n = 90;
      if (parts.length === 3) return n;
      const unit = NUMBER_WORDS[parts[3]!];
      if (unit != null && unit >= 1 && unit <= 9) return n + unit;
      return null;
    }
    const unit = NUMBER_WORDS[parts[2]!];
    if (unit != null && unit >= 1 && unit <= 19) return n + unit;
    return null;
  }

  // soixante dix …
  if (parts[0] === "soixante" && parts[1] === "dix") {
    const n = 70;
    if (parts.length === 2) return n;
    const unit = NUMBER_WORDS[parts[2]!];
    if (unit != null && unit >= 1 && unit <= 9) return n + unit;
    return null;
  }

  // dix huit, vingt deux, cent vingt, …
  let total = 0;
  let current = 0;
  for (const part of parts) {
    if (part === "et") continue;
    const v = NUMBER_WORDS[part];
    if (v == null) return null;
    if (v === 100) {
      current = (current || 1) * 100;
    } else if (v >= 20) {
      current += v;
    } else {
      current += v;
    }
  }
  total += current;
  return total > 0 || parts.includes("zero") || parts.includes("zéro") ? total : null;
}

function replaceNumberWordSequences(text: string): string {
  // Séquences de mots-nombres (avec tirets / « et »)
  const pattern =
    /\b((?:z[ée]ro|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|cents)(?:[\s-]+(?:et|z[ée]ro|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|vingts|trente|quarante|cinquante|soixante|cent|cents))*)\b/gi;

  return text.replace(pattern, (match) => {
    const n = parseFrCompoundNumber(match);
    if (n == null) return match;
    return String(n);
  });
}

function normalizeUnitsAndDims(text: string): string {
  let out = text;

  // Note: éviter \b après un caractère accentué (é n'est pas un « word char » JS).
  const end = "(?=\\s|$|[.,;:!?…\\)])";

  // mètres carrés / mètres carré / metre carre (avant la réduction « mètres » → « m »)
  out = out.replace(
    new RegExp(
      String.raw`\b(\d+(?:[.,]\d+)?)\s*m[èeé]tres?\s*carr[ée]s?` + end,
      "gi",
    ),
    "$1 m²",
  );
  out = out.replace(
    new RegExp(
      String.raw`\b(\d+(?:[.,]\d+)?)\s*metres?\s*carres?` + end,
      "gi",
    ),
    "$1 m²",
  );
  out = out.replace(
    new RegExp(String.raw`\b(\d+(?:[.,]\d+)?)\s*m\s*2` + end, "gi"),
    "$1 m²",
  );
  out = out.replace(
    new RegExp(String.raw`\b(\d+(?:[.,]\d+)?)\s*m2` + end, "gi"),
    "$1 m²",
  );
  out = out.replace(
    new RegExp(String.raw`m[èeé]tres?\s*carr[ée]s?` + end, "gi"),
    "m²",
  );
  out = out.replace(new RegExp(String.raw`metres?\s*carres?` + end, "gi"), "m²");

  // mètres linéaires
  out = out.replace(
    new RegExp(
      String.raw`\b(\d+(?:[.,]\d+)?)\s*(?:m[èeé]tres?\s*lin[ée]aires?|metres?\s*lineaires?|ml)` +
        end,
      "gi",
    ),
    "$1 ml",
  );

  // mètres (simples) après nombre
  out = out.replace(
    new RegExp(String.raw`\b(\d+(?:[.,]\d+)?)\s*m[èeé]tres?` + end, "gi"),
    "$1 m",
  );

  // filet de sécurité si « mètres » a déjà été réduit en « m »
  out = out.replace(
    new RegExp(String.raw`\b(\d+(?:[.,]\d+)?)\s*m\s*carr[ée]s?` + end, "gi"),
    "$1 m²",
  );

  // cm / mm / litres
  out = out.replace(
    new RegExp(
      String.raw`\b(\d+(?:[.,]\d+)?)\s*(?:centim[èeé]tres?|centimetres?)` + end,
      "gi",
    ),
    "$1 cm",
  );
  out = out.replace(
    new RegExp(
      String.raw`\b(\d+(?:[.,]\d+)?)\s*(?:millim[èeé]tres?|millimetres?)` + end,
      "gi",
    ),
    "$1 mm",
  );
  out = out.replace(
    new RegExp(String.raw`\b(\d+(?:[.,]\d+)?)\s*litres?` + end, "gi"),
    "$1 L",
  );

  // dimensions « 120 par 90 » / « 120 × 90 »
  out = out.replace(
    /\b(\d+(?:[.,]\d+)?)\s*(?:par|x|×)\s*(\d+(?:[.,]\d+)?)\b/gi,
    (_m, a: string, b: string) => {
      const left = a.replace(",", ".");
      const right = b.replace(",", ".");
      const la = Number(left);
      const lb = Number(right);
      if (
        Number.isFinite(la) &&
        Number.isFinite(lb) &&
        la >= 30 &&
        la <= 300 &&
        lb >= 30 &&
        lb <= 300
      ) {
        return `${Math.round(la)} × ${Math.round(lb)} cm`;
      }
      return `${a.replace(".", ",")} × ${b.replace(".", ",")}`;
    },
  );

  return out;
}

function normalizeBtpTerms(text: string): string {
  let out = text;

  const replacements: Array<[RegExp, string]> = [
    [/\bb[ée]\s*a\s*13\b/gi, "BA13"],
    [/\bbe\s*a\s*13\b/gi, "BA13"],
    [/\bba\s*13\b/gi, "BA13"],
    [/\bplako\b/gi, "placo"],
    [/\bpla[ck]o\b/gi, "placo"],
    [/\bp\s*e\s*r\b/gi, "PER"],
    [/\bmulti[\s-]?couche\b/gi, "multicouche"],
    [/\bp\s*v\s*c\b/gi, "PVC"],
    [/\bfaience\b/gi, "faïence"],
    [/\breceveur\b/gi, "receveur"],
    [/\bvmc\b/gi, "VMC"],
    [/\blaine de verre\b/gi, "laine de verre"],
    [/\bfaux[\s-]?plafond\b/gi, "faux plafond"],
    [/\bdouche a l['’]?italienne\b/gi, "douche à l'italienne"],
    [/\bdouche italienne\b/gi, "douche à l'italienne"],
    [/\bossature metallique\b/gi, "ossature métallique"],
    [/\bdouble vasque\b/gi, "double vasque"],
  ];

  for (const [re, repl] of replacements) {
    out = out.replace(re, repl);
  }

  return out;
}

function tidyWhitespace(text: string): string {
  return text
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/\s+([)»»])/g, "$1")
    .trim();
}

/**
 * Applique le nettoyage BTP léger sur une transcription brute.
 */
export function cleanupBtpTranscript(raw: string): string {
  if (!raw || !raw.trim()) return "";

  let text = raw.trim();
  // Whisper laisse parfois des marqueurs
  text = text.replace(/^\[.*?\]\s*/g, "").replace(/\s*\[.*?\]$/g, "");

  text = replaceNumberWordSequences(text);
  text = normalizeUnitsAndDims(text);
  text = normalizeBtpTerms(text);
  text = tidyWhitespace(text);

  // Capitale initiale si phrase
  if (text.length > 0 && /^[a-zàâäéèêëïîôùûüç]/.test(text)) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}
