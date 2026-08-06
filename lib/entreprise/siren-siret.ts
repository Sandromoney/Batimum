/**
 * Validation SIREN (9) / SIRET (14) — algorithme de Luhn (INSEE).
 */

export type SirenSiretKind = "siren" | "siret";

export type SirenSiretValidation =
  | { ok: true; digits: string; kind: SirenSiretKind }
  | { ok: false; error: string; digits: string; kind?: SirenSiretKind };

/** Supprime tout caractère non numérique. */
export function normalizeSirenSiretInput(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/**
 * Luhn (modulo 10) tel qu’appliqué au SIREN/SIRET français.
 * Parcours de droite à gauche ; doublement des positions paires.
 */
export function passesLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length === 0) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function formatSirenSiretDisplay(digits: string): string {
  const d = normalizeSirenSiretInput(digits);
  if (d.length === 9) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  }
  return d;
}

export function validateSirenSiretInput(raw: string): SirenSiretValidation {
  const digits = normalizeSirenSiretInput(raw);

  if (!digits) {
    return {
      ok: false,
      digits,
      error: "Indiquez un numéro SIREN (9 chiffres) ou SIRET (14 chiffres).",
    };
  }

  if (!/^\d+$/.test(digits)) {
    return {
      ok: false,
      digits,
      error: "Le numéro ne doit contenir que des chiffres.",
    };
  }

  if (digits.length === 9) {
    if (!passesLuhn(digits)) {
      return {
        ok: false,
        digits,
        kind: "siren",
        error: "Ce numéro SIREN semble invalide.",
      };
    }
    return { ok: true, digits, kind: "siren" };
  }

  if (digits.length === 14) {
    if (!passesLuhn(digits)) {
      return {
        ok: false,
        digits,
        kind: "siret",
        error: "Ce numéro SIRET semble invalide.",
      };
    }
    return { ok: true, digits, kind: "siret" };
  }

  if (digits.length < 9) {
    return {
      ok: false,
      digits,
      error: "Le SIREN doit contenir 9 chiffres.",
    };
  }

  if (digits.length > 9 && digits.length < 14) {
    return {
      ok: false,
      digits,
      kind: "siret",
      error: "Le SIRET doit contenir 14 chiffres.",
    };
  }

  return {
    ok: false,
    digits,
    error: "Indiquez un SIREN (9 chiffres) ou un SIRET (14 chiffres).",
  };
}

/**
 * Numéro de TVA intracommunautaire français dérivé du SIREN
 * (formule officielle : FR + clé + SIREN).
 * Retourne "" si le SIREN est invalide.
 */
export function computeFrenchTvaIntracomFromSiren(sirenOrSiret: string): string {
  const digits = normalizeSirenSiretInput(sirenOrSiret);
  const siren = digits.length >= 9 ? digits.slice(0, 9) : "";
  if (siren.length !== 9 || !/^\d{9}$/.test(siren)) return "";
  const key = (12 + 3 * (Number(siren) % 97)) % 97;
  return `FR${String(key).padStart(2, "0")}${siren}`;
}
